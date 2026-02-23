# Workspace Linker

[中文 README](./README.md)

A VS Code extension that scans marker folders (default: `.vscode`) in workspace subdirectories and creates/removes managed links in the workspace root.

## Background

In monorepos or aggregated workspaces, multiple subprojects often maintain their own `.vscode` folders. Teams frequently need to switch which subproject configuration is exposed at root level.

For ROS projects, Git often stores source code in paths like `src/project`, while the actual working layout is usually `ws/src`, `ws/build`, and `ws/devel`. In this setup, linking a subproject `.vscode` to workspace root allows reusing launch configurations, tasks, and settings across workspaces instead of duplicating them.

This extension automates that workflow:
- discover candidates by scanning,
- create links from Command Palette,
- safely remove only links managed by this extension.

## Typical Use Cases

- Switch root-level `.vscode` to a specific service in a monorepo.
- Map template/example subproject settings into workspace root.
- Standardize link management and cleanup in team repositories.

## Features

- Recursive scan for marker folders under workspace subdirectories.
- Single-selection linking flow: `.vscode -> sub/.vscode`.
- Remove managed links by selecting all or specific items.
- Remove link only; never delete the real target directory.
- Cross-platform support for macOS/Linux/Windows.

## How To Use

### 1. Open a workspace

Open your target workspace in VS Code.

### 2. Configure scan rules (optional)

Search `workspaceLinker` in VS Code Settings and update:
- `workspaceLinker.markerFolderNames`
- `workspaceLinker.excludeDirNames`
- `workspaceLinker.followSymlinks`
- `workspaceLinker.destinationRootMode`

### 3. Create a link

1. Open Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux).
2. Run `Workspace Linker: Scan and Create Link`.
3. Pick one candidate.
4. The extension creates a root link such as `.vscode -> sub/.vscode`.

### 4. Remove links

1. Open Command Palette.
2. Run `Workspace Linker: Remove Managed Links`.
3. Choose “remove all” or specific managed links.

## VS Code Commands

- `workspaceLinker.scanAndLink`
  - Title: `Workspace Linker: Scan and Create Link`
  - Purpose: scan and create one link
- `workspaceLinker.unlinkManaged`
  - Title: `Workspace Linker: Remove Managed Links`
  - Purpose: remove links created by this extension

## Settings

- `workspaceLinker.markerFolderNames: string[]`
  - Default: `[".vscode"]`
  - Marker folder names used as link targets
- `workspaceLinker.excludeDirNames: string[]`
  - Default: `[".git","node_modules","venv",".venv","dist","build","out","target",".idea",".tox"]`
  - Directory names excluded from scan
- `workspaceLinker.followSymlinks: boolean`
  - Default: `false`
  - Whether the scanner follows symlink directories
- `workspaceLinker.destinationRootMode: "pickWhenMultiRoot" | "firstWorkspaceFolder"`
  - Default: `"pickWhenMultiRoot"`
  - How destination root is chosen in multi-root workspaces

## Command Line (Dev & CI)

The extension has no runtime standalone CLI; operations are exposed through VS Code commands.

Development/CI commands:
- `npm run build`
- `npm run watch`
- `npm run lint`
- `npm run compile-tests`
- `npm test`
- `.github/ci/package-extension.sh` (VSIX packaging in CI)

## Project Structure

```text
.
├── .github
│   ├── ci
│   │   └── package-extension.sh
│   └── workflows
│       └── ci.yml
├── dist/
├── out/
├── src
│   ├── extension.ts
│   ├── flows.ts
│   ├── scanner.ts
│   ├── linkManager.ts
│   ├── state.ts
│   ├── config.ts
│   ├── types.ts
│   ├── ui.ts
│   └── test/suite
├── esbuild.mjs
├── package.json
├── tsconfig.json
├── README.md
├── README.en.md
└── CHANGELOG.md
```

## Platform Notes

- macOS/Linux: uses directory symlink (`dir`)
- Windows: uses directory junction (`junction`)

## Notes

- Scan-and-link currently supports selecting only one candidate at a time.
- Link name is the marker name itself (for example `.vscode`). If it already exists in workspace root, creation is skipped with a warning.
- Remove flow only lists links managed by this extension.
