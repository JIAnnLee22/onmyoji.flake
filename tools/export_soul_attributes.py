#!/usr/bin/env python3
"""Expand a frozen local Onmyoji inventory snapshot into AI-readable attributes.

Usage: python3 tools/export_soul_attributes.py exports/<snapshot>
No network, process injection, game input, or modifications to game files.
Percentage values use percentage points: 55 means 55%, never 0.55.
"""

from __future__ import annotations

import argparse
import collections
import csv
import datetime as dt
import hashlib
import io
import json
import math
import os
from pathlib import Path
import struct
import zipfile

# sattr codes follow the game's Hp, Defense, Attack, HpRate, DefenseRate,
# AttackRate, Speed, CritRate, CritPower, EffectHitRate, EffectResistRate order.
# Base magnitudes: OnmyojiX/yyx, yyx-cbg/src/convert.rs::CbgAttrType::get_base.
# All 11 codes have been cross-checked against three client detail screenshots.
# This calibrates the code mapping, not an individual UI check of every soul.
STATS = {
    1: ("hp_flat", "生命", "flat", 114.0),
    2: ("defense_flat", "防御", "flat", 5.0),
    3: ("attack_flat", "攻击", "flat", 27.0),
    4: ("hp_pct", "生命加成", "percentage_points", 3.0),
    5: ("defense_pct", "防御加成", "percentage_points", 3.0),
    6: ("attack_pct", "攻击加成", "percentage_points", 3.0),
    7: ("speed", "速度", "flat", 3.0),
    8: ("crit_pct", "暴击", "percentage_points", 3.0),
    9: ("crit_damage_pct", "暴击伤害", "percentage_points", 4.0),
    10: ("effect_hit_pct", "效果命中", "percentage_points", 4.0),
    11: ("effect_resist_pct", "效果抵抗", "percentage_points", 4.0),
}
BY_KEY = {value[0]: value for value in STATS.values()}
# Odd slots share the flat-attribute pool: the index is NOT the slot number.
MAIN_POOLS = {
    1: {0: "attack_flat"},
    2: {0: "attack_pct", 1: "defense_pct", 2: "hp_pct", 3: "speed"},
    3: {1: "defense_flat"},
    4: {0: "attack_pct", 1: "defense_pct", 2: "hp_pct", 3: "effect_hit_pct", 4: "effect_resist_pct"},
    5: {2: "hp_flat"},
    6: {0: "attack_pct", 1: "defense_pct", 2: "hp_pct", 3: "crit_pct", 4: "crit_damage_pct"},
}
# Public official simulator confirms these special templates have the same
# fixed attack/defense main as ordinary slots 1/3, not a nonexistent slot 8.
SPECIAL_SLOTS = {180001: 1, 180003: 3}
SIX_STAR_MAIN = {
    "attack_flat": (81, 27), "defense_flat": (14, 6), "hp_flat": (342, 114),
    "speed": (12, 3), "crit_damage_pct": (14, 5),
    **{key: (10, 3) for key in ("attack_pct", "defense_pct", "hp_pct", "crit_pct", "effect_hit_pct", "effect_resist_pct")},
}
# Only combinations present in this snapshot and confirmed against the public
# official get_equip_attr endpoint are admitted. Unknown low-star growth fails
# explicitly rather than making up a multiplier or applying 6-star growth.
# 5-star +0 hp_pct=8 was additionally verified on 2026-10-21 via
# get_equip_attr?suitid=300036&equipid=140005&level=0 (random main pool;
# response main maxHpAdditionRate=0.08). No account data is sent.
LOW_STAR_MAIN_ZERO = {
    (4, "attack_flat"): 49, (4, "hp_flat"): 206,
    (4, "attack_pct"): 6, (4, "speed"): 8,
    (5, "defense_flat"): 11, (5, "hp_flat"): 274,
    (5, "defense_pct"): 8, (5, "hp_pct"): 8,
}
# vymv/kxqh-v3, src/data/yuhuninfo.js::singleAttrMap.
INNATE = {
    1: ("defense_pct", 16), 2: ("attack_pct", 8), 3: ("crit_pct", 6),
    4: ("hp_pct", 16), 5: ("effect_hit_pct", 8), 6: ("effect_resist_pct", 8),
}
SOURCES = [
    "https://raw.githubusercontent.com/OnmyojiX/yyx/master/yyx-cbg/src/convert.rs",
    "https://raw.githubusercontent.com/KCN-judu/yata/main/crates/yata-core/src/mechanics/values.rs",
    "https://raw.githubusercontent.com/vymv/kxqh-v3/master/src/data/yuhuninfo.js",
    "https://g37simulator.webapp.163.com/get_equip_attr",
]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def attribute(key: str, value: float) -> dict:
    _, name, unit, _ = BY_KEY[key]
    return {"key": key, "name": name, "value": value, "unit": unit}


