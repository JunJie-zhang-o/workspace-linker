import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { lstat, mkdir, mkdtemp, stat } from 'node:fs/promises';
import { normalizeConfig } from '../../config';
import { runScanAndLink, runUnlinkManaged } from '../../flows';
import { getManagedLinks } from '../../state';
import { PickOptions, SelectionItem, UiAdapter, WorkspaceStateStore } from '../../types';

class MemoryStateStore implements WorkspaceStateStore {
  private readonly data = new Map<string, unknown>();

  get<T>(key: string, defaultValue: T): T {
    return (this.data.has(key) ? (this.data.get(key) as T) : defaultValue);
  }

  async update(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }
}

class FakeUi implements UiAdapter {
  public infos: string[] = [];
  public warns: string[] = [];
  public errors: string[] = [];

  constructor(
    private readonly pickManyImpl: <T>(items: SelectionItem<T>[], options: PickOptions) => Promise<T[] | undefined>,
    private readonly pickOneImpl?: <T>(items: SelectionItem<T>[], options: PickOptions) => Promise<T | undefined>
  ) {}

  async pickMany<T>(items: SelectionItem<T>[], options: PickOptions): Promise<T[] | undefined> {
    return this.pickManyImpl(items, options);
  }

  async pickOne<T>(items: SelectionItem<T>[], options: PickOptions): Promise<T | undefined> {
    if (this.pickOneImpl) {
      return this.pickOneImpl(items, options);
    }
    return items[0]?.data;
  }

  async info(message: string): Promise<void> {
    this.infos.push(message);
  }

  async warn(message: string): Promise<void> {
    this.warns.push(message);
  }

  async error(message: string): Promise<void> {
    this.errors.push(message);
  }
}

async function pathExists(target: string): Promise<boolean> {
  return Boolean(await lstat(target).catch(() => undefined));
}

describe('commands integration', () => {
  it('scans, links, then unlinks managed links', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'workspace-linker-flow-'));

    await mkdir(path.join(root, 'repos', 'app1', '.vscode'), { recursive: true });
    await mkdir(path.join(root, 'repos', 'app2', '.vscode'), { recursive: true });
    await mkdir(path.join(root, 'node_modules', 'ignoreMe', '.vscode'), { recursive: true });

    const config = normalizeConfig({
      markerFolderNames: ['.vscode'],
      excludeDirNames: ['node_modules']
    });

    const state = new MemoryStateStore();

    const scanUi = new FakeUi(
      async () => [],
      async (items) => {
        const app1 = items.find((item) => item.detail?.endsWith(path.join('repos', 'app1', '.vscode')));
        return app1?.data;
      }
    );

    const scanSummary = await runScanAndLink({
      workspaceFolders: [{ name: 'root', fsPath: root }],
      config,
      state,
      ui: scanUi
    });

    assert.equal(scanSummary.created, 1);
    assert.equal(await pathExists(path.join(root, '.vscode')), true);

    const app1Stat = await lstat(path.join(root, '.vscode'));
    assert.equal(app1Stat.isSymbolicLink(), true);

    const managed = getManagedLinks(state);
    assert.equal(managed.length, 1);
    assert.equal(managed.every((record) => record.targetPath.endsWith(path.join('app1', '.vscode'))), true);

    const unlinkUi = new FakeUi(async (items) => {
      const all = items.find((item) => {
        const value = item.data as { kind?: string };
        return value.kind === 'all';
      });
      return all ? [all.data] : [];
    });

    const unlinkSummary = await runUnlinkManaged({ state, ui: unlinkUi });
    assert.equal(unlinkSummary.removed, 1);

    assert.equal(await pathExists(path.join(root, '.vscode')), false);

    const targetStillThere = await stat(path.join(root, 'repos', 'app1'));
    assert.equal(targetStillThere.isDirectory(), true);

    assert.equal(getManagedLinks(state).length, 0);
  });
});
