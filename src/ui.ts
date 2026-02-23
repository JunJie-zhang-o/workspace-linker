import * as vscode from 'vscode';
import { PickOptions, SelectionItem, UiAdapter } from './types';

interface QuickPickWithData<T> extends vscode.QuickPickItem {
  data: T;
}

export function createVscodeUi(): UiAdapter {
  return {
    async pickMany<T>(items: SelectionItem<T>[], options: PickOptions): Promise<T[] | undefined> {
      const quickPickItems: QuickPickWithData<T>[] = items.map((item) => ({
        label: item.label,
        description: item.description,
        detail: item.detail,
        data: item.data
      }));

      const picked = await vscode.window.showQuickPick(quickPickItems, {
        canPickMany: true,
        title: options.title,
        placeHolder: options.placeHolder,
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (!picked) {
        return undefined;
      }

      return picked.map((item) => item.data);
    },

    async pickOne<T>(items: SelectionItem<T>[], options: PickOptions): Promise<T | undefined> {
      const quickPickItems: QuickPickWithData<T>[] = items.map((item) => ({
        label: item.label,
        description: item.description,
        detail: item.detail,
        data: item.data
      }));

      const picked = await vscode.window.showQuickPick(quickPickItems, {
        canPickMany: false,
        title: options.title,
        placeHolder: options.placeHolder,
        matchOnDescription: true,
        matchOnDetail: true
      });

      return picked?.data;
    },

    async info(message: string): Promise<void> {
      await vscode.window.showInformationMessage(message);
    },

    async warn(message: string): Promise<void> {
      await vscode.window.showWarningMessage(message);
    },

    async error(message: string): Promise<void> {
      await vscode.window.showErrorMessage(message);
    }
  };
}
