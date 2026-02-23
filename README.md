# Workspace Linker

[English README](./README.en.md)

一个用于 VS Code 的工作区链接管理插件。它会扫描当前工作区子目录中的标记目录（默认 `.vscode`），并把你选中的目标目录以软链接形式挂到工作区根目录，方便统一管理项目配置。

## 背景与目标

在多项目仓库或聚合仓库（monorepo）里，经常有很多子项目各自维护 `.vscode` 目录。日常切换时，开发者希望在工作区根目录快速切换或挂接某一个子项目的 `.vscode`，而不是反复手工创建/删除软链接。

以 ROS 项目为例，Git 仓库里通常只存代码目录（例如 `src/project`），但实际开发工作区通常是 `ws/src`、`ws/build`、`ws/devel` 这样的结构。此时可以把某个子项目的 `.vscode` 链接到工作区根目录，实现调试配置（launch）、任务配置（tasks）和编辑器配置（settings）复用，避免在不同工作目录重复维护。

本插件就是为这个场景设计：
- 自动扫描候选目录，减少手工查找。
- 通过命令面板交互创建/取消链接，避免误操作。
- 跨平台支持 macOS、Linux、Windows。

## 可以用在哪里

- 多服务仓库中，快速切换某个服务的 `.vscode` 配置。
- 模板仓库中，把示例子项目配置映射到仓库根目录。
- 团队共享仓库中，用统一流程管理软链接，便于回滚与清理。

## 核心能力

- 递归扫描工作区子目录，查找标记目录（默认 `.vscode`）。
- 一次只允许选择一个候选，创建链接：`.vscode -> 子目录/.vscode`。
- 取消链接只作用于本插件创建的链接，支持“全部”或“指定项”删除。
- 删除时仅删除链接本身，不删除真实目标目录。

## 如何使用

### 1. 打开工作区

在 VS Code 中打开目标工作区（单根或多根都支持）。

### 2. 配置扫描规则（可选）

在 VS Code 设置中搜索 `workspaceLinker`，配置：
- `workspaceLinker.markerFolderNames`
- `workspaceLinker.excludeDirNames`
- `workspaceLinker.followSymlinks`
- `workspaceLinker.destinationRootMode`

### 3. 创建链接

1. 打开命令面板（macOS: `Cmd+Shift+P`，Windows/Linux: `Ctrl+Shift+P`）。
2. 运行 `Workspace Linker: Scan and Create Link`。
3. 选择一个候选目录。
4. 插件在工作区根目录创建链接，例如：`.vscode -> sub/.vscode`。

### 4. 取消链接

1. 打开命令面板。
2. 运行 `Workspace Linker: Remove Managed Links`。
3. 选择“全部已管理链接”或选择某个链接。

## VS Code 命令

- `workspaceLinker.scanAndLink`
  - 标题：`Workspace Linker: Scan and Create Link`
  - 作用：扫描并创建一个链接
- `workspaceLinker.unlinkManaged`
  - 标题：`Workspace Linker: Remove Managed Links`
  - 作用：删除本插件管理的链接

## 配置项

- `workspaceLinker.markerFolderNames: string[]`
  - 默认：`[".vscode"]`
  - 含义：哪些目录名会被当作可链接目标
- `workspaceLinker.excludeDirNames: string[]`
  - 默认：`[".git","node_modules","venv",".venv","dist","build","out","target",".idea",".tox"]`
  - 含义：扫描时跳过这些目录
- `workspaceLinker.followSymlinks: boolean`
  - 默认：`false`
  - 含义：扫描时是否跟随符号链接目录
- `workspaceLinker.destinationRootMode: "pickWhenMultiRoot" | "firstWorkspaceFolder"`
  - 默认：`"pickWhenMultiRoot"`
  - 含义：多根工作区下如何选择链接创建目标根目录

## 命令行（开发与 CI）

插件运行时不提供独立 CLI；主要通过 VS Code 命令面板操作。项目开发/CI 相关命令如下：

- `npm run build`：打包扩展到 `dist/`
- `npm run watch`：监听构建
- `npm run lint`：TypeScript 类型检查
- `npm run compile-tests`：编译测试代码到 `out/`
- `npm test`：执行 lint + build + compile-tests + mocha

GitHub CI 中还会执行：
- `.github/ci/package-extension.sh`：打包 VSIX

## 文件结构

```text
.
├── .github
│   ├── ci
│   │   └── package-extension.sh
│   └── workflows
│       └── ci.yml
├── dist/                     # esbuild 输出
├── out/                      # 测试编译输出
├── src
│   ├── extension.ts          # VS Code 入口与命令注册
│   ├── flows.ts              # 业务流程（扫描/创建/取消）
│   ├── scanner.ts            # 目录扫描逻辑
│   ├── linkManager.ts        # 软链接创建/删除
│   ├── state.ts              # workspaceState 管理
│   ├── config.ts             # 配置读取与规范化
│   ├── types.ts              # 类型定义
│   ├── ui.ts                 # VS Code UI 适配
│   └── test/suite            # 自动化测试
├── esbuild.mjs
├── package.json
├── tsconfig.json
├── README.md                 # 中文（默认）
├── README.en.md              # 英文
└── CHANGELOG.md              # 中文变更记录
```

## 跨平台行为

- macOS/Linux：创建目录符号链接（`dir`）
- Windows：创建目录联接（`junction`）

## 注意事项

- 目前“扫描并创建链接”一次只支持选择一个候选。
- 链接名使用 marker 名本身（如 `.vscode`），如果根目录已存在同名文件/目录/链接，会提示并跳过。
- 取消链接只管理本插件创建过并记录在状态中的链接。
