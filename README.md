# 阴阳师桌面版 (Onmyoji Desktop / Nix)

基于 Nix Flake 与 Wine 深度隔离封装的网易《阴阳师》桌面版运行环境。

官方源地址：[阴阳师桌面版 (MuMu专版)](https://adl.netease.com/d/g/a11/c/yxyys_mumu12)

---

## 核心特性

- **开箱即用**：在新电脑上仅需 `nix run`，自动拉取运行依赖（Wine、字体、工具链），未安装时自动下载官方安装包并引导安装。
- **中文字体深度优化**：
  - 自动注入高质量开源中文字体（思源黑体 `Noto Sans CJK SC` 及文泉驿正黑）；
  - 自动创建 Windows 核心字体软链接（`msyh.ttc`、`simsun.ttc`、`simhei.ttf` 等）；
  - 自动导入 Wine 字体替换映射表（`FontSubstitutes` 与 `Replacements`），彻底杜绝方块字、乱码与字体缺失；
  - 启用 LCD 字体平滑抗锯齿（FontSmoothing），字体清晰锐利。
- **系统零污染与完全隔离**：
  - 独立独立的 `WINEPREFIX`，不干扰用户全局 `~/.wine` 或其他 Wine 游戏配置；
  - 禁用 `winemenubuilder`，禁止向宿主 Linux 桌面写入 `.desktop` 图标及篡改系统文件 MIME 关联；
  - 数据默认存储在 `$XDG_DATA_HOME/yys`（即 `~/.local/share/yys`），卸载只需一行命令清理该目录；
  - 支持便携模式（数据保存在当前仓库目录下的 `.data/`）。
- **游戏级渲染与多线程优化**：
  - 自动集成 **DXVK 2.x**（DirectX 11 -> Vulkan 高性能转换），彻底告别 Wine 自带 WineD3D (OpenGL) 的低帧率与着色器报错；
  - 自动启用 **FSync / ESync**（futex 内核级线程同步），绕过 wineserver 锁争用，大幅减少多线程微卡顿（Stuttering）；
  - 着色器与管线磁盘缓存（Shader Disk Cache + DXVK State Cache）自动持久化在独立数据目录下，消除战斗中即时编译卡顿；
  - 支持一键开启 DXVK HUD 性能监视器查看实时帧率与显卡开销。
- **跨机器可移植**：整个运行栈通过 Nix 描述声明，推送到 Git 仓库后，其他 Linux 设备一键克隆即可运行。

---

## 版本说明与安装注意

网易官方提供了两种不同的 PC 端体验形式：

### 1. 官方原生 PC 桌面互通版 (推荐)
- **引擎**：网易自研 NeoX 原生游戏引擎（非模拟器，纯原生 Windows DirectX 客户端）。
- **Linux/Wine 兼容性**：可通过 Wine 运行，具体渲染及登录表现取决于 Wine 版本、显卡驱动与客户端更新；不保证所有环境均兼容。
- **获取方式**：
  官方高防 CDN 免安装压缩包：[yys_win32_20250919.zip](https://g37.gdl.netease.com/yys_win32_20250919.zip) (约 19.8 GB)。
  下载完成后，使用一条命令导入即可直接启动：
  ```bash
  nix run . -- --import /path/to/yys_win32_20250919.zip
  ```
  或者将已解压的客户端文件夹导入：
  ```bash
  nix run . -- --import /path/to/Onmyoji_Directory
  ```

### 2. MuMu 模拟器专版 (`yxyys_mumu12`)
- **引擎**：Windows 版 MuMu 12 Android 模拟器。
- **Linux/Wine 兼容性**：在点击安装时可能会提示 **“安装出错，错误码: 13 / 11001”**。
  - **根因分析**：MuMu 模拟器底层依赖 `MuMuNxSup.sys` 等 Windows Ring 0 内核级硬件虚拟化驱动（魔改自 VirtualBox/Hyper-V 内核模块）。Linux 下的 Wine 作为用户态系统调用兼容层，无法加载 Windows 内核驱动（日志报 `sc query MuMuNxSup ... RUNNING failure`，`DoInstallHypervisor: failed`）。
  - **建议**：在 Linux 下请直接使用上述**原生 PC 桌面互通版**，无需也不建议使用安卓模拟器套壳。

### 1. 启动游戏 / 首次安装

在项目根目录下直接运行：

```bash
nix run
```

- **初次运行**：自动下载官方安装包并打开图形安装向导，根据提示点击“立即安装”即可。
- **后续运行**：自动识别已安装的客户端路径并直接拉起游戏。

### 2. 便携模式 (适合放置于独立硬盘或移动存储)

```bash
YYS_PORTABLE=1 nix run
```

便携模式下，所有的 Wine 容器、游戏文件和缓存均保存在当前项目目录下的 `.data/` 目录中。

---

## 常用命令与选项

可通过传递命令行参数控制启动行为：

| 命令 | 说明 |
| :--- | :--- |
| `nix run` | 直接启动游戏 (默认在当前桌面以原生独立悬浮窗口运行，无需虚拟桌面) |
| `nix run . -- --desktop` | 选用 Wine 虚拟桌面模式启动 (默认 1920x1080) |
| `nix run . -- --desktop 1280x720` | 自定义虚拟桌面分辨率 |
| `nix run . -- --hud` | 启用 DXVK 实时性能监视面板 (查看实时帧率 FPS、GPU 负载、显存) |
| `nix run . -- --no-dxvk` | 禁用 DXVK，回退到 Wine 自带的 WineD3D (OpenGL) 渲染 |
| `nix run . -- --dxvk-install` | 强制重新部署/更新容器内的 DXVK DLL 软链接 |
| `nix run . -- --dxvk-uninstall` | 卸载容器内的 DXVK，恢复 Wine 原生渲染 DLL |
| `nix run . -- --status` | 查看当前隔离环境初始化状态、DXVK/FSync 状态与磁盘占用 |
| `nix run . -- --install` | 强制重新启动官方安装程序 |
| `nix run . -- --installer <路径>` | 使用本地已有的安装包运行安装 |
| `nix run . -- --winecfg` | 打开该独立容器的 Wine 图形配置面板 |
| `nix run . -- --regedit` | 打开该独立容器的 Windows 注册表编辑器 |
| `nix run . -- --winetricks <组件>` | 在当前独立容器内运行 winetricks 安装组件 |
| `nix run . -- --clean` | 删除并清空当前独立容器及所有游戏数据（不留系统残留） |
| `nix run . -- --help` | 查看详细帮助信息 |

---

## 启动白屏排查

原生客户端的 `bin/onmyoji.exe` 必须以客户端根目录作为工作目录。启动器会识别上层的 `neox.xml` 与 `res/`，从根目录运行；普通启动、`--run`、虚拟桌面和导入后的启动使用同一逻辑。

不要进入 `client/bin` 后直接运行 `wine onmyoji.exe`，也不要仅靠补配置软链接修复。错误工作目录会导致日志出现 `bin/bin/res_render3.npk`、`cloud.json` 或 `thd/*.thx` 加载失败，以及核心着色器 `simpletech.nfx` 缺失，最终卡在白屏。客户端日志位于数据目录的 `client/Documents/log/`。

## 场景切换与转场卡顿排查 (耗时过长修复)

若遇到**每次切换场景、进入庭院、副本或阴阳寮时转场时间极长（黑屏或纸人加载卡数秒）**，核心原因及本项目的自动化解决方案如下：

1. **Direct3D 着色器编译器缺失 (最主要卡顿源)**：
   - **根因**：转场淡入淡出、全屏后处理（`UberPost.hlsl`、高斯模糊、Bloom）需要运行时 HLSL 编译。Wine 自带的内建（builtin）`d3dcompiler_47.dll` 无法编译这些 Shader，导致单次转场卡死 2~3 秒，并向 `log.txt` 同步 dump 数万行代码，频繁冲爆 2MB 日志触发轮转与磁盘 I/O 阻塞。
   - **修复**：启动器已自动将客户端内置的微软原生 `d3dcompiler_47.dll`、`D3DCompiler_43.dll` 软链注入容器 `system32`，并通过 `WINEDLLOVERRIDES` 和注册表优先加载原生 DLL，转场 Shader 编译直接提速至毫秒级。
2. **NeoX 本地着色器缓存关闭**：
   - **根因**：原版 `neox.xml` 默认 `UseShaderCache = 'False'`，每次转场均放弃本地已编译缓存，强制重新解析。
   - **修复**：启动器自动将 `UseShaderCache` 修复为 `'True'`，编译结果持久化至本地，二次转场秒进。
3. **默认帧率锁 30 FPS 导致转场动画时长翻倍**：
   - **根因**：阴阳师 UI 和转场补间动画为基于帧数步进（Frame-based），默认 30 帧下所有转场动画播放时长翻倍。
   - **修复**：启动器自动将 `clientconfig` 帧率设定提升至 60 帧（`frame_rate=2`），转场过渡体验大幅提速。
4. **DXVK 异步管线加载与驱动直通**：
   - 自动生成 `dxvk.conf` 启用异步管线编译（`dxvk.enableAsync = true`、`dxvk.gpl = true`）并解除 VSync 限制，配合 NVIDIA 硬件 Vulkan ICD 穿透，彻底消除掉帧。

## 平铺桌面 (Mango / Hyprland) 浮动与登录后方黑框排查

网易 PC 登录扫码组件（UniSDK）在 Windows 下会伴随创建一个不接受输入的半透明阴影分层窗口（`WS_EX_LAYERED`，无标题）。在 Linux XWayland 环境下，平铺合成器（如 Mango）容易将其作为独立顶级窗口捕获并绘制边框（显示为 `title: broken` 的黑色方框垫在登录框后方）。

若使用 Mango，在 `rule.conf` 中追加以下规则即可彻底消除后方黑框：

```ini
# 游戏主窗口及扫码浮动
window_rule=is_floating:1,title:(?i).*(阴阳师|onmyoji).*
window_rule=is_floating:1,app_id:(?i).*onmyoji.*
window_rule=is_floating:1,app_id:(?i).*launch.*

# 屏蔽登录框后方的幽灵阴影/分层背景窗口
window_rule=no_blur:1,is_floating:1,no_border:1,is_unmanaged_global:1,offset_x:9999,offset_y:9999,app_id:(?i).*onmyoji.*,title:broken
```

## 环境变量配置

可在启动前指定环境变量微调运行表现：

```bash
# 自定义数据存储目录
export YYS_DATA_DIR="/path/to/custom_storage"

# 设置 Wine 渲染 DPI (如 96 为 100%, 120 为 125%, 144 为 150%)
export YYS_DPI=120

# 开启 DXVK 性能监控 HUD (显示 FPS、显卡型号、GPU 负载与显存)
export YYS_HUD=1

# 若遇到特定渲染异常，可强制禁用 DXVK 回退至 WineD3D (OpenGL)
# export YYS_NO_DXVK=1

# 禁用内核 FSync / ESync 线程同步加速
# export YYS_NO_FSYNC=1
# export YYS_NO_ESYNC=1

# 开启 Wine 调试日志
export YYS_WINEDEBUG="warn+all,err+all"
```

---

## 其他电脑使用方法

1. 确保目标电脑已安装 Nix 并启用了 Flakes：
   ```bash
   # 查看 nix flake 支持情况
   nix flake --version
   ```
2. 克隆本仓库并直接运行：
   ```bash
   git clone <你的仓库地址> yys
   cd yys
   nix run
   ```
   也可以无需 clone 直接远端启动：
   ```bash
   nix run git+https://github.com/<你的用户名>/yys
   ```
