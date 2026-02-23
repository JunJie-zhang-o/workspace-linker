import path from 'node:path';
import { Dirent } from 'node:fs';
import { readdir, realpath, stat } from 'node:fs/promises';
import { ExtensionConfig, ScanCandidate, WorkspaceFolderInfo } from './types';

interface QueueNode {
  dirPath: string;
  isRoot: boolean;
}

async function listEntries(dirPath: string): Promise<Dirent[]> {
  try {
    return await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

export async function scanWorkspaceForMarkers(
  workspaceFolders: WorkspaceFolderInfo[],
  config: ExtensionConfig
): Promise<ScanCandidate[]> {
  const markerNames = new Set(config.markerFolderNames);
  const excludeNames = new Set(config.excludeDirNames);
  const allCandidates: ScanCandidate[] = [];

  for (const folder of workspaceFolders) {
    const queue: QueueNode[] = [{ dirPath: folder.fsPath, isRoot: true }];
    const visitedRealPaths = new Set<string>();

    while (queue.length > 0) {
      const current = queue.pop();
      if (!current) {
        break;
      }

      if (config.followSymlinks) {
        const real = await realpath(current.dirPath).catch(() => current.dirPath);
        if (visitedRealPaths.has(real)) {
          continue;
        }
        visitedRealPaths.add(real);
      }

      const entries = await listEntries(current.dirPath);
      if (entries.length === 0) {
        continue;
      }

      for (const entry of entries) {
        if (!markerNames.has(entry.name)) {
          continue;
        }

        if (!entry.isDirectory() && !entry.isSymbolicLink()) {
          continue;
        }

        if (current.isRoot) {
          continue;
        }

        allCandidates.push({
          workspaceFolderName: folder.name,
          workspaceFolderPath: folder.fsPath,
          parentDirectoryPath: current.dirPath,
          markerFolderName: entry.name,
          markerPath: path.join(current.dirPath, entry.name),
          relativeMarkerPath: path.relative(folder.fsPath, path.join(current.dirPath, entry.name)) || '.'
        });
      }

      for (const entry of entries) {
        if (excludeNames.has(entry.name)) {
          continue;
        }

        const childPath = path.join(current.dirPath, entry.name);

        if (entry.isDirectory()) {
          queue.push({ dirPath: childPath, isRoot: false });
          continue;
        }

        if (!entry.isSymbolicLink() || !config.followSymlinks) {
          continue;
        }

        const symlinkTarget = await stat(childPath).catch(() => undefined);
        if (symlinkTarget?.isDirectory()) {
          queue.push({ dirPath: childPath, isRoot: false });
        }
      }
    }
  }

  return allCandidates.sort((a, b) => a.markerPath.localeCompare(b.markerPath));
}
