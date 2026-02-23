import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { lstat, mkdir, mkdtemp, stat } from 'node:fs/promises';
import { createDirectoryLink, getDirectoryLinkType, removeManagedLink } from '../../linkManager';

describe('linkManager', () => {
  it('returns correct link type by platform', () => {
    assert.equal(getDirectoryLinkType('win32'), 'junction');
    assert.equal(getDirectoryLinkType('darwin'), 'dir');
    assert.equal(getDirectoryLinkType('linux'), 'dir');
  });

  it('creates link and skips when destination exists', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'workspace-linker-link-'));
    const target = path.join(root, 'targets', 'appA');
    const link = path.join(root, 'appA');

    await mkdir(target, { recursive: true });

    const created = await createDirectoryLink(target, link, 'linux');
    assert.equal(created.status, 'created');

    const linkStat = await lstat(link);
    assert.equal(linkStat.isSymbolicLink(), true);

    const skipped = await createDirectoryLink(target, link, 'linux');
    assert.equal(skipped.status, 'skipped');
  });

  it('removes link only and keeps target directory', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'workspace-linker-unlink-'));
    const target = path.join(root, 'targets', 'appB');
    const link = path.join(root, 'appB');

    await mkdir(target, { recursive: true });
    await createDirectoryLink(target, link, 'linux');

    const removed = await removeManagedLink(link);
    assert.equal(removed.status, 'removed');

    const targetStat = await stat(target);
    assert.equal(targetStat.isDirectory(), true);

    const linkAfter = await lstat(link).catch(() => undefined);
    assert.equal(linkAfter, undefined);
  });
});
