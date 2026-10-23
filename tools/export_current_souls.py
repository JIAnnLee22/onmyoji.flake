#!/usr/bin/env python3
"""Read the running Wine Onmyoji client's cached souls without process injection.

Only local client files are read. No network requests, game writes or input.
The mappings file contains public names, not inventory from an older snapshot.
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import time

from export_soul_attributes import atomic_write, decode, export, json_text


ROLE_EVENT = re.compile(rb"createRoleSuccessful,\s*id\s+([0-9a-f]{24})\b")
ROLE_FIELDS = ("_id", "player_id", "player_name", "player_level", "server_id", "server_name")
REFERENCE_SOURCES = [
    "https://github.com/OnmyojiX/yyx/blob/master/yyx-types/src/lib.rs",
    "https://github.com/OnmyojiX/yyx/blob/master/yyx-types/src/hero_equip.rs",
]


def process_client(pid: int) -> Path:
    process = Path("/proc") / str(pid)
    if process.stat().st_uid != os.getuid():
        raise ValueError("Only a game process owned by the current user may be read")
    command = process.joinpath("cmdline").read_bytes().split(b"\0")[0]
    if command.decode(errors="replace").replace("\\", "/").split("/")[-1].lower() != "onmyoji.exe":
        raise ValueError(f"PID {pid} is not onmyoji.exe")
    client = process.joinpath("cwd").resolve(strict=True)
    if not client.joinpath("Documents/cache_server_data").is_dir():
        raise ValueError(f"PID {pid} has no client cache beneath its working directory")
    return client


def find_process(requested: int | None) -> tuple[int, Path]:
    if requested is not None:
        return requested, process_client(requested)
    candidates = []
    for process in Path("/proc").iterdir():
        if not process.name.isdigit():
            continue
        try:
            candidates.append((int(process.name), process_client(int(process.name))))
        except (OSError, ValueError):
            continue
    if len(candidates) != 1:
        raise ValueError(f"Found {len(candidates)} running clients; specify --pid explicitly")
    return candidates[0]


def started_at(pid: int) -> float:
    fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
    boot_time = next(int(line.split()[1]) for line in Path("/proc/stat").read_text().splitlines() if line.startswith("btime "))
    return boot_time + int(fields[19]) / os.sysconf("SC_CLK_TCK")


def current_role(documents: Path) -> str:
    with documents.joinpath("log/log.txt").open("rb") as stream:
        stream.seek(max(0, os.fstat(stream.fileno()).st_size - 8 * 1024 * 1024))
        matches = ROLE_EVENT.findall(stream.read())
    if not matches:
        raise ValueError("No successful role login in the current log; enter the game first")
    return matches[-1].decode("ascii")


def unhex_json(data: bytes):
    return json.loads(bytes.fromhex(data.decode("ascii")))


def role_metadata(config: dict, role_id: str) -> dict:
    key = base64.b64encode(b"local_all_login_record").decode("ascii")
    records = config.get(key, config.get("local_all_login_record", {}))

    def walk(value):
        if isinstance(value, dict):
            if value.get("_id") == role_id:
                yield value
            else:
                for child in value.values():
                    yield from walk(child)
        elif isinstance(value, list):
            for child in value:
                yield from walk(child)

    matches = list(walk(records))
    if not matches:
        raise ValueError("Current role UUID is absent from the local login records")
    record = max(matches, key=lambda row: row.get("login_time", 0))
    # Never copy account names, SDK account identifiers or credentials.
    return {key: record[key] for key in ROLE_FIELDS}


def capture(pid: int, client: Path) -> tuple[dict, dict, dict]:
    documents = client / "Documents"
    process_started = started_at(pid)
    for _ in range(5):
        role_id = current_role(documents)
        cache = documents / "cache_server_data" / role_id
        paths = {"souls.raw.json": cache / "inventory", "heroes.raw.json": cache / "heroes"}
        paths["config"] = documents / "clientconfig"
        before = {key: path.stat() for key, path in paths.items()}
        data = {key: path.read_bytes() for key, path in paths.items()}
        time.sleep(0.1)
        if current_role(documents) != role_id:
            continue
        if any(path.read_bytes() != data[key] or path.stat().st_mtime_ns != before[key].st_mtime_ns for key, path in paths.items()):
            continue
        if process_client(pid) != client or started_at(pid) != process_started:
            raise ValueError("Game process changed during capture")
        if any(before[key].st_mtime < process_started for key in paths if key != "config"):
            raise ValueError("Inventory or heroes cache predates this game session; wait for login synchronization")
        souls = unhex_json(data["souls.raw.json"])
        heroes = unhex_json(data["heroes.raw.json"])
        if not isinstance(souls, dict) or not souls or not isinstance(heroes, dict):
            raise ValueError("Missing or invalid inventory/hero cache")
        manifest = {
            "exported_at": dt.datetime.now().astimezone().isoformat(),
            "role": role_metadata(unhex_json(data["config"]), role_id),
            "source": "Read-only hex(JSON) client cache; current role confirmed by the running client's login log",
            "process": {"pid": pid, "started_at": dt.datetime.fromtimestamp(process_started).astimezone().isoformat(), "client_directory": str(client)},
            "files": {
                key: {
                    "count": len(souls if key == "souls.raw.json" else heroes),
                    "source_file": str(paths[key]),
                    "source_modified_at": dt.datetime.fromtimestamp(before[key].st_mtime).astimezone().isoformat(),
                    "source_sha256": hashlib.sha256(data[key]).hexdigest(),
                }
                for key in ("souls.raw.json", "heroes.raw.json")
            },
            "counts": {"souls": len(souls), "hero_cache_entries": len(heroes)},
            "decoding_notes": {
                "method": "Client inventory and heroes are hex-encoded JSON, decoded without loss",
                "soul_layout": {"template_id": "others & 0xfffff", "suit_id": "(others >> 20) & 0xfffff", "quality": "(others >> 45) & 7", "level": "others >> 48", "random_attribute_rolls": "latin1(sattr), repeated 2 ASCII digits + big-endian IEEE754 float64"},
                "limitations": [],
                "consistency": "Repeated identical reads of both caches, with unchanged timestamps and role UUID; not a server-side atomic snapshot",
                "yyx_compatibility": "Reference only, NOT a complete yyx snapshot: unverified lock/garbage flags, currency and other unavailable fields are not invented",
                "reference_sources": REFERENCE_SOURCES,
            },
        }
        return souls, heroes, manifest
    raise ValueError("Cache or role kept changing; retry while idle in the courtyard")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pid", type=int, help="Running onmyoji.exe Linux PID; auto-detected if omitted")
    parser.add_argument("--mappings", type=Path, required=True, help="Public name_mappings.json from an existing export (names only)")
    parser.add_argument("--output-root", type=Path, default=Path("exports"))
    args = parser.parse_args()
    pid, client = find_process(args.pid)
    names = json.loads(args.mappings.read_text(encoding="utf-8"))
    souls, heroes, manifest = capture(pid, client)
    # Validate every piece before creating an output directory.
    decoded = [decode(uid, raw, heroes, names) for uid, raw in souls.items()]
    manifest["counts"]["equipped_souls"] = sum(row["holder"] is not None for row in decoded)
    manifest["counts"]["unequipped_souls"] = len(decoded) - manifest["counts"]["equipped_souls"]
    manifest["mapping_sources"] = names.get("sources", [])
    snapshot = args.output_root / dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    snapshot.mkdir(mode=0o700)  # Never overwrite an earlier snapshot.
    for filename, value in [("souls.raw.json", souls), ("heroes.raw.json", heroes), ("name_mappings.json", names), ("manifest.json", manifest)]:
        atomic_write(snapshot / filename, json_text(value))
    atomic_write(snapshot / "README.md", f"""# 当前运行角色御魂快照