def decode(uid: str, raw: dict, heroes: dict, names: dict) -> dict:
    packed = raw["others"]
    template = packed & 0xfffff
    suit = (packed >> 20) & 0xfffff
    star = (packed >> 45) & 7
    level = packed >> 48
    if not (1 <= star <= 6 and 0 <= level <= 15):
        raise ValueError(f"{uid}: invalid quality or enhancement level")
    if template in SPECIAL_SLOTS:
        slot = SPECIAL_SLOTS[template]
    else:
        slot = template // 10000 - 10
        if slot not in MAIN_POOLS or template % 10000 != star:
            raise ValueError(f"{uid}: unrecognized template {template}")
    main_key = MAIN_POOLS[slot][raw["base_rindex"]]
    if star == 6:
        base, step = SIX_STAR_MAIN[main_key]
        main_value = base + step * level
    elif level == 0 and (star, main_key) in LOW_STAR_MAIN_ZERO:
        main_value = LOW_STAR_MAIN_ZERO[star, main_key]
    else:
        raise ValueError(f"{uid}: unverified main growth: {star} stars, +{level}, {main_key}")

    data = raw["sattr"].encode("latin1")
    if len(data) % 10:
        raise ValueError(f"{uid}: truncated random attribute data")
    ratios = collections.defaultdict(list)
    rolls = []
    for offset in range(0, len(data), 10):
        code = int(data[offset:offset + 2])
        ratio = struct.unpack(">d", data[offset + 2:offset + 10])[0]
        if code not in STATS or not math.isfinite(ratio) or not 0 <= ratio <= 1:
            raise ValueError(f"{uid}: invalid random attribute code or ratio")
        key, _, _, magnitude = STATS[code]
        ratios[key].append(ratio)
        rolls.append({"code": code, "key": key, "ratio": ratio, "value": magnitude * ratio})
    initial_count = len(rolls) - level // 3
    if len(ratios) > 4 or not 0 <= initial_count <= 4:
        raise ValueError(f"{uid}: inconsistent random roll count")
    subs = []
    for key, values in ratios.items():
        stat = attribute(key, math.fsum(values) * BY_KEY[key][3])
        stat.update(roll_count=len(values), upgrade_count=len(values) - 1, roll_ratios=values)
        subs.append(stat)
    innate = attribute(*INNATE[raw["single_attr"]]) if raw.get("single_attr") else None
    totals = {key: 0.0 for key in BY_KEY}
    totals[main_key] = float(main_value)
    for stat in subs + ([innate] if innate else []):
        totals[stat["key"]] = math.fsum((totals[stat["key"]], stat["value"]))
    holder_id = raw.get("herouid")
    hero = heroes.get(holder_id)
    holder = None
    if holder_id:
        if hero is None:
            raise ValueError(f"{uid}: holder absent from the frozen heroes snapshot")
        holder = {
            "id": holder_id, "hero_id": hero["heroId"],
            "name": names["hero_names"].get(str(hero["heroId"]), {}).get("name"),
            "nickname": hero.get("nick"),
        }
    return {
        "id": uid, "set_id": suit, "set_name": names["soul_names"][str(suit)],
        "slot": slot, "star": star, "level": level, "template_id": template,
        "holder": holder, "main_stat": attribute(main_key, float(main_value)),
        "sub_stats": subs, "boss_bonus": innate, "stats_total": totals,
        "initial_substat_count": initial_count, "random_rolls": rolls,
    }


