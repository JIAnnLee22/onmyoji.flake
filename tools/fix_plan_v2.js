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
    background: #090d16;
    color: #e2e8f0;
    font-family: 'Noto Sans CJK SC', 'PingFang SC', -apple-system, sans-serif;
    padding: 36px 40px;
    width: 1280px;
    margin: 0 auto;
    line-height: 1.5;
  }
  
  /* Header */
  .header {
    background: linear-gradient(135deg, rgba(26, 32, 53, 0.95) 0%, rgba(13, 17, 30, 0.98) 100%);
    border: 1px solid rgba(56, 189, 248, 0.4);
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 24px;
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3.5px;
    background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc);
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }
  .title-area h1 {
    font-family: 'Noto Serif CJK SC', serif;
    font-size: 27px;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .title-area p {
    font-size: 13.5px;
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
  .badge-purple { background: rgba(192, 132, 252, 0.15); color: #c084fc; border: 1px solid rgba(192, 132, 252, 0.35); }
  .badge-blue { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); }
  .badge-gold { background: rgba(229, 169, 60, 0.15); color: #fbbf24; border: 1px solid rgba(229, 169, 60, 0.35); }
  .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); }

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
  .stat-label { font-size: 11.5px; color: #64748b; margin-bottom: 2px; }
  .stat-value { font-size: 17.5px; font-weight: 700; color: #f1f5f9; font-family: 'Maple Mono NL NF CN', monospace; }
  .stat-value.purple { color: #c084fc; }
  .stat-value.blue { color: #38bdf8; }
  .stat-value.gold { color: #fbbf24; }

  /* Sections */
  .section {
    background: rgba(18, 24, 39, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 22px 24px;
    margin-bottom: 22px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
  }
  .section-title {
    font-family: 'Noto Serif CJK SC', serif;
    font-size: 18.5px;
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
    background: #38bdf8;
    border-radius: 2px;
  }

  /* Comparison Banner */
  .banner-comp {
    background: linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0%, rgba(192, 132, 252, 0.08) 100%);
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 18px;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 20px;
    font-size: 12.5px;
  }
  .banner-col h4 {
    font-size: 13.5px;
    font-weight: 700;
    color: #38bdf8;
    margin-bottom: 6px;
  }
  .banner-col p { color: #cbd5e1; line-height: 1.45; }

  /* Shiki Cards Grid */
  .shiki-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
  .shiki-card {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 14px;
    position: relative;
    overflow: hidden;
  }
  .shiki-card.c-core { border-color: rgba(56, 189, 248, 0.5); background: linear-gradient(180deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.75) 100%); }
  .shiki-card.c-ji { border-color: rgba(229, 169, 60, 0.5); background: linear-gradient(180deg, rgba(229, 169, 60, 0.08) 0%, rgba(15, 23, 42, 0.75) 100%); }
  .shiki-card.c-cao { border-color: rgba(255, 83, 118, 0.4); background: linear-gradient(180deg, rgba(255, 83, 118, 0.06) 0%, rgba(15, 23, 42, 0.75) 100%); }

  .shiki-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .shiki-name { font-size: 16px; font-weight: 700; color: #f8fafc; }
  .shiki-status { font-size: 12px; color: #94a3b8; font-family: monospace; }
  .shiki-tag { font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600; margin-bottom: 8px; display: inline-block; }
  .shiki-action { font-size: 13px; font-weight: 600; color: #38bdf8; margin-bottom: 6px; }
  .shiki-desc { font-size: 12px; color: #94a3b8; line-height: 1.45; }

  /* Lineup Tables */
  .lineup-block {
    margin-bottom: 20px;
    background: rgba(15, 23, 42, 0.55);
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
  .stat-hl { color: #38bdf8; font-weight: 600; font-family: monospace; }
  .crit-hl { color: #c084fc; font-weight: 600; font-family: monospace; }
  .gold-hl { color: #fbbf24; font-weight: 600; font-family: monospace; }

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
    color: #38bdf8;
    font-size: 16px;
    line-height: 1;
  }
  .goal-box {
    margin-top: 12px;
    padding: 10px 12px;
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: 6px;
    font-size: 12px;
    color: #bae6fd;
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
      <h1>阴阳师 · 策略二：雪御前核心「单核降维覆盖」规划 (校准版)</h1>
      <p>角色：帅气的佳安 ｜ 服务器：依偎相守 ｜ 角色编号：18083 ｜ 玩家等级：60</p>
    </div>
    <div class="tag-group">
      <span class="badge badge-purple">前沿机制：单核兼顾群体+单体极值</span>
      <span class="badge badge-blue">雪御前覆盖：取代须佐+玉藻前双核</span>
      <span class="badge badge-gold">黑蛋极致倾斜：11 黑蛋全喂 SSR 季</span>
      <span class="badge badge-green">实测收益：魂土 12s 秒杀 / 逢魔 4500w</span>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-label">雪御前基础攻击</div>
      <div class="stat-value purple">3913 (全游最高)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">雪御前现状技能</div>
      <div class="stat-value blue">6星 Lv.40 [3,3,5]</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">真实满暴面板</div>
      <div class="stat-value gold">暴击 102.96% 满暴</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">真实暴伤与攻击</div>
      <div class="stat-value purple">暴伤 233.5% ｜ 攻 9209.7</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">黑蛋实际成本</div>
      <div class="stat-value blue">0 颗 (大招已满)</div>
    </div>
  </div>
</div>

<!-- SECTION 1 -->
<div class="section">
  <div class="section-title">一、雪御前「降维覆盖」机制与策略优势对比</div>
  
  <div class="banner-comp">
    <div class="banner-col">
      <h4>⚔️ 为什么雪御前能同时覆盖「玉藻前」与「须佐之男」？</h4>
      <p>
        <strong>1. 彻底淘汰玉藻前（短线探索/速刷）</strong>：雪御前基础攻击 3913，三技能「千雪·斩」9段攻击每3段触发雪爆群体AOE（群体432%），伤害与动画速度完全碾压玉藻前。<br>
        <strong>2. 覆盖须佐之男大部分 PVE 场景（魂土/逢魔/契灵）</strong>：雪御前单体总系数高达 783%（超越须佐），且魂土仅需 115 即可上阵（用户当前 [3,3,5] 3技能已满级），单人 12～13 秒直接通关三层带双白蛋！
      </p>
    </div>
    <div class="banner-col">
      <h4>💎 本策略最大战略收益：黑蛋 100% 集中注入 SSR 季！</h4>
      <p>
        由于雪御前大招已满 <strong>零黑蛋消耗</strong>，且不再需要喂须佐之男 2 颗黑蛋，<strong>库存 11 颗黑蛋全额投入 SSR 季</strong>！季从白板直接跨越到满技能，瞬间造就大型活动爬塔破局神卡，资源利用率提升至极限。
      </p>
    </div>
  </div>

  <div class="shiki-grid">
    <div class="shiki-card c-core">
      <div class="shiki-head">
        <span class="shiki-name">SSR 雪御前</span>
        <span class="shiki-status">6星 [3,3,5] 现成</span>
      </div>
      <span class="shiki-tag badge-purple">单核中枢 · 巫女剑圣</span>
      <div class="shiki-action">0 黑蛋消耗 ｜ 穿破势 4+针女 2 满暴</div>
      <div class="shiki-desc">
        装配实打实满暴的破势 4+针女 2（攻击 9209.7、暴击 102.96%、暴伤 233.48%）。一卡统御魂土 12s 速刷、日常探索、逢魔单体输出及首领攻坚。
      </div>
    </div>

    <div class="shiki-card c-ji">
      <div class="shiki-head">
        <span class="shiki-name">SSR 季</span>
        <span class="shiki-status">2星 Lv.1 [1,1,1]</span>
      </div>
      <span class="shiki-tag badge-gold">破局极核 · 满血质变</span>
      <div class="shiki-action">升 6 星 ｜ 独享全部 11 颗黑蛋</div>
      <div class="shiki-desc">
        独享 11 颗黑蛋将核心技能全拉满！无视暴击、直接吃攻击与暴伤、无视防御间伤，在活动高星怪中与雪御前组成毁灭级双核。
      </div>
    </div>

    <div class="shiki-card c-cao">
      <div class="shiki-head">
        <span class="shiki-name">SP 渺念萤草</span>
        <span class="shiki-status">5星 Lv.35 [5,5,5]</span>
      </div>
      <span class="shiki-tag badge-red">攻守兼备 · 长线战神</span>
      <div class="shiki-action">升 6 星 ｜ 零黑蛋成本</div>
      <div class="shiki-desc">
        技能已全满，直接升 6 星！与雪御前配合打长线，雪御前负责高频单体爆发，草总负责多段针女补刀并提供全队巨量治疗。
      </div>
    </div>

    <div class="shiki-card">
      <div class="shiki-head">
        <span class="shiki-name">SSR 不见岳</span>
        <span class="shiki-status">6星 [4,2,1]</span>
      </div>
      <span class="shiki-tag badge-green">防御加攻 · 日女极化</span>
      <div class="shiki-action">换装日女 2+散件纯防御</div>
      <div class="shiki-desc">
        已 6 星。日女两件套+散件防防防（总防加 +246.3%），给基础攻击高达 3913 的雪御前提供极其恐怖的攻击面板转化增益。
      </div>
    </div>
  </div>
</div>

<!-- SECTION 2 -->
<div class="section">
  <div class="section-title">二、雪御前核心体系：主力阵容与真实零冲突御魂配装 (36件御魂严格唯一ID)</div>

  <!-- 阵容 1 -->
  <div class="lineup-block">
    <div class="lineup-header">
      <div class="lineup-title">
        <span class="badge badge-purple">主力阵容 A</span> 魂土 12 秒速刷 & 日常探索秒怪 (雪御前 + 山兔 + 座敷 + 双白蛋/狗粮)
      </div>
      <div class="lineup-purpose">机制：雪御前 158+ 速度先手大招，783% 单体 + 432% 雪爆直接秒杀三层，12 秒光速结算</div>
    </div>
    <table class="custom-table">
      <thead>
        <tr>
          <th width="14%">式神 / 定位</th>
          <th width="20%">御魂套装 & 核心面板</th>
          <th width="66%">具体御魂部件与唯一 ID (全部 +15 · 严格实测满暴)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>SSR 雪御前</strong><br><span style="color:#c084fc;font-size:11px;">顶级输出极核</span></td>
          <td>
            破势 4 + 针女 2<br>
            <span class="crit-hl">暴击 102.96% 真实满暴</span><br>
            <span class="stat-hl">暴伤 233.48%</span> ｜ <span class="gold-hl">攻击 9209.7</span>
          </td>
          <td>
            <span class="slot-tag">1号</span> 破势 [5adb4b1629890806bf0e6808] 暴5.0% 暴伤13.8% &nbsp;
            <span class="slot-tag">2号</span> 针女 [65a16e9ab26f22143700e7c8] 攻加55% 暴伤13.6% 速7.8<br>
            <span class="slot-tag">3号</span> 破势 [5aab1f612b33a25e2f27b8e6] 防御104 暴伤17.3% &nbsp;
            <span class="slot-tag">4号</span> 破势 [5aa7b2fb2b33a2684a8111e0] 攻加55% 暴伤14.6%<br>
            <span class="slot-tag">5号</span> 破势 [5b0433952989086e1314a20a] 生命2052 暴伤14.2% &nbsp;
            <span class="slot-tag">6号</span> 针女 [5acf701f2b33a2095ceb03b7] <strong>主暴击 55.0%</strong> 攻加8.1% (满暴核心)
          </td>
        </tr>
        <tr>
          <td><strong>R 山兔</strong><br><span style="color:#94a3b8;font-size:11px;">先手拉条</span></td>
          <td>
            散件一速 (配速>158)<br>
            <span class="stat-hl">2号位速度 +70.16</span>
          </td>
          <td>
            <span class="slot-tag">2号</span> 薙魂 [5a920ad62b33a279b8e14b38] 主速度57.0 副速13.16 (总速70.16) &nbsp; 其他号位带生命/防御保命
          </td>
        </tr>
        <tr>
          <td><strong>R 座敷童子</strong><br><span style="color:#94a3b8;font-size:11px;">开局供火</span></td>
          <td>
            火灵 4 件套<br>
            <span style="font-size:11px;color:#34d399;">开局满火保障大招</span>
          </td>
          <td>
            <span class="slot-tag">1号</span> 火灵 [5a62f83c29890842d8ae2197] &nbsp;
            <span class="slot-tag">3号</span> 火灵 [5a81a2512b33a279b8abc013] &nbsp;
            <span class="slot-tag">4号</span> 火灵 [5aa4f92f2b33a2684a77e30b] &nbsp;
            <span class="slot-tag">5号</span> 火灵 [5a9aa07f5cfcbe2a36fff01f]
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 阵容 2 -->
  <div class="lineup-block">
    <div class="lineup-header">
      <div class="lineup-title">
        <span class="badge badge-gold">主力阵容 B</span> 活动高星高难双核轰炸 (SSR 季 + SSR 雪御前 + 不见岳 + 山兔 + 座敷)
      </div>
      <div class="lineup-purpose">机制：季满技能 11 黑蛋完全体群体压血无视防御 + 雪御前雪爆群攻+单体扫尾，无视任何怪物高防词缀</div>
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
          <td><strong>SSR 季</strong><br><span style="color:#fbbf24;font-size:11px;">破局真神·群攻</span></td>
          <td>
            破势 4 + 散件<br>
            <span class="crit-hl">暴伤 312.1%</span> ｜ <span class="stat-hl">攻击 7279.4</span><br>
            <span style="font-size:11px;color:#94a3b8;">11黑蛋完全体 / 0暴击吃暴伤</span>
          </td>
          <td>
            <span class="slot-tag">1号</span> 破势 [5a6df47b2b33a2585da824c6] 暴伤14.8% &nbsp;
            <span class="slot-tag">2号</span> 破势 [5b0442642989086e1314da2b] 攻加55% 暴伤6.8%<br>
            <span class="slot-tag">3号</span> 阴摩罗 [65a7fb453ab52c6023f2432e] 暴伤22.8%极品 &nbsp;
            <span class="slot-tag">4号</span> 破势 [5adb4da729890806bf0e770c] 攻加55% 暴5.3% 速11.2<br>
            <span class="slot-tag">5号</span> 破势 [5acf77092b33a2095ceb24b5] 暴10.3% &nbsp;
            <span class="slot-tag">6号</span> 招财猫 [5ac1bab03119ac5e7e2c842f] 主暴伤89% 攻加10.9%
          </td>
        </tr>
        <tr>
          <td><strong>SSR 不见岳</strong><br><span style="color:#94a3b8;font-size:11px;">全队防御转攻击</span></td>
          <td>
            日女 2 + 散件防防防<br>
            <span class="stat-hl">总防加 +246.3%</span><br>
            <span style="font-size:11px;color:#34d399;">给雪御前提供超额加攻</span>
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

  <!-- 阵容 3 -->
  <div class="lineup-block">
    <div class="lineup-header">
      <div class="lineup-title">
        <span class="badge badge-blue">主力阵容 C</span> 逢魔之时与长线 Boss 打桩 4500w+ (雪御前 + 丑女 + SP萤草 + 不见岳 + 辉夜姬)
      </div>
      <div class="lineup-purpose">机制：丑女草人稳定连线下咒 + 雪御前 783% 单体高频爆发 + 草总针女补刀兼群奶保命</div>
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
          <td><strong>R 丑时之女</strong><br><span style="color:#94a3b8;font-size:11px;">单体草人传导</span></td>
          <td>
            招财猫 4 + 散件<br>
            <span class="stat-hl">速度 +57 超车晴明</span><br>
            <span class="crit-hl">命中 58.3% 稳定下咒</span>
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
          <td><strong>SP 渺念萤草</strong><br><span style="color:#ff5376;font-size:11px;">长线副C+群奶</span></td>
          <td>
            针女 4 + 狂骨/阴摩罗<br>
            <span class="crit-hl">暴击 113.5% 超满暴</span><br>
            <span class="stat-hl">暴伤 194.2%</span> ｜ 攻击 8052.8
          </td>
          <td>
            <span class="slot-tag">1号</span> 阴摩罗 [65a2a31db26f2214370c68a3] 暴伤18.8% 暴2.8% &nbsp;
            <span class="slot-tag">2号</span> 狂骨 [65a54c0eb26f221437252012] 攻加55% 暴10.2%<br>
            <span class="slot-tag">3号</span> 针女 [5aa0a4a22b33a2684a67f03e] 暴5.5% 暴伤7.6% &nbsp;
            <span class="slot-tag">4号</span> 针女 [5aa555e32b33a2684a7a69af] 攻加55%<br>
            <span class="slot-tag">5号</span> 针女 [5a99feba2b33a20419710f3c] 暴伤14.6% &nbsp;
            <span class="slot-tag">6号</span> 针女 [5acf701f2b33a2095ceb03b7] <strong>主暴击 55.0%</strong> 攻加8.1%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- SECTION 3 -->
<div class="section">
  <div class="section-title">三、未来行动路线与验收标准对比 (策略二专属)</div>
  <div class="timeline-grid">
    <div class="timeline-box">
      <div class="timeline-title"><span class="badge badge-purple">前 7 天</span> 雪御前极速成型</div>
      <ul class="timeline-list">
        <li><strong>白蛋升星</strong>：消耗 10 只 5 星白蛋，将 <strong>SSR 季</strong> 与 <strong>SP 渺念萤草</strong> 直接升至 6 星满级 (雪御前已 6 星无需升)。</li>
        <li><strong>黑蛋倾斜</strong>：<strong>11 颗黑蛋全部喂给 SSR 季</strong>，达成大招满级的全盛体季；雪御前 [3,3,5] 3技能已满零黑蛋消耗。</li>
        <li><strong>御魂移交</strong>：将实打实满暴的破势套 (攻9209 / 暴102.96% / 伤233.5%) 交由雪御前佩戴，彻底激活全游最高攻击力与单群复合输出。</li>
      </ul>
      <div class="goal-box">
        <strong>🎯 7 天验收指标：</strong><br>
        1. 魂土速刷：雪御前锁 3 技能先手秒杀三层，单局直接压缩至 <strong>12～13 秒</strong>。<br>
        2. 活动高星爬塔：季+雪御前+不见岳，5 秒内全自动清扫 10 星难度。
      </div>
    </div>

    <div class="timeline-box">
      <div class="timeline-title"><span class="badge badge-blue">前 30 天</span> 首领狂歌与长线冲榜</div>
      <ul class="timeline-list">
        <li><strong>首领御魂升级</strong>：强化荒骷髅 1/3 号位与鬼灵歌伎 6 号位暴伤至 +15，探索雪御前「狂骨+歌伎」极致逢魔打桩套。</li>
        <li><strong>百鬼拼清姬</strong>：凑齐 40 片 SR 清姬碎片升 5 星带雪幽魂，配合雪御前与季，长线怪物防御彻底清零。</li>
        <li><strong>备用轮换</strong>：须佐之男与玉藻前作为二队备用，日常无需频繁换御魂，操作体验极简。</li>
      </ul>
      <div class="goal-box">
        <strong>🎯 30 天验收指标：</strong><br>
        1. 逢魔之时 (全Boss)：雪御前+丑女+草总阵容，单局轻松打穿 <strong>4500 万+</strong> 顶分印记。<br>
        2. 探索狗粮：雪御前一刀带四白蛋秒杀困 28，彻底退休玉藻前。
      </div>
    </div>
  </div>
</div>

<div class="footer">
  网易《阴阳师》策略二：雪御前核心降维规划 ｜ 数据快照 20261020-155636 ｜ 严格基于 2025.09~2026 最新式神实测
</div>

</body>
</html>
`;

async function main() {
  const htmlPath = path.resolve(__dirname, 'plan_v2_fixed.html');
  const imgPath = path.resolve(__dirname, '../阴阳师_雪御前核心新策略规划.png');
  fs.writeFileSync(htmlPath, htmlContent);

  const chrome = spawn('google-chrome-stable', [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-sandbox'
  ]);
  
  await new Promise(r => setTimeout(r, 800));

  const version = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9227/json/version', res => {
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
    http.get('http://127.0.0.1:9227/json/list', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });

  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('plan_v2_fixed.html'));
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
