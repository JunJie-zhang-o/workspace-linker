# 变更日志

本项目变更记录采用中文维护。

## [0.0.1] - 2026-02-23

### 新增

- 新增 VS Code 扩展基础能力：扫描标记目录并创建/取消管理软链接。
- 新增命令：
  - `workspaceLinker.scanAndLink`
  - `workspaceLinker.unlinkManaged`
- 新增配置：
  - `workspaceLinker.markerFolderNames`
  - `workspaceLinker.excludeDirNames`
  - `workspaceLinker.followSymlinks`
  - `workspaceLinker.destinationRootMode`
- 新增跨平台软链接策略：
  - macOS/Linux 使用 `dir`
  - Windows 使用 `junction`
- 新增管理状态存储：仅管理本插件创建的链接并支持清理脏记录。
- 新增 GitHub CI：自动执行安装、测试、打包 VSIX 并上传构建产物。

### 调整

- 扫描并创建链接流程调整为“一次只允许选择一个候选”。
- 链接目标调整为标记目录本身，示例：`.vscode -> sub/.vscode`。

### 文档

- 新增中文默认 `README.md`，完整说明背景、场景、用法、命令、配置、文件结构。
- 新增英文文档 `README.en.md`。
- 新增中文 `CHANGELOG.md`。