def json_text(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n"


def atomic_write(path: Path, text: str, encoding="utf-8") -> None:
    temporary = path.with_name(path.name + ".tmp")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding=encoding, newline="") as stream:
        stream.write(text)
    temporary.chmod(0o600)
    temporary.replace(path)


def csv_value(value):
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + value
    return value


def export(snapshot: Path) -> dict:
    raw_souls = load(snapshot / "souls.raw.json")
    heroes = load(snapshot / "heroes.raw.json")
    names = load(snapshot / "name_mappings.json")
    manifest = load(snapshot / "manifest.json")
    # Decode everything before replacing any existing output.
    records = [decode(uid, raw, heroes, names) for uid, raw in raw_souls.items()]
    generated = dt.datetime.now().astimezone().isoformat()
    schema = {key: {"name": value[1], "unit": value[2]} for key, value in BY_KEY.items()}
    payload = {
        "schema_version": 2, "generated_at": generated,
        "snapshot_at": manifest["exported_at"], "role": manifest["role"],
        "count": len(records), "attribute_schema": schema,
        "calibration": {
            "status": "attribute_mapping_verified",
            "ui_verified_codes": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            "pending_ui_codes": [],
            "note": "All 11 sub-attribute code mappings were calibrated against three prior detail screenshots. This is not an individual UI check of every item in this snapshot.",
        },
        "semantics": {
            "percentage_points": "55 means 55%, not 0.55; divide by 100 when a rate is needed",
            "precision": "value is unrounded; CSV columns preserve at least 12 significant digits",
            "stats_total": "main + sub-stats + boss single-piece bonus; NO 2/4-piece set effects or shikigami base stats",
            "random_rolls": "original acquisition/enhancement order; roll_count includes initial acquisition",
            "snapshot": f"Frozen local client cache captured at {manifest['exported_at']}; not a live server query or a guarantee of unflushed updates.",
        },
        "sources": SOURCES, "souls": records,
    }
    detailed = [dict(record, raw=raw_souls[record["id"]]) for record in records]
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    sub_columns = ["副属性_" + value[1] + ("(%)" if value[2] == "percentage_points" else "") for value in BY_KEY.values()]
    total_columns = ["总属性_" + value[1] + ("(%)" if value[2] == "percentage_points" else "") for value in BY_KEY.values()]
    writer.writerow(["御魂ID", "套装", "位置", "星级", "强化等级", "装备者", "装备者ID", "主属性", "主属性数值", "主属性单位", *sub_columns, "首领单件属性", "首领单件数值", "首领单件单位", *total_columns, "初始副属性条数", "副属性次数(含初始)"])
    for record in sorted(records, key=lambda row: (row["set_name"], row["slot"], -row["level"], row["id"])):
        holder = record["holder"] or {}
        main = record["main_stat"]
        sub_values = {s["key"]: s["value"] for s in record["sub_stats"]}
        boss = record["boss_bonus"] or {}
        row = [record["id"], record["set_name"], record["slot"], record["star"], record["level"], holder.get("name", ""), holder.get("id", ""), main["name"], main["value"], main["unit"], *[format(sub_values.get(key, 0.0), ".15g") for key in BY_KEY], boss.get("name", ""), boss.get("value", ""), boss.get("unit", ""), *[format(record["stats_total"][key], ".15g") for key in BY_KEY], record["initial_substat_count"], json.dumps({s["name"]: s["roll_count"] for s in record["sub_stats"]}, ensure_ascii=False)]
        writer.writerow([csv_value(cell) for cell in row])
    explanation = f"""# 御魂属性数据使用说明
**11 类副属性的编号映射均已截图校准**，抽样主属性和面板数值也一致。全部库存按相同规则解码并核验完整性；这不表示逐件做过画面对照。
- 推荐 AI 分析输入：`御魂_AI分析.json`；人工查看：`御魂.csv`；含原始编码与完整还原路径：`souls.json`。
- 数量与角色由原快照确定。新增获得/强化的物品不混入旧快照，避免关联不同时间点的式神与御魂。
- 百分比统一使用**百分点**：55 表示 55%，3.46 表示 3.46%，不是 0.55 或 0.0346。速度、生命、攻击、防御为绝对数值。
- JSON 数值保留完整浮点精度，切勿将面板四舍五入后的速度用于先后手比较。CSV 用 UTF-8 BOM，可由 Excel/LibreOffice 打开。
- `main_stat` 是主属性；`sub_stats` 是按种类汇总的副属性；`boss_bonus` 是首领御魂单件固定属性。
- `stats_total` = 主属性 + 副属性 + 首领单件固定属性；**不含**式神基础属性、两件套或四件套效果。配装时还需单独计算套装数量和效果。
- `roll_count` 包含最初获得的那一次属性，`upgrade_count` 为该条属性后续强化次数；`random_rolls` 保留原始顺序与随机系数。
- 特殊模板 180001 和 180003 已分别还原为 1 号位攻击和 3 号位防御。
- 4/5 星御魂仅接受已通过网易官方公开模拟接口核验的 +0 主属性组合；脚本遇到未核验的低星强化组合会报错，不猜测数值。
- 导出不读取凭据、不写游戏数据、不注入进程。锁定、弃置等未完全校准的位标志仍保留在 `raw`，不伪造状态。
- 本次快照时间：{manifest['exported_at']}。\n- 复现属性解码：`python3 tools/export_soul_attributes.py exports/{snapshot.name}`。
"""
    atomic_write(snapshot / "御魂_AI分析.json", json_text(payload))
    atomic_write(snapshot / "souls.json", json_text(detailed))
    atomic_write(snapshot / "御魂.csv", stream.getvalue(), encoding="utf-8-sig")
    atomic_write(snapshot / "御魂_属性说明.md", explanation)
    manifest["attribute_export"] = {
        "schema_version": 2, "generated_at": generated, "count": len(records),
        "decoded_main_stats": len(records), "decoded_sub_stats": len(records),
        "decoded_boss_bonuses": sum(record["boss_bonus"] is not None for record in records),
        "unresolved_positions": 0, "sources": SOURCES,
        "calibration": payload["calibration"],
        "units": "percentage_points for percentage attributes; flat for other attributes",
    }
    manifest["decoding_notes"]["limitations"] = [
        "Frozen local cache snapshot, not a live server query.",
        "Main and sub-attributes are decoded; percentage values in the AI export use percentage points.",
        "Totals exclude shikigami base stats and 2/4-piece soul set effects.",
        "Missing hero fields and unverified inventory state flags are not assigned guessed defaults.",
    ]
    manifest["decoding_notes"]["special_soul_templates"] = [
        {"id": record["id"], "template_id": record["template_id"], "position": record["slot"], "main_stat": record["main_stat"]}
        for record in records if record["template_id"] in SPECIAL_SLOTS
    ]
    atomic_write(snapshot / "manifest.json", json_text(manifest))
    paths = sorted(path for path in snapshot.rglob("*") if path.is_file() and path.name != "SHA256SUMS")
    checksums = "".join(hashlib.sha256(path.read_bytes()).hexdigest() + "  " + path.relative_to(snapshot).as_posix() + "\n" for path in paths)
    atomic_write(snapshot / "SHA256SUMS", checksums)
    archive = snapshot.with_suffix(".zip")
    temporary = archive.with_name(archive.name + ".tmp")
    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
        for path in sorted(snapshot.rglob("*")):
            if path.is_file():
                bundle.write(path, arcname=snapshot.name + "/" + path.relative_to(snapshot).as_posix())
    temporary.chmod(0o600)
    temporary.replace(archive)
    return manifest["attribute_export"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path, help="Directory containing frozen souls.raw.json, heroes.raw.json, name_mappings.json and manifest.json")
    arguments = parser.parse_args()
    print(json_text(export(arguments.snapshot.resolve())), end="")


if __name__ == "__main__":
    main()
