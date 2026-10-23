# 阴阳师桌面版 (Onmyoji Desktop / Nix)

基于 Nix Flake 与 Wine 深度隔离封装的网易《阴阳师》桌面版运行环境。全自动化安装、多显卡通用驱动穿透、中文字体渲染优化与独立隔离。

---

## 核心特性

- **开箱即用与全自动部署**：
  在新电脑上仅需 `nix run`，自动拉取运行依赖（Wine-Staging、DXVK、字体、工具链）。
  - **智能本地缓存**：自动扫描项目目录、上级目录及系统下载目录中的离线压缩包（如 `onmyoji.zip`），一键自动解压和配置；
  - **自动断点续传**：未检测到本地包时，全自动通过网易官方 CDN 断点续传下载原生 PC 客户端，无需任何手动介入；
  - **全自动环境优化**：自动修补 NeoX 引擎着色器持久化、提升 60 帧、部署微软原生 Direct3D 编译器与 DXVK 异步渲染。
- **系统桌面集成 (Desktop Entry)**：
  - 自动向桌面环境 (`~/.local/share/applications` 及 `icons`) 注册标准应用入口与 256x256 高清官方图标；
  - 启动器（GNOME、KDE、Rofi、Wofi 等）可直接搜索“阴阳师”或“Onmyoji”一键启动。
- **全显卡通用兼容 (AMD / Intel / NVIDIA)**：
  - **非 NVIDIA 专用**：底层采用标准 Vulkan (DXVK 2.x) 与 Wine-Staging，原生支持 AMD (RADV)、Intel (ANV/Iris) 与 NVIDIA 显卡；
  - 智能穿透宿主 GPU 驱动（包括 NixOS 的 `/run/opengl-driver`）并自动启用对应驱动的磁盘着色器缓存（Mesa 与 NVIDIA 均独立持久化）；
  - 完美支持双显卡笔记本（可用 `DRI_PRIME=1` 或 `prime-run` 自由切换）及各类掌机设备。
- **中文字体深度优化**：
  - 自动注入高质量开源中文字体（思源黑体 `Noto Sans CJK SC` 及文泉驿正黑）；
  - 自动创建 Windows 核心字体软链接（`msyh.ttc`、`simsun.ttc`、`simhei.ttf` 等）；
  - 自动导入 Wine 字体替换映射表（`FontSubstitutes` 与 `Replacements`），彻底杜绝方块字、乱码与字体缺失；
  - 启用 LCD 字体平滑抗锯齿（FontSmoothing），字体清晰锐利。
- **系统零污染与完全隔离**：
  - 独立的 `WINEPREFIX`，不干扰用户全局 `~/.wine` 或其他游戏配置；
  - 禁用 `winemenubuilder`，禁止篡改系统 MIME 关联；
  - 数据默认存储在 `$XDG_DATA_HOME/onmyoji`（即 `~/.local/share/onmyoji`），卸载只需删除该目录；
  - 支持便携模式（数据保存在当前仓库目录下的 `.data/`）。
- **游戏级渲染与多线程优化**：
  - **DXVK 2.x**：DirectX 11 -> Vulkan 高性能转换；
  - **FSync / ESync**：futex 内核级线程同步，绕过 wineserver 锁争用，大幅减少多线程卡顿；
  - **微软原生 Shader 编译器**：自动挂载原生 `d3dcompiler_47.dll`，转场与场景切换加载提速至毫秒级。

---

## 快速使用

### 1. 首次启动与全自动安装

在克隆的项目目录下直接运行：

```bash
nix run
```

- **存在本地压缩包时**：若当前目录或下载目录已有 `onmyoji.zip`，启动器将自动解压、部署并拉起游戏；
- **全新机器无离线包时**：启动器会自动从网易官方 CDN 下载原生 PC 互通版压缩包并自动部署；
- 部署完成后将自动注册桌面图标，后续可在应用菜单中直接点击启动。

### 2. 便携模式 (适合放置于移动硬盘或独立路径)

```bash
ONMYOJI_PORTABLE=1 nix run
```

便携模式下，所有的 Wine 容器、游戏客户端和缓存均保存在当前项目目录下的 `.data/` 中，拷贝至任意 Linux 设备插上即可直接运行。