角色：{manifest['role']['player_name']}｜{manifest['role']['server_name']}。
采集时间：{manifest['exported_at']}。御魂：{len(souls)} 件，含已装备和未装备。
- `御魂_AI分析.json`：带名称、主副属性、精确速度、首领单件属性和装备者；百分比使用百分点（55 = 55%）。
- `souls.json`：完整解码与每件原始字段；`souls.raw.json`、`heroes.raw.json`：无损缓存数据。
- `御魂.csv`：表格；`manifest.json`：角色、进程、源文件时间和哈希；`SHA256SUMS`：完整性校验。
- 只读本地缓存，不注入或修改游戏，不上传数据。名称映射可复用历史快照，但库存均来自本次采集。
- 不是服务器实时查询：未同步、未刷盘或未加载的数据无法保证包含；两份缓存重复读取一致不等于服务端原子快照。
- 不是痒痒熊专用导入格式。未核验的锁定/弃置位保留在 `raw.others`，不猜填；不提供未知的货币或其他库存。
- 属性合计不含式神基础数值与两件/四件套效果。文件含角色信息，仅保存在本机并以私有权限创建。
""")
    result = export(snapshot.resolve())
    print(json_text({"snapshot": str(snapshot.resolve()), "archive": str(snapshot.resolve().with_suffix('.zip')), "count": result["count"], "equipped": manifest["counts"]["equipped_souls"], "unequipped": manifest["counts"]["unequipped_souls"]}), end="")


if __name__ == "__main__":
    main()
