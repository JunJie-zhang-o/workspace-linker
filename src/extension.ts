import * as vscode from 'vscode';
import { normalizeConfig } from './config';
import { runScanAndLink, runUnlinkManaged } from './flows';
import { createVscodeUi } from './ui';
import { WorkspaceFolderInfo } from './types';

function getWorkspaceFolders(): WorkspaceFolderInfo[] {
  const folders = vscode.workspace.workspaceFolders ?? [];
  return folders.map((folder) => ({
    name: folder.name,
    fsPath: folder.uri.fsPath
  }));
}

function readConfig() {
  const config = vscode.workspace.getConfiguration('workspaceLinker');
  return normalizeConfig({
    markerFolderNames: config.get<string[]>('markerFolderNames'),
    excludeDirNames: config.get<string[]>('excludeDirNames'),
    followSymlinks: config.get<boolean>('followSymlinks'),
    destinationRootMode: config.get<'pickWhenMultiRoot' | 'firstWorkspaceFolder'>('destinationRootMode')
  });
}

export function activate(context: vscode.ExtensionContext): void {
  const ui = createVscodeUi();

  const scanDisposable = vscode.commands.registerCommand('workspaceLinker.scanAndLink', async () => {
    try {
      await runScanAndLink({
        workspaceFolders: getWorkspaceFolders(),
        config: readConfig(),
        state: context.workspaceState,
        ui
      });
    } catch (error) {
      await ui.error(`Workspace Linker failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  const unlinkDisposable = vscode.commands.registerCommand('workspaceLinker.unlinkManaged', async () => {
    try {
      await runUnlinkManaged({
        state: context.workspaceState,
        ui
      });
    } catch (error) {
      await ui.error(`Workspace Linker failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(scanDisposable, unlinkDisposable);
}

export function deactivate(): void {
  // no-op
}
