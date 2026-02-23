import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { normalizeConfig } from '../../config';
import { scanWorkspaceForMarkers } from '../../scanner';

describe('scanner', () => {
  it('finds parent dirs with markers and respects exclusions', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'workspace-linker-scan-'));

    await mkdir(path.join(root, 'projectA', '.vscode'), { recursive: true });
    await mkdir(path.join(root, 'libs', 'projectB', '.vscode'), { recursive: true });
    await mkdir(path.join(root, 'node_modules', 'ignoreMe', '.vscode'), { recursive: true });

    const config = normalizeConfig({
      markerFolderNames: ['.vscode'],
      excludeDirNames: ['node_modules']
    });

    const results = await scanWorkspaceForMarkers(
      [
        {
          name: 'ws',
          fsPath: root
        }
      ],
      config
    );

    const paths = new Set(results.map((item) => item.markerPath));
    assert.equal(paths.has(path.join(root, 'projectA', '.vscode')), true);
    assert.equal(paths.has(path.join(root, 'libs', 'projectB', '.vscode')), true);
    assert.equal(paths.has(path.join(root, 'node_modules', 'ignoreMe', '.vscode')), false);
  });

  it('finds deep nested matches', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'workspace-linker-scan-deep-'));
    await mkdir(path.join(root, 'a', 'b', 'c', '.vscode'), { recursive: true });

    const config = normalizeConfig({ markerFolderNames: ['.vscode'] });
    const results = await scanWorkspaceForMarkers([{ name: 'ws', fsPath: root }], config);

    assert.equal(results.some((item) => item.markerPath === path.join(root, 'a', 'b', 'c', '.vscode')), true);
  });
});
