import { lstat, rm, stat, symlink, unlink } from 'node:fs/promises';

export type LinkType = 'junction' | 'dir';

export interface CreateLinkResult {
  status: 'created' | 'skipped' | 'failed';
  linkPath: string;
  targetPath: string;
  reason?: string;
}

export interface RemoveLinkResult {
  status: 'removed' | 'skipped' | 'failed';
  linkPath: string;
  reason?: string;
}

export function getDirectoryLinkType(platform: NodeJS.Platform = process.platform): LinkType {
  return platform === 'win32' ? 'junction' : 'dir';
}

export async function createDirectoryLink(
  targetPath: string,
  linkPath: string,
  platform: NodeJS.Platform = process.platform
): Promise<CreateLinkResult> {
  const targetStat = await stat(targetPath).catch(() => undefined);
  if (!targetStat?.isDirectory()) {
    return {
      status: 'failed',
      linkPath,
      targetPath,
      reason: `Target is not a directory: ${targetPath}`
    };
  }

  const existing = await lstat(linkPath).catch(() => undefined);
  if (existing) {
    return {
      status: 'skipped',
      linkPath,
      targetPath,
      reason: `Destination already exists: ${linkPath}`
    };
  }

  try {
    await symlink(targetPath, linkPath, getDirectoryLinkType(platform));
    return {
      status: 'created',
      linkPath,
      targetPath
    };
  } catch (error) {
    return {
      status: 'failed',
      linkPath,
      targetPath,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function removeManagedLink(linkPath: string): Promise<RemoveLinkResult> {
  const current = await lstat(linkPath).catch(() => undefined);
  if (!current) {
    return {
      status: 'skipped',
      linkPath,
      reason: `Link does not exist: ${linkPath}`
    };
  }

  if (!current.isSymbolicLink()) {
    return {
      status: 'skipped',
      linkPath,
      reason: `Path is not a symbolic link/junction: ${linkPath}`
    };
  }

  try {
    await unlink(linkPath);
    return {
      status: 'removed',
      linkPath
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === 'EPERM' || nodeError?.code === 'EISDIR') {
      try {
        await rm(linkPath, { force: false, recursive: false });
        return {
          status: 'removed',
          linkPath
        };
      } catch (fallbackError) {
        return {
          status: 'failed',
          linkPath,
          reason: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        };
      }
    }

    return {
      status: 'failed',
      linkPath,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}
