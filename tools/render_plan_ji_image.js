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
    background: #0a0e17;
    color: #e2e8f0;
    font-family: 'Noto Sans CJK SC', 'PingFang SC', -apple-system, sans-serif;
    padding: 36px 40px;
    width: 1280px;
    margin: 0 auto;
    line-height: 1.5;
  }
  
  /* Header */
  .header {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
    border: 1px solid rgba(245, 158, 11, 0.45);
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
    background: linear-gradient(90deg, #f59e0b, #10b981, #38bdf8);
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
  .badge-gold { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
  .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); }
  .badge-blue { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); }
  .badge-red { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); }

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
  .stat-value.gold { color: #f59e0b; }
  .stat-value.green { color: #10b981; }
  .stat-value.blue { color: #38bdf8; }

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
    background: #f59e0b;
    border-radius: 2px;
  }

  /* Core Mechanism Banner */
  .mech-banner {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 18px;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 18px;
  }
  .mech-card h4 {
    font-size: 14px;
    font-weight: 700;
    color: #fbbf24;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .mech-card p {
    font-size: 12.5px;
    color: #cbd5e1;
    line-height: 1.5;
  }

  /* Resource Plan Box */
  .feed-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 16px;
  }
  .feed-step-card {
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 14px;
  }
  .step-num {
    font-size: 11px;
    font-weight: 700;
    color: #f59e0b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .step-title {
    font-size: 14px;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 6px;
  }
  .step-desc {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.45;
  }

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
  .crit-hl { color: #f59e0b; font-weight: 600; font-family: monospace; }
  .green-hl { color: #34d399; font-weight: 600; font-family: monospace; }

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
    color: #f59e0b;
    font-size: 16px;
    line-height: 1;
  }
  .goal-box {
    margin-top: 12px;
    padding: 10px 12px;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: 6px;
    font-size: 12px;
    color: #fde68a;
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
      <h1>阴阳师 · SSR 季专属战略落地图与资源投喂指南</h1>
      <p>角色：帅气的佳安 ｜ 服务器：依偎相守 ｜ 角色编号：18083 ｜ 玩家等级：60</p>
    </div>
    <div class="tag-group">
      <span class="badge badge-gold">破局核心：SSR 季（四时之神）</span>
      <span class="badge badge-green">痛点克星：无视高防 800~1200 / 0暴击需求</span>
      <span class="badge badge-blue">黑蛋配给：11 颗黑蛋 100% 独享倾注</span>
      <span class="badge badge-red">实装目标：活动 10 星爬塔秒杀 / 秘闻通关</span>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-label">季当前库存状态</div>
      <div class="stat-value gold">2星 Lv.1 [1,1,1]</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">黑蛋可分配储备</div>
      <div class="stat-value gold">11 颗 (全投季)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">季最终暴伤面板</div>
      <div class="stat-value green">312.1% (极品)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">季最终攻击面板</div>
      <div class="stat-value blue">7279.4 点</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">所需暴击要求</div>
      <div class="stat-value">0% (完全不吃暴击)</div>
    </div>
  </div>
</div>

<!-- SECTION 1 -->
<div class="section">
  <div class="section-title">一、为什么季是你当前库存的「唯一真神」？（机制透析）</div>
  
  <div class="mech-banner">
    <div class="mech-card">
      <h4>🍂 机制真相：活动高星打不动的本质原因与季的降维打击</h4>
      <p>
        大型活动 8～10 星怪物的防御力高达 <strong>800～1200 点</strong>，普通暴击输出（如葛叶、须佐、妖刀）打上去会被怪物基础减伤削减 75% 以上，没有顶级破防拐打上去就是“刮痧”。<br>
        <strong>SSR 季的超模本质：</strong>季的伤害属于<strong>间接伤害/岁时机制</strong>，直接无视怪物高额防御！怪物护甲再高，在季面前等同于“裸奔”，进场直接融化全屏！
      </p>
    </div>
    <div class="mech-card">
      <h4>⚡ 零门槛配装：为什么你的御魂库能完美适配季？</h4>
      <p>
        常规输出（如须佐/雪御前/葛叶）必须拼命凑满 100% 暴击，副属性一旦少几点暴击就无法成套。<br>
        <strong>季彻底解放暴击：</strong>季的暴击率固定为 0%，暴击属性完全无需堆叠！你库存中那些<strong>空有 20%+ 高暴伤、高攻击加成，但“副属性没暴击”的极品孤品御魂</strong>，全部可以毫无保留地给季穿上，直接拼出 <strong>312.1% 的怪物级暴伤</strong>！
      </p>
    </div>
  </div>

  <div class="section-title" style="font-size:16px;margin-top:16px;">🎯 季的精准资源投喂三步法</div>
  <div class="feed-steps">
    <div class="feed-step-card">
      <div class="step-num">Step 01 ｜ 白蛋升星</div>
      <div class="step-title">从 2 星直升 6 星满级 (Lv.40)</div>
      <div class="step-desc">
        使用库存的 51 只 2 星满级白蛋 + 蓝蛋，快速升出 10 只 5 星白蛋。将季直接升至 6 星 40 级，解锁全额基础攻击面板。
      </div>
    </div>

    <div class="feed-step-card">
      <div class="step-num">Step 02 ｜ 黑蛋精准喂养</div>
      <div class="step-title">11 颗黑蛋一次性全喂季</div>
      <div class="step-desc">
        11 颗黑蛋全部喂下！重点锁定将 <strong>二技能「四时之韵」</strong> 与 <strong>三技能「弥梦之舞」</strong> 升至 5 级满级，解锁四季自动释放与终极真伤。
      </div>
    </div>

    <div class="feed-step-card">
      <div class="step-num">Step 03 ｜ 御魂一键装配</div>
      <div class="step-title">装配 312% 暴伤破势 4+散件</div>
      <div class="step-desc">
        严格按照下方清单录入 6 个专属御魂 ID，零冲突直接成型，立刻获得 7279 攻击 + 312% 暴伤的完全体战神季。
      </div>
    </div>
  </div>
</div>

<!-- SECTION 2 -->
<div class="section">
  <div class="section-title">二、SSR 季专属配装：破势 4+散件极品高暴伤套 (御魂ID严格唯一)</div>

  <div class="lineup-block">
    <div class="lineup-header">
      <div class="lineup-title">
        <span class="badge badge-gold">核心配装</span> 破势 4 件套 + 阴摩罗/招财散件 (纯攻攻暴伤 · 0暴击需求)
      </div>
      <div class="lineup-purpose">实测面板：攻击 7279.4 ｜ 暴伤 312.1% ｜ 破势 40% 首轮乘区 ｜ 综合伤害期望分：31810.6</div>
    </div>
    <table class="custom-table">
      <thead>
        <tr>
          <th width="12%">位置 / 套装</th>
          <th width="16%">主属性 (+15)</th>
          <th width="42%">副属性构成与数值亮点</th>
          <th width="30%">御魂唯一 ID</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="slot-tag">1号位</span> <strong>破势</strong></td>
          <td>攻击 486.0</td>
          <td><span class="crit-hl">暴击伤害 +14.8%</span> ｜ 速度 +0 ｜ 纯暴伤极品件</td>
          <td><span class="stat-hl">5a6df47b2b33a2585da824c6</span></td>
        </tr>
        <tr>
          <td><span class="slot-tag">2号位</span> <strong>破势</strong></td>
          <td>攻击加成 55.0%</td>
          <td><span class="crit-hl">暴击伤害 +6.8%</span> ｜ 攻击加成 +0% ｜ 速度 +8.4</td>
          <td><span class="stat-hl">5b0442642989086e1314da2b</span></td>
        </tr>
        <tr>
          <td><span class="slot-tag">3号位</span> <strong>阴摩罗</strong></td>
          <td>防御 104.0</td>
          <td><span class="crit-hl">暴击伤害 +22.8% (全家最高副暴伤)</span> ｜ 散件神件</td>
          <td><span class="stat-hl">65a7fb453ab52c6023f2432e</span></td>
        </tr>
        <tr>
          <td><span class="slot-tag">4号位</span> <strong>破势</strong></td>
          <td>攻击加成 55.0%</td>
          <td><span class="crit-hl">暴击伤害 +14.6%</span> ｜ 攻击加成 +0% ｜ 稳定破势核心</td>
          <td><span class="stat-hl">5aa7b2fb2b33a2684a8111e0</span></td>
        </tr>
        <tr>
          <td><span class="slot-tag">5号位</span> <strong>破势</strong></td>
          <td>生命 2052.0</td>
          <td><span class="crit-hl">暴击伤害 +14.2%</span> ｜ 激活破势 4 件套 40% 增伤</td>
          <td><span class="stat-hl">5b0433952989086e1314a20a</span></td>
        </tr>
        <tr>
          <td><span class="slot-tag">6号位</span> <strong>招财猫</strong></td>
          <td>暴击伤害 89.0%</td>
          <td><span class="green-hl">攻击加成 +10.89%</span> ｜ 暴伤 +0% ｜ 主暴伤高攻副件</td>
          <td><span class="stat-hl">5ac1bab03119ac5e7e2c842f</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- SECTION 3 -->
<div class="section">
  <div class="section-title">三、以季为绝对核心的实战阵容搭配 (现有库存完美组建)</div>

  <!-- 阵容 1 -->
  <div class="lineup-block">
    <div class="lineup-header">
      <div class="lineup-title">
        <span class="badge badge-gold">阵容一 · 攻坚王牌</span> 活动爬塔 10 星秒杀队 (季 + 不见岳 + 山兔 + 座敷 + 狗粮/雪御前)
      </div>
      <div class="lineup-purpose">定位：解决你“活动高星打不动”的最大痛点。全自动 5～8 秒一局，无视任何词缀与护甲</div>
    </div>
    <table class="custom-table">
      <thead>
        <tr>
          <th width="15%">式神</th>
          <th width="18%">推荐御魂配置</th>
          <th width="20%">配速与操作</th>
          <th width="47%">实战机制与分工</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>R 山兔</strong></td>
          <td>散件一速 (薙魂 2号速 +70)</td>
          <td>一速 (速 > 158)</td>
          <td>先手兔子舞拉条，保证全队先于怪物出手。</td>
        </tr>
        <tr>
          <td><strong>R 座敷童子</strong></td>
          <td>火灵 4 件套</td>
          <td>二速 (速 > 130)</td>
          <td>开局提供满火 (8火)，保障不见岳与季无阻释放大招。</td>
        </tr>
        <tr>
          <td><strong>SSR 不见岳</strong></td>
          <td>日女 2+散件纯防御 (+246%)</td>
          <td>三速 (在季之前)</td>
          <td>大招开启结界，根据自身纯防御为季提供极高额的基础攻击加成。</td>
        </tr>
        <tr>
          <td><strong>阴阳师 晴明</strong></td>
          <td>带「灭」或「星」</td>
          <td>四速</td>
          <td>晴明施放灭增加受击伤害，或直接锁星。</td>
        </tr>
        <tr>
          <td><strong>SSR 季</strong></td>
          <td>破势 4+散件 (暴伤 312%)</td>
          <td>五速 (锁三技能春/秋)</td>
          <td><strong>绝对毁灭核心</strong>：四季轮转间接真伤爆发，无视怪物 1000+ 防御，直接全屏清场！</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 阵容 2 -->
  <div class="lineup-block">
    <div class="lineup-header">
      <div class="lineup-title">
        <span class="badge badge-green">阵容二 · 秘闻逃课</span> 秘闻副本 10 层全通逃课队 (季 + 椒图 + 不见岳 + 日和坊/蜜桃 + 座敷)
      </div>
      <div class="lineup-purpose">定位：全通所有主流秘闻 10 层，拿齐黑蛋与勾玉。季的间伤不触发敌方反击/护盾机制</div>
    </div>
    <table class="custom-table">
      <thead>
        <tr>
          <th width="15%">式神</th>
          <th width="18%">推荐御魂配置</th>
          <th width="20%">配速与操作</th>
          <th width="47%">实战机制与分工</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>R 椒图</strong></td>
          <td>地藏像 / 招财 (速生生)</td>
          <td>一速</td>
          <td>涓流分摊全队伤害，保全员生存不暴毙。</td>
        </tr>
        <tr>
          <td><strong>SSR 不见岳</strong></td>
          <td>散件纯防加攻</td>
          <td>二速</td>
          <td>提供超高攻击结界与全队减伤光环。</td>
        </tr>
        <tr>
          <td><strong>SR 日和坊</strong></td>
          <td>树妖 / 散件生生暴</td>
          <td>三速</td>
          <td>敌方行动后群奶，队友阵亡立即复活。</td>
        </tr>
        <tr>
          <td><strong>SSR 季</strong></td>
          <td>破势 4+散件 (暴伤 312%)</td>
          <td>核心输出 (锁三技能)</td>
          <td>季的间接伤害不触发秘闻 Boss 的反击与镜姬词缀，安稳全自动推平 10 层！</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- SECTION 4 -->
<div class="section">
  <div class="section-title">四、季核心战略落地时间表与验收标准</div>
  <div class="timeline-grid">
    <div class="timeline-box">
      <div class="timeline-title"><span class="badge badge-gold">前 7 天</span> 季神降临·痛点彻底消灭</div>
      <ul class="timeline-list">
        <li><strong>今日动作</strong>：合成 10 只 5 星白蛋，将 SSR 季升至 6 星 40 级。</li>
        <li><strong>技能投喂</strong>：<strong>11 颗黑蛋全额喂给季</strong>，重点达成二、三技能 5 级满级。</li>
        <li><strong>一键装配</strong>：换装上述 6 件 +15 破势套，形成攻击 7279、暴伤 312.1% 完全体。</li>
      </ul>
      <div class="goal-box">
        <strong>🎯 7 天验收指标：</strong><br>
        1. 立即前往当前大型活动爬塔，直接挑战 <strong>10 星最高难度</strong>，验证山兔+座敷+不见岳+季 <strong>5 秒秒杀全场</strong>。<br>
        2. 测试秘闻副本 9～10 层，体验季无视反伤全自动逃课通关。
      </div>
    </div>

    <div class="timeline-box">
      <div class="timeline-title"><span class="badge badge-green">前 30 天</span> 首领荒骷髅进阶·伤害再提 25%</div>
      <ul class="timeline-list">
        <li><strong>首领御魂升级</strong>：将现有 <strong>荒骷髅 1号位</strong> [6accb250...] 与 <strong>荒骷髅 3号位</strong> [6acfbadf...] 强化至 +15。</li>
        <li><strong>终极形态换装</strong>：将季升级为 <strong>破势 4 + 荒骷髅 2</strong>，在保留 300%+ 暴伤基础上额外获得 <strong>25% 独立增伤乘区</strong>。</li>
        <li><strong>资源循环启动</strong>：依靠季在各大活动中拿满全部资源，开启神无月的黑蛋储备计划。</li>
      </ul>
      <div class="goal-box">
        <strong>🎯 30 天验收指标：</strong><br>
        1. 活动商店所有勾玉、蓝票、高阶御魂门票全部轻松搬空。<br>
        2. 全面打通卡住的秘闻 10 层副本，稳拿全部副本黑蛋。
      </div>
    </div>
  </div>
</div>

<div class="footer">
  网易《阴阳师》SSR 季核心落地指南 ｜ 数据快照源自 20261020-155636 ｜ 严格基于无视防御间伤机制测算
</div>

</body>
</html>
`;

async function main() {
  const htmlPath = path.resolve(__dirname, 'plan_ji.html');
  const imgPath = path.resolve(__dirname, '../阴阳师_季核心战略落地图.png');
  fs.writeFileSync(htmlPath, htmlContent);

  const chrome = spawn('google-chrome-stable', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-sandbox'
  ]);
  
  await new Promise(r => setTimeout(r, 800));

  const version = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9226/json/version', res => {
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
    http.get('http://127.0.0.1:9226/json/list', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });

  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('plan_ji.html'));
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
