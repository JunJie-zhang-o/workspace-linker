import { lstat } from 'node:fs/promises';
import { ManagedLinkRecord, WorkspaceStateStore } from './types';

export const MANAGED_LINKS_KEY = 'workspaceLinker.managedLinks';

function normalizeRecords(input: unknown): ManagedLinkRecord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: ManagedLinkRecord[] = [];
  for (const record of input) {
    if (!record || typeof record !== 'object') {
      continue;
    }

    const maybe = record as Partial<ManagedLinkRecord>;
    if (typeof maybe.linkPath !== 'string' || typeof maybe.targetPath !== 'string' || typeof maybe.createdAt !== 'string') {
      continue;
    }

    if (!maybe.linkPath || !maybe.targetPath || !maybe.createdAt) {
      continue;
    }

    normalized.push({
      linkPath: maybe.linkPath,
      targetPath: maybe.targetPath,
      createdAt: maybe.createdAt
    });
  }

  return normalized;
}

export function getManagedLinks(state: WorkspaceStateStore): ManagedLinkRecord[] {
  const raw = state.get<ManagedLinkRecord[]>(MANAGED_LINKS_KEY, []);
  return normalizeRecords(raw);
}

export async function setManagedLinks(state: WorkspaceStateStore, links: ManagedLinkRecord[]): Promise<void> {
  await state.update(MANAGED_LINKS_KEY, links);
}

export async function upsertManagedLinks(state: WorkspaceStateStore, links: ManagedLinkRecord[]): Promise<void> {
  const current = getManagedLinks(state);
  const map = new Map<string, ManagedLinkRecord>();

  for (const entry of current) {
    map.set(entry.linkPath, entry);
  }

  for (const entry of links) {
    map.set(entry.linkPath, entry);
  }

  await setManagedLinks(state, [...map.values()].sort((a, b) => a.linkPath.localeCompare(b.linkPath)));
}

export async function removeManagedLinks(state: WorkspaceStateStore, linkPaths: string[]): Promise<void> {
  if (linkPaths.length === 0) {
    return;
  }

  const removalSet = new Set(linkPaths);
  const remaining = getManagedLinks(state).filter((record) => !removalSet.has(record.linkPath));
  await setManagedLinks(state, remaining);
}

export async function cleanManagedLinks(state: WorkspaceStateStore): Promise<{ active: ManagedLinkRecord[]; removedCount: number }> {
  const current = getManagedLinks(state);
  const next: ManagedLinkRecord[] = [];

  for (const record of current) {
    try {
      const linkStat = await lstat(record.linkPath);
      if (linkStat.isSymbolicLink()) {
        next.push(record);
      }
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError?.code !== 'ENOENT') {
        next.push(record);
      }
    }
  }

  if (next.length !== current.length) {
    await setManagedLinks(state, next);
  }

  return {
    active: next,
    removedCount: current.length - next.length
  };
}