### 3. 一键导出缓存 (方便带到其他电脑)

当当前电脑已安装好客户端后，可一键将其打包导出为离线缓存包：

```bash
nix run . -- --export-cache /path/to/onmyoji.zip
```

在另一台电脑上只需将该 `onmyoji.zip` 放在项目目录，运行 `nix run` 即刻秒级完成部署，无需重新下载。

---

## 常用命令与选项

可通过传递命令行参数控制启动行为：

| 命令 | 说明 |
| :--- | :--- |
| `nix run` | 直接启动游戏 (默认在当前桌面以原生独立窗口运行) |
| `nix run . -- --desktop` | 选用 Wine 虚拟桌面模式启动 (默认 1920x1080) |
| `nix run . -- --desktop 1280x720` | 自定义虚拟桌面分辨率 |
| `nix run . -- --desktop-entry` | 手动在系统应用菜单中重新安装/更新桌面快捷方式与图标 |
| `nix run . -- --hud` | 启用 DXVK 实时性能监视面板 (FPS、GPU负载、显存) |
| `nix run . -- --no-dxvk` | 禁用 DXVK，回退到 Wine 自带的 WineD3D (OpenGL) 渲染 |
| `nix run . -- --dxvk-install` | 强制重新部署/更新容器内的 DXVK DLL 软链接 |
| `nix run . -- --dxvk-uninstall` | 卸载容器内的 DXVK，恢复 Wine 原生渲染 DLL |
| `nix run . -- --status` | 查看当前隔离环境初始化状态、显卡优化状态与磁盘占用 |
| `nix run . -- --import <路径>` | 手动导入指定的客户端目录或压缩包 (.zip / .7z) |
| `nix run . -- --export-cache <路径>` | 将当前就绪的客户端导出为缓存压缩包 |
| `nix run . -- --winecfg` | 打开该独立容器的 Wine 图形配置面板 |
| `nix run . -- --regedit` | 打开该独立容器的 Windows 注册表编辑器 |
| `nix run . -- --winetricks <组件>` | 在当前独立容器内运行 winetricks 安装组件 |
| `nix run . -- --clean` | 删除并清空当前独立容器及所有游戏数据（不留残留） |
| `nix run . -- --help` | 查看详细帮助信息 |

---

## 角色库存属性导出

游戏登录角色并进入庭院后，可只读导出**当前运行角色**的全部已缓存御魂（含已装备与未装备）：

```bash
python3 tools/export_current_souls.py --mappings exports/20261020-155636/name_mappings.json
# 多个客户端同时运行时增加 --pid <onmyoji.exe 的 Linux PID>
```

`--mappings` 指向已有快照的公开名称映射，仅复用名称，**不复用旧库存**。脚本从运行进程定位客户端，通过最近的成功登录日志确认角色，并对 `Documents/cache_server_data/<UUID>/inventory` 和 `heroes` 做重复一致性读取；缓存须已在本次游戏会话更新。输出至新的 `exports/<时间戳>/`，不会覆盖旧快照。没有名称映射时需先提供该 JSON，脚本不会联网获取或猜填未知御魂名称。

这是本地缓存快照，不保证包含服务器尚未同步、刷盘或加载的数据；也不是痒痒熊专用导入格式，未核验的锁定/弃置状态仅保留原始字段，不伪造默认值。导出文件与 ZIP 使用私有权限，且 `exports/` 已忽略。

对已导出的本地缓存快照离线补全御魂属性（不注入进程、不修改游戏数据）：

```bash
python3 tools/export_soul_attributes.py exports/20261020-155636
```

输入目录须含 `souls.raw.json`、`heroes.raw.json`、`name_mappings.json` 和 `manifest.json`。输出 `御魂_AI分析.json`（推荐供 AI 分析）、完整属性 `御魂.csv`、保留原始字段的 `souls.json`，并更新校验和与 ZIP。百分比统一使用百分点（55 = 55%），保留未四舍五入的速度；合计不含式神基础属性或套装效果。遇到未核验的模板或低星强化成长规则会报错，不猜测填值。个人导出目录 `exports/` 已忽略，不应提交账号库存。

