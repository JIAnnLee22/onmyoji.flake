const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0b0f17;
    color: #e2e8f0;
    font-family: 'Noto Sans CJK SC', 'PingFang SC', -apple-system, sans-serif;
    padding: 36px 40px;
    width: 1280px;
    margin: 0 auto;
    line-height: 1.5;
  }
  
  /* Header */
  .header {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
    border: 1px solid rgba(229, 169, 60, 0.35);
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 24px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #e5a93c, #ff5376, #38bdf8);
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }
  .title-area h1 {
    font-family: 'Noto Serif CJK SC', serif;
    font-size: 28px;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .title-area p {
    font-size: 14px;
    color: #94a3b8;
  }
  .tag-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
  }
  .badge-gold { background: rgba(229, 169, 60, 0.15); color: #fbbf24; border: 1px solid rgba(229, 169, 60, 0.3); }
  .badge-blue { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
  .badge-red { background: rgba(255, 83, 118, 0.15); color: #ff5376; border: 1px solid rgba(255, 83, 118, 0.3); }
  .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
  
  /* Stat Bar */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .stat-card {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 10px 14px;
  }
  .stat-label { font-size: 12px; color: #64748b; margin-bottom: 2px; }
  .stat-value { font-size: 18px; font-weight: 700; color: #f1f5f9; font-family: 'Maple Mono NL NF CN', monospace; }
  .stat-value.gold { color: #f59e0b; }
  .stat-value.blue { color: #38bdf8; }
  .stat-value.green { color: #10b981; }

  /* Sections */
  .section {
    background: rgba(19, 26, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 22px 24px;
    margin-bottom: 22px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
  }
  .section-title {
    font-family: 'Noto Serif CJK SC', serif;
    font-size: 19px;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title::before {
    content: '';
    width: 4px;
    height: 18px;
    background: #e5a93c;
    border-radius: 2px;
  }

  /* Shiki Cards Grid */
  .shiki-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 16px;
  }
  .shiki-card {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 14px;
    position: relative;
    overflow: hidden;
  }
  .shiki-card.priority-1 { border-color: rgba(229, 169, 60, 0.5); background: linear-gradient(180deg, rgba(229, 169, 60, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%); }
  .shiki-card.priority-2 { border-color: rgba(255, 83, 118, 0.4); background: linear-gradient(180deg, rgba(255, 83, 118, 0.06) 0%, rgba(15, 23, 42, 0.7) 100%); }
  .shiki-card.priority-3 { border-color: rgba(56, 189, 248, 0.4); background: linear-gradient(180deg, rgba(56, 189, 248, 0.06) 0%, rgba(15, 23, 42, 0.7) 100%); }
  
  .shiki-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .shiki-name { font-size: 16px; font-weight: 700; color: #f8fafc; }
  .shiki-status { font-size: 12px; color: #94a3b8; font-family: monospace; }
  .shiki-tag { font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600; margin-bottom: 8px; display: inline-block; }
  .shiki-action { font-size: 13px; font-weight: 600; color: #fbbf24; margin-bottom: 6px; }
  .shiki-desc { font-size: 12px; color: #94a3b8; line-height: 1.45; }

  /* Pause Box */
  .pause-box {
    background: rgba(15, 23, 42, 0.5);
    border: 1px dashed rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 12.5px;
    color: #94a3b8;
  }
  .pause-title { font-weight: 600; color: #cbd5e1; margin-bottom: 4px; }

  /* Soul Section Grid */
  .soul-tier-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .tier-col {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 14px;
  }
  .tier-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .tier-item {
    font-size: 12px;
    color: #cbd5e1;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  .tier-item strong { color: #f8fafc; font-weight: 600; }
  .code { font-family: 'Maple Mono NL NF CN', monospace; color: #38bdf8; font-size: 11px; }

  /* Lineup Tables */
  .lineup-block {
    margin-bottom: 20px;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 16px;
  }
  .lineup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .lineup-title {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lineup-purpose { font-size: 12px; color: #94a3b8; }
  
  .custom-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    text-align: left;
  }
  .custom-table th {
    background: rgba(30, 41, 59, 0.6);
    color: #94a3b8;
    padding: 8px 10px;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .custom-table td {
    padding: 7px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    color: #e2e8f0;
  }
  .custom-table tr:last-child td { border-bottom: none; }
  .slot-tag {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    font-family: monospace;
    font-size: 11px;
    color: #94a3b8;
  }
  .stat-hl { color: #fbbf24; font-weight: 600; font-family: monospace; }
  .crit-hl { color: #ff5376; font-weight: 600; font-family: monospace; }
  
  /* Timeline */
  .timeline-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .timeline-box {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 16px;
  }
  .timeline-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .timeline-list {
    list-style: none;
    font-size: 12.5px;
  }
  .timeline-list li {
    position: relative;
    padding-left: 18px;
    margin-bottom: 8px;
    color: #cbd5e1;
    line-height: 1.45;
  }
  .timeline-list li::before {
    content: '•';
    position: absolute;
    left: 4px;
    color: #e5a93c;
    font-size: 16px;
    line-height: 1;
  }
  .goal-box {
    margin-top: 12px;
    padding: 10px 12px;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 6px;
    font-size: 12px;
    color: #a7f3d0;
  }

  .footer {
    text-align: center;
    font-size: 12px;
    color: #475569;
    margin-top: 10px;
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <div class="title-area">
      <h1>阴阳师 · 式神养成与御魂配装深度规划</h1>
      <p>角色：帅气的佳安 ｜ 服务器：依偎相守 ｜ 角色编号：18083 ｜ 玩家等级：60</p>
    </div>
    <div class="tag-group">
      <span class="badge badge-gold">核心目标：PVE 短线与长线</span>
      <span class="badge badge-red">攻坚卡点：活动高星打不动 & 长线低伤</span>
      <span class="badge badge-blue">精力配置：每日 1～2 小时</span>
      <span class="badge badge-green">御魂支持：预算充沛全力强化</span>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-label">御行达摩 (黑蛋)</div>
      <div class="stat-value gold">11 颗</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">奉为达摩 (白蛋)</div>
      <div class="stat-value">95 个 (满级67)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">6星式神储备</div>
      <div class="stat-value blue">8 只 (待升2)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">已强满 +15 御魂</div>
      <div class="stat-value green">120 件</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">全家极限散件一速</div>
      <div class="stat-value gold">+138.03</div>
    </div>
  </div>
</div>

<!-- SECTION 1 -->
<div class="section">
  <div class="section-title">一、式神优先培养与暂缓分级</div>
  
  <div class="shiki-grid">
    <div class="shiki-card priority-1">
      <div class="shiki-head">
        <span class="shiki-name">SSR 季</span>
        <span class="shiki-status">2星 Lv.1 [1,1,1]</span>
      </div>
      <span class="shiki-tag badge-gold">TOP 1 极核 · 活动破局真神</span>
      <div class="shiki-action">升 6 星 ｜ 喂 9 颗黑蛋</div>
      <div class="shiki-desc">
        活动高星怪物打不动根因是防御极高且缺乏破防拐。季无视暴击、直接吃攻击与暴伤、自带真伤/间伤机制，无视怪物的恶心词缀，单卡直接颠覆活动体验。
      </div>
    </div>

    <div class="shiki-card priority-2">
      <div class="shiki-head">
        <span class="shiki-name">SP 渺念萤草</span>
        <span class="shiki-status">5星 Lv.35 [5,5,5]</span>
      </div>
      <span class="shiki-tag badge-red">TOP 2 极核 · 长线攻守兼备</span>
      <div class="shiki-action">升 6 星 ｜ 零黑蛋成本</div>
      <div class="shiki-desc">
        技能已全满，库存现成战神！从 5 星升至 6 星即可完成质变，兼具极其恐怖的多段群体白字伤害与全队高额治疗/护盾，是攻坚高难副本和逢魔打桩的绝对底牌。
      </div>
    </div>

    <div class="shiki-card priority-3">
      <div class="shiki-head">
        <span class="shiki-name">SSR 须佐之男</span>
        <span class="shiki-status">6星 Lv.40 [1,5,3]</span>
      </div>
      <span class="shiki-tag badge-blue">TOP 3 极核 · 单体输出天花板</span>
      <div class="shiki-action">已 6 星 ｜ 喂 2 颗黑蛋满 3 技能</div>
      <div class="shiki-desc">
        核心 2 技能已满，仅需 2 颗黑蛋补齐 [1,5,5] 完全体。全游戏单体输出顶峰，搭配破势 4+针女 2 满暴暴伤套，主宰魂土速刷、契灵及单体 Boss 打桩。
      </div>
    </div>

    <div class="shiki-card">
      <div class="shiki-head">
        <span class="shiki-name">R 丑时之女</span>
        <span class="shiki-status">5星 Lv.35 [5,5,5]</span>
      </div>
      <span class="shiki-tag badge-green">TOP 4 极核 · 长线单体放大器</span>
      <div class="shiki-action">保持 5 星 ｜ 装配招财命中套</div>
      <div class="shiki-desc">
        技能已满。长线单体逢魔和活动首领不可或缺的增伤核心，通过草人传递下咒成倍放大全队单体伤害，且触发破势/狂骨增伤乘区。
      </div>
    </div>
  </div>

  <div class="pause-box">
    <div class="pause-title">🚫 暂缓培养与资源避坑名单：</div>
    • <strong>SSR 神无月</strong>：虽已 6 星但技能为 [1,1,1] 白板，当前黑蛋极其有限，神无月在技能未满前增益极低，暂缓喂蛋。<br>
    • <strong>SP 初翎山风 / SP 天剑韧心鬼切 / SSR 御馔津</strong>：纯 PVP 斗技/道馆卡，在 PVE 短线与长线中无就业空间，严格封存不消耗星级。<br>
    • <strong>SP 炼狱茨木童子 / SSR 葛叶</strong>：已有玉藻前主打探索速刷，单体有须佐之男，无需分流宝贵狗粮与黑蛋。
  </div>
</div>

<!-- SECTION 2 -->
<div class="section">
  <div class="section-title">二、御魂强化分级与弃置清单 (740件御魂盘点)</div>
  <div class="soul-tier-grid">
    <div class="tier-col">
      <div class="tier-header"><span class="badge badge-red">T0 立即强化</span> 核心首领御魂乘区</div>
      <div class="tier-item">
        • <strong>荒骷髅 1号位</strong> <span class="code">[6accb250affff06a4b1b100d]</span><br>
        副属性带攻加+暴伤+速度，长线打桩顶级胚。
      </div>
      <div class="tier-item">
        • <strong>荒骷髅 3号位</strong> <span class="code">[6acfbadf0d084022ca656f24]</span><br>
        副属性暴伤 3.38% + 攻加 2.72%，季专用 0 暴击极品。
      </div>
      <div class="tier-item">
        • <strong>鬼灵歌伎 6号位</strong> <span class="code">[6accaa91affff06a4b1a8801]</span><br>
        主属性暴击伤害 14.0% 珍稀 6 星首领胚。
      </div>
      <div class="tier-item">
        • <strong>土蜘蛛 3号位/5号位</strong> <span class="code">[6acf9f4d... / 6acf1026...]</span><br>
        长线间接伤害与减速必备，全部强至 +15。
      </div>
      <div class="tier-item">
        • <strong>64 个双暴胚子</strong>：优先挑选海月火玉、狂骨、破势、心眼强化。
      </div>
    </div>

    <div class="tier-col">
      <div class="tier-header"><span class="badge badge-gold">T1 保留待选</span> 次级筛选与测速</div>
      <div class="tier-item">
        • <strong>147 个初始 4 词条带速胚子</strong>：<br>
        不必直接拉满 +15，每次 +3/+6 测速，未加到速度上的胚子及时止损。
      </div>
      <div class="tier-item">
        • <strong>2号位主速度胚子 (10件)</strong>：<br>
        地藏像、珍珠、应声虫等带副属性速度/抵抗件逐步强化，充实辅助速度储备。
      </div>
      <div class="tier-item">
        • <strong>辅助套装核心件</strong>：<br>
        火灵、招财、遗念火的生命加成/命中/抵抗胚子分类打标保留。
      </div>
    </div>

    <div class="tier-col">
      <div class="tier-header"><span class="badge badge-green">T2 弃置回收</span> 换取金币与金蛇皮</div>
      <div class="tier-item">
        • <strong>全部 4/5 星御魂 (共 7 件)</strong>：一键奉纳。
      </div>
      <div class="tier-item">
        • <strong>约 66 件纯垃圾 6 星御魂</strong>：<br>
        2/4/6 号位主属性为生命/防御加成，且副属性无速度、无双暴、无命中的胚子。
      </div>
      <div class="tier-item">
        • <strong>回笼收益</strong>：<br>
        批量奉纳回收几十万金币与大量大蛇神之鳞，可在秘魂屋定向兑换狂骨与荒骷髅。
      </div>
    </div>
  </div>
</div>

<!-- SECTION 3 -->
<div class="section">
  <div class="section-title">三、主力阵容与零冲突御魂配装 (36件御魂严格唯一ID)</div>

  <!-- 阵容 1 -->
  <div class="lineup-block">
    <div class="lineup-header">
      <div class="lineup-title">
        <span class="badge badge-gold">阵容一</span> 活动高星爬塔与高难攻坚通解 (季 + SP萤草 + 不见岳 + 山兔 + 座敷)
      </div>
      <div class="lineup-purpose">机制：季无视防御群攻压血 + 草总多段针女收割并群奶 + 不见岳高额加攻</div>
    </div>
    <table class="custom-table">
      <thead>
        <tr>
          <th width="14%">式神 / 定位</th>
          <th width="20%">御魂套装 & 核心面板</th>
          <th width="66%">具体御魂部件与唯一 ID (全部 +15)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>SSR 季</strong><br><span style="color:#94a3b8;font-size:11px;">群攻破局核心</span></td>
          <td>
            破势 4 + 散件<br>
            <span class="crit-hl">暴伤 312.1%</span> ｜ <span class="stat-hl">攻击 7279.4</span><br>
            <span style="font-size:11px;color:#94a3b8;">0暴击需求 / 纯吃暴伤</span>
          </td>
          <td>
            <span class="slot-tag">1号</span> 破势 [5a6df47b2b33a2585da824c6] 暴伤14.8% &nbsp;
            <span class="slot-tag">2号</span> 破势 [5b0442642989086e1314da2b] 攻加55% 暴伤6.8%<br>
            <span class="slot-tag">3号</span> 阴摩罗 [65a7fb453ab52c6023f2432e] 暴伤22.8%极品 &nbsp;
            <span class="slot-tag">4号</span> 破势 [5aa7b2fb2b33a2684a8111e0] 攻加55% 暴伤14.6%<br>
            <span class="slot-tag">5号</span> 破势 [5b0433952989086e1314a20a] 暴伤14.2% &nbsp;
            <span class="slot-tag">6号</span> 招财猫 [5ac1bab03119ac5e7e2c842f] 主暴伤89% 攻加10.9%
          </td>
        </tr>
        <tr>
          <td><strong>SP 渺念萤草</strong><br><span style="color:#94a3b8;font-size:11px;">多段群攻+群奶</span></td>
          <td>
            针女 4 + 散件<br>
            <span class="crit-hl">暴击 113.5% 超满暴</span><br>
            <span class="stat-hl">暴伤 194.2%</span> ｜ 攻击 8052.8
          </td>
          <td>
            <span class="slot-tag">1号</span> 阴摩罗 [65a2a31db26f2214370c68a3] 暴伤18.8% 暴2.8% &nbsp;
            <span class="slot-tag">2号</span> 狂骨 [65a54c0eb26f221437252012] 攻加55% 暴10.2%<br>
            <span class="slot-tag">3号</span> 针女 [5aa0a4a22b33a2684a67f03e] 暴5.5% 暴伤7.6% &nbsp;
            <span class="slot-tag">4号</span> 针女 [5aa555e32b33a2684a7a69af] 攻加55%<br>
            <span class="slot-tag">5号</span> 针女 [5a99feba2b33a20419710f3c] 暴伤14.6% &nbsp;
            <span class="slot-tag">6号</span> 针女 [5acf701f2b33a2095ceb03b7] 主暴击55% 攻加8.1%
          </td>
        </tr>
        <tr>
          <td><strong>SSR 不见岳</strong><br><span style="color:#94a3b8;font-size:11px;">全队攻击增幅</span></td>
          <td>
            日女 2 + 散件防防防<br>
            <span class="stat-hl">总防加 +246.3%</span><br>
            <span style="font-size:11px;color:#34d399;">净增 312 点纯防御</span>
          </td>
          <td>
            <span class="slot-tag">1号</span> 阴摩罗 [65a2adedb26f2214370ce0ca] 防加8.2% &nbsp;
            <span class="slot-tag">2号</span> 反枕 [659f8256b26f221437eb2d1b] 主防加55% 副防加13.7%<br>
            <span class="slot-tag">3号</span> 日女 [6ac8cbbe9f040d743b0be6f5] 副防加16.5% &nbsp;
            <span class="slot-tag">4号</span> 日女 [65a1402cb26f221437fe0244] 主防加55% (激活日女+30%防)<br>
            <span class="slot-tag">5号</span> 歌伎 [6aca5716affff06a4bf90685] 防加8.0% &nbsp;
            <span class="slot-tag">6号</span> 鸣屋 [5a9aa07f5cfcbe2a36fff022] 主防加55%
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 阵容 2 -->
  <div class="lineup-block">
    <div class="lineup-header">
      <div class="lineup-title">
        <span class="badge badge-red">阵容二</span> 长线打桩与逢魔Boss核心 (须佐之男 + 丑女 + SP萤草 + 不见岳 + 辉夜姬)
      </div>
      <div class="lineup-purpose">机制：丑女插草人并下咒放大伤害 + 须佐天羽羽斩极速爆发 + 不见岳加攻 + 辉夜姬薙魂护航供火</div>
    </div>
    <table class="custom-table">
      <thead>
        <tr>
          <th width="14%">式神 / 定位</th>
          <th width="20%">御魂套装 & 核心面板</th>
          <th width="66%">具体御魂部件与唯一 ID (全部 +15)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>SSR 须佐之男</strong><br><span style="color:#94a3b8;font-size:11px;">单体输出极核</span></td>
          <td>
            破势 4 + 针女 2<br>
            <span class="crit-hl">暴击 101.21% 精准满暴</span><br>
            <span class="stat-hl">暴伤 274.60%</span> ｜ 攻击 7824.5
          </td>
          <td>
            <span class="slot-tag">1号</span> 破势 [5b06e3c02b33a22fe9a536a2] 暴8.4% 暴伤11.4% &nbsp;
            <span class="slot-tag">2号</span> 针女 [65a16e9ab26f22143700e7c8] 攻加55% 暴伤13.6% 速7.8<br>
            <span class="slot-tag">3号</span> 破势 [65a184cbb26f221437019378] 暴击15.4%极品副属性 &nbsp;
            <span class="slot-tag">4号</span> 针女 [65a18d64b26f22143701bc22] 攻加55% 暴7.7%<br>
            <span class="slot-tag">5号</span> 破势 [5acf77092b33a2095ceb24b5] 暴10.3% &nbsp;
            <span class="slot-tag">6号</span> 破势 [5a7418222b33a263b9a39aab] 主暴伤89% 副暴伤10.6% (总暴伤99.6%)
          </td>
        </tr>
        <tr>
          <td><strong>R 丑时之女</strong><br><span style="color:#94a3b8;font-size:11px;">单体伤害放大</span></td>
          <td>
            招财猫 4 + 散件<br>
            <span class="stat-hl">速度 +57 超车晴明</span><br>
            <span class="crit-hl">效果命中 58.3% 稳定下咒</span>
          </td>
          <td>
            <span class="slot-tag">1号</span> 招财 [5ac1baf83119ac5e7e2c84be] 速11.1 &nbsp;
            <span class="slot-tag">2号</span> 薙魂 [5acf83db2b33a2095ceb52b4] 主速度57.0<br>
            <span class="slot-tag">3号</span> 招财 [5ac1ba753119ac5e7e2c83c0] 速5.6 &nbsp;
            <span class="slot-tag">4号</span> 招财 [5adc78bc2b33a2610931b50a] 主命中55% 副命中3.3%<br>
            <span class="slot-tag">5号</span> 招财 [5a9aa07f5cfcbe2a36fff021] 主生命2052 &nbsp;
            <span class="slot-tag">6号</span> 地藏 [5ad99a162b33a261092a7e78] 主生命加成55%
          </td>
        </tr>
        <tr>
          <td><strong>SSR 玉藻前</strong><br><span style="color:#94a3b8;font-size:11px;">狗粮速刷打手</span></td>
          <td>
            破势 4 + 散件<br>
            <span class="crit-hl">暴击 109.7% 满暴</span><br>
            <span class="stat-hl">暴伤 214.7%</span> ｜ 攻击 7613.6
          </td>
          <td>
            <span class="slot-tag">1号</span> 破势 [5adb4b1629890806bf0e6808] 暴5.0% 暴伤13.8% &nbsp;
            <span class="slot-tag">2号</span> 破势 [5b06ec082b33a22fe9a54f6d] 攻加55% 暴伤3.8%<br>
            <span class="slot-tag">3号</span> 破势 [5aab1f612b33a25e2f27b8e6] 暴伤17.3% &nbsp;
            <span class="slot-tag">4号</span> 破势 [5adb4da729890806bf0e770c] 攻加55% 暴5.3% 速11.2<br>
            <span class="slot-tag">5号</span> 阴摩罗 [5b1172012989084940a0f3b0] 暴伤18.2% &nbsp;
            <span class="slot-tag">6号</span> 网切 [5aa9c3b52b33a25e2f20c912] 主暴击55% 暴伤11.5%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- SECTION 4 -->
<div class="section">
  <div class="section-title">四、未来 7 天与 30 天落地行动路线图</div>
  <div class="timeline-grid">
    <div class="timeline-box">
      <div class="timeline-title"><span class="badge badge-gold">前 7 天</span> 快速破局阶段</div>
      <ul class="timeline-list">
        <li><strong>白蛋升星</strong>：利用 51 只 2 星 Lv.20 白蛋和蓝蛋升出 10 只 5 星白蛋，将 <strong>SP 渺念萤草</strong> 与 <strong>SSR 季</strong> 升至 6 星满级 (40级)。</li>
        <li><strong>黑蛋分配</strong>：先喂 <strong>须佐之男 2 颗黑蛋</strong> 升满 3 技能成完全体；剩余 <strong>9 颗黑蛋全部喂给 SSR 季</strong>。</li>
        <li><strong>一键装配</strong>：按上述清单将 36 件零冲突御魂直接穿给对应式神，彻底唤醒须佐、季、草总。</li>
      </ul>
      <div class="goal-box">
        <strong>🎯 7 天验收指标：</strong><br>
        1. 魂十一 (魂土)：山兔+座敷+须佐之男轻松单人速刷 (15～20s)。<br>
        2. 活动爬塔高星：季+SP萤草+不见岳全自动秒杀 10 星首领与小怪。
      </div>
    </div>

    <div class="timeline-box">
      <div class="timeline-title"><span class="badge badge-blue">前 30 天</span> 长线深耕与补齐短板</div>
      <ul class="timeline-list">
        <li><strong>首领御魂拉满</strong>：弃置 66 件垃圾胚子换金币，集中强化荒骷髅 1/3号位、鬼灵歌伎 6号位暴伤至 +15。</li>
        <li><strong>拼凑关键辅助 SR 清姬</strong>：通过每日砸百鬼夜行或阴阳寮祈愿凑齐 40 片碎片召唤清姬，升 5 星带雪幽魂速命生，为长线群体战斗提供 300 点群体破防与冰冻。</li>
        <li><strong>不见岳 3 技能</strong>：逢魔/秘闻积累黑蛋，优先点满不见岳 3 技能提升攻击转化率。</li>
      </ul>
      <div class="goal-box">
        <strong>🎯 30 天验收指标：</strong><br>
        1. 逢魔之时 (全Boss)：须佐+丑女+草总+不见岳阵容单局突破 4400 万+，稳定斩获 S/极 评分印记。<br>
        2. 秘闻副本全通：通关全部主流秘闻 10 层拿齐黑蛋奖励；轻松单刷真八岐大蛇。
      </div>
    </div>
  </div>
</div>

<div class="footer">
  网易《阴阳师》库存智能诊断规划 ｜ 数据快照源自 20261020-155636 ｜ 严格遵循无损配装算法
</div>

</body>
</html>
`;

async function main() {
  const htmlPath = path.resolve(__dirname, 'plan.html');
  const imgPath = path.resolve(__dirname, '../阴阳师_养成与配装规划.png');
  fs.writeFileSync(htmlPath, htmlContent);

  const chrome = spawn('google-chrome-stable', [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-sandbox'
  ]);
  
  await new Promise(r => setTimeout(r, 800));

  const version = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9224/json/version', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      callbacks.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };
  await new Promise(r => ws.onopen = r);

  await send('Target.createTarget', { url: 'file://' + htmlPath });
  
  const targets = await new Promise((resolve) => {
    http.get('http://127.0.0.1:9224/json/list', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });

  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('plan.html'));
  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => pageWs.onopen = r);

  let pid = 1;
  const pCallbacks = new Map();
  function pageSend(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = pid++;
      pCallbacks.set(msgId, { resolve, reject });
      pageWs.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  pageWs.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pCallbacks.has(m.id)) {
      pCallbacks.get(m.id).resolve(m.result);
      pCallbacks.delete(m.id);
    }
  };

  await pageSend('Page.enable');
  await pageSend('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 1000,
    deviceScaleFactor: 2,
    mobile: false
  });

  await pageSend('DOM.getDocument');
  const layout = await pageSend('Page.getLayoutMetrics');
  const height = Math.ceil(layout.contentSize.height);

  await pageSend('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: height,
    deviceScaleFactor: 2,
    mobile: false
  });

  const screenshot = await pageSend('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });

  fs.writeFileSync(imgPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`Successfully generated: ${imgPath} (height: ${height}px)`);

  pageWs.close();
  ws.close();
  chrome.kill();
  fs.unlinkSync(htmlPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
