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
- **跨机器可移植**：整个运行栈通过 Nix 描述声明，推送到 Git 仓库后，其他 Linux 设备一键克隆即可运行。

---

## 版本说明与安装注意

网易官方提供了两种不同的 PC 端体验形式：

### 1. 官方原生 PC 桌面互通版 (推荐)
- **引擎**：网易自研 NeoX 原生游戏引擎（非模拟器，纯原生 Windows DirectX 客户端）。
- **Linux/Wine 兼容性**：**完美兼容**。Direct3D / Vulkan 直通支持，画质满帧运行，配合本项目的中文字体与抗锯齿优化，体验极佳。
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
| `nix run . -- --desktop` | 启用 Wine 虚拟桌面启动 (推荐平铺窗口管理器 Mango/Hyprland 使用，防止窗口挤压) |
| `nix run . -- --desktop 1280x720` | 自定义虚拟桌面分辨率 (默认: 1920x1080) |
| `nix run . -- --status` | 查看当前隔离环境初始化状态、安装路径与磁盘占用 |
| `nix run . -- --install` | 强制重新启动官方安装程序 |
| `nix run . -- --installer <路径>` | 使用本地已有的安装包运行安装 |
| `nix run . -- --winecfg` | 打开该独立容器的 Wine 图形配置面板 |
| `nix run . -- --regedit` | 打开该独立容器的 Windows 注册表编辑器 |
| `nix run . -- --winetricks <组件>` | 在当前独立容器内运行 winetricks 安装组件 |
| `nix run . -- --clean` | 删除并清空当前独立容器及所有游戏数据（不留系统残留） |
| `nix run . -- --help` | 查看详细帮助信息 |

---

## 环境变量配置

可在启动前指定环境变量微调运行表现：

```bash
# 自定义数据存储目录
export YYS_DATA_DIR="/path/to/custom_storage"

# 设置 Wine 渲染 DPI (如 96 为 100%, 120 为 125%, 144 为 150%)
export YYS_DPI=120

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