## 环境变量配置

可在启动前指定环境变量微调运行表现：

```bash
# 自定义数据存储目录 (默认: ~/.local/share/onmyoji)
export ONMYOJI_DATA_DIR="/path/to/custom_storage"

# 指定离线安装包路径
export ONMYOJI_CLIENT_ARCHIVE="/path/to/onmyoji.zip"

# 设置 Wine 渲染 DPI (如 96 为 100%, 120 为 125%, 144 为 150%)
export ONMYOJI_DPI=120

# 开启 DXVK 性能监控 HUD (显示 FPS、显卡型号、GPU 负载与显存)
export ONMYOJI_HUD=1

# 若遇到特定渲染异常，可强制禁用 DXVK 回退至 WineD3D (OpenGL)
# export ONMYOJI_NO_DXVK=1

# 禁用内核 FSync / ESync 线程同步加速
# export ONMYOJI_NO_FSYNC=1
# export ONMYOJI_NO_ESYNC=1

# 开启 Wine 调试日志
export ONMYOJI_WINEDEBUG="warn+all,err+all"
```

---

## 常见问题与排查

### 1. 非 NVIDIA 显卡能否使用？
完全可以！本项目绝非 NVIDIA 专属：
- **AMD 显卡**：自动匹配 Mesa RADV 驱动，原生支持 DXVK 与异步管线着色器缓存；
- **Intel 显卡**：自动匹配 Mesa ANV / Iris 驱动；
- **NVIDIA 显卡**：自动穿透硬件驱动与 Vulkan ICD；
- **双显卡笔记本**：直接使用 `DRI_PRIME=1 nix run` 或 `prime-run nix run` 指定独立显卡运行。

### 2. 平铺桌面 (Mango / Hyprland) 浮动与登录后方黑框排查
网易 PC 登录扫码组件（UniSDK）在 Windows 下会伴随创建一个不接受输入的半透明阴影分层窗口（`WS_EX_LAYERED`，无标题）。在 Linux XWayland 环境下，平铺合成器（如 Mango）容易将其作为独立顶级窗口捕获并绘制边框。

若使用 Mango，在 `rule.conf` 中追加以下规则即可彻底消除后方黑框：

```ini
# 游戏主窗口及扫码浮动
window_rule=is_floating:1,title:(?i).*(阴阳师|onmyoji).*
window_rule=is_floating:1,app_id:(?i).*onmyoji.*
window_rule=is_floating:1,app_id:(?i).*launch.*

# 屏蔽登录框后方的幽灵阴影/分层背景窗口
window_rule=no_blur:1,is_floating:1,no_border:1,is_unmanaged_global:1,offset_x:9999,offset_y:9999,app_id:(?i).*onmyoji.*,title:broken
```

### 3. 为什么不推荐使用 MuMu 模拟器渠道包？
网易官方提供了两种不同的 PC 端形式：
1. **原生 PC 桌面互通版 (推荐)**：网易自研 NeoX 原生游戏引擎，纯原生 DirectX/Vulkan 客户端，运行流畅、无安卓模拟器性能损耗。
2. **MuMu 模拟器专版**：依赖 `MuMuNxSup.sys` 等 Windows Ring 0 内核虚拟化驱动，Wine 在 Linux 用户态无法加载该内核驱动，会报错 13 / 11001。因此本启动器默认全面自动化部署**原生 PC 桌面互通版**。

---

## 其他电脑直接引用 Flake 使用

在已启用 Nix Flakes 的其他电脑上，无需预先配置任何依赖，直接一条命令拉起：

```bash
# 方式一: 克隆仓库运行
git clone git@github.com:JIAnnLee22/onmyoji.flake.git onmyoji
cd onmyoji
nix run

# 方式二: 直接通过远端 Flake 运行
nix run github:JIAnnLee22/onmyoji.flake
```

或在其他系统的 `flake.nix` 中作为输入引用：

```nix
{
  inputs = {
    onmyoji.url = "github:JIAnnLee22/onmyoji.flake";
  };

  # 在 NixOS 或 Home Manager 中使用:
  # environment.systemPackages = [ inputs.onmyoji.packages.${system}.default ];
}
```
