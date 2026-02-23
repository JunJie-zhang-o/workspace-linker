import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { createDirectoryLink } from '../../linkManager';
import { cleanManagedLinks, getManagedLinks, removeManagedLinks, upsertManagedLinks } from '../../state';
import { WorkspaceStateStore } from '../../types';

class MemoryStateStore implements WorkspaceStateStore {
  private readonly data = new Map<string, unknown>();

  get<T>(key: string, defaultValue: T): T {
    return (this.data.has(key) ? (this.data.get(key) as T) : defaultValue);
  }

  async update(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }
}

describe('state', () => {
  it('upserts unique managed links by linkPath', async () => {
    const store = new MemoryStateStore();

    await upsertManagedLinks(store, [
      { linkPath: '/tmp/a', targetPath: '/tmp/ta', createdAt: '2026-01-01T00:00:00.000Z' },
      { linkPath: '/tmp/a', targetPath: '/tmp/ta2', createdAt: '2026-01-01T00:01:00.000Z' }
    ]);

    const current = getManagedLinks(store);
    assert.equal(current.length, 1);
    assert.equal(current[0]?.targetPath, '/tmp/ta2');
  });

  it('removes links and cleans stale entries', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'workspace-linker-state-'));
    const target = path.join(root, 'targets', 'x');
    const link = path.join(root, 'x');

    await mkdir(target, { recursive: true });
    await createDirectoryLink(target, link, 'linux');

    const store = new MemoryStateStore();
    await upsertManagedLinks(store, [
      { linkPath: link, targetPath: target, createdAt: '2026-01-01T00:00:00.000Z' },
      { linkPath: path.join(root, 'missing'), targetPath: path.join(root, 'missing-target'), createdAt: '2026-01-01T00:00:00.000Z' }
    ]);

    const cleaned = await cleanManagedLinks(store);
    assert.equal(cleaned.removedCount, 1);
    assert.equal(cleaned.active.length, 1);

    await removeManagedLinks(store, [link]);
    assert.equal(getManagedLinks(store).length, 0);
  });
});
