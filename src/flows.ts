import path from 'node:path';
import { createDirectoryLink, removeManagedLink } from './linkManager';
import { cleanManagedLinks, getManagedLinks, removeManagedLinks, upsertManagedLinks } from './state';
import {
  ExtensionConfig,
  ManagedLinkRecord,
  ScanCandidate,
  SelectionItem,
  UiAdapter,
  WorkspaceFolderInfo,
  WorkspaceStateStore
} from './types';
import { scanWorkspaceForMarkers } from './scanner';

interface ScanAndLinkParams {
  workspaceFolders: WorkspaceFolderInfo[];
  config: ExtensionConfig;
  state: WorkspaceStateStore;
  ui: UiAdapter;
}

export interface ScanAndLinkSummary {
  created: number;
  skipped: number;
  failed: number;
  createdLinks: ManagedLinkRecord[];
}

interface UnlinkManagedParams {
  state: WorkspaceStateStore;
  ui: UiAdapter;
}

export interface UnlinkManagedSummary {
  removed: number;
  skipped: number;
  failed: number;
}

interface UnlinkSelection {
  kind: 'all' | 'single';
  record?: ManagedLinkRecord;
}

function buildCandidateLabel(candidate: ScanCandidate): string {
  return path.basename(candidate.parentDirectoryPath);
}

async function chooseDestinationRoot(
  workspaceFolders: WorkspaceFolderInfo[],
  config: ExtensionConfig,
  ui: UiAdapter
): Promise<WorkspaceFolderInfo | undefined> {
  if (workspaceFolders.length === 1 || config.destinationRootMode === 'firstWorkspaceFolder') {
    return workspaceFolders[0];
  }

  const selected = await ui.pickOne(
    workspaceFolders.map<SelectionItem<WorkspaceFolderInfo>>((folder) => ({
      label: folder.name,
      description: folder.fsPath,
      data: folder
    })),
    {
      title: 'Workspace Linker: Choose destination workspace root',
      placeHolder: 'Select where the links will be created'
    }
  );

  if (!selected) {
    await ui.info('Workspace Linker: canceled before destination root selection.');
  }

  return selected;
}

export async function runScanAndLink(params: ScanAndLinkParams): Promise<ScanAndLinkSummary> {
  const { workspaceFolders, config, state, ui } = params;

  if (workspaceFolders.length === 0) {
    await ui.info('Workspace Linker: no workspace folder is open.');
    return { created: 0, skipped: 0, failed: 0, createdLinks: [] };
  }

  await cleanManagedLinks(state);

  const candidates = await scanWorkspaceForMarkers(workspaceFolders, config);
  if (candidates.length === 0) {
    await ui.info('Workspace Linker: no candidate folders found.');
    return { created: 0, skipped: 0, failed: 0, createdLinks: [] };
  }

  const selectedCandidate = await ui.pickOne(
    candidates.map<SelectionItem<ScanCandidate>>((candidate) => ({
      label: buildCandidateLabel(candidate),
      description: `${candidate.workspaceFolderName}: ${candidate.relativeMarkerPath}`,
      detail: candidate.markerPath,
      data: candidate
    })),
    {
      title: 'Workspace Linker: Select one folder to link',
      placeHolder: 'Choose one candidate folder'
    }
  );

  if (!selectedCandidate) {
    await ui.info('Workspace Linker: canceled, no folder selected.');
    return { created: 0, skipped: 0, failed: 0, createdLinks: [] };
  }

  const destination = await chooseDestinationRoot(workspaceFolders, config, ui);
  if (!destination) {
    return { created: 0, skipped: 0, failed: 0, createdLinks: [] };
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const createdLinks: ManagedLinkRecord[] = [];
  const issues: string[] = [];

  const linkName = selectedCandidate.markerFolderName;
  const linkPath = path.join(destination.fsPath, linkName);
  const result = await createDirectoryLink(selectedCandidate.markerPath, linkPath);

  if (result.status === 'created') {
    created += 1;
    createdLinks.push({
      linkPath,
      targetPath: selectedCandidate.markerPath,
      createdAt: new Date().toISOString()
    });
  } else if (result.status === 'skipped') {
    skipped += 1;
    if (result.reason) {
      issues.push(result.reason);
    }
  } else {
    failed += 1;
    if (result.reason) {
      issues.push(result.reason);
    }
  }

  if (createdLinks.length > 0) {
    await upsertManagedLinks(state, createdLinks);
  }

  await ui.info(`Workspace Linker: created ${created}, skipped ${skipped}, failed ${failed}.`);
  if (issues.length > 0) {
    await ui.warn(`Workspace Linker details: ${issues.slice(0, 3).join(' | ')}`);
  }

  return { created, skipped, failed, createdLinks };
}

export async function runUnlinkManaged(params: UnlinkManagedParams): Promise<UnlinkManagedSummary> {
  const { state, ui } = params;

  await cleanManagedLinks(state);
  const current = getManagedLinks(state);

  if (current.length === 0) {
    await ui.info('Workspace Linker: there are no managed links to remove.');
    return { removed: 0, skipped: 0, failed: 0 };
  }

  const selections = await ui.pickMany(
    [
      {
        label: 'Remove all managed links',
        description: `${current.length} link(s)`,
        data: { kind: 'all' } as UnlinkSelection
      },
      ...current.map<SelectionItem<UnlinkSelection>>((record) => ({
        label: path.basename(record.linkPath),
        description: record.linkPath,
        detail: `-> ${record.targetPath}`,
        data: { kind: 'single', record }
      }))
    ],
    {
      title: 'Workspace Linker: Select managed links to remove',
      placeHolder: 'Choose "Remove all managed links" or select specific links'
    }
  );

  if (!selections || selections.length === 0) {
    await ui.info('Workspace Linker: canceled, no links selected.');
    return { removed: 0, skipped: 0, failed: 0 };
  }

  const removeAll = selections.some((item) => item.kind === 'all');
  const targetRecords = removeAll
    ? current
    : selections
        .filter((item): item is UnlinkSelection & { kind: 'single'; record: ManagedLinkRecord } => item.kind === 'single' && !!item.record)
        .map((item) => item.record);

  const uniqueByLinkPath = new Map<string, ManagedLinkRecord>();
  for (const record of targetRecords) {
    uniqueByLinkPath.set(record.linkPath, record);
  }

  let removed = 0;
  let skipped = 0;
  let failed = 0;
  const stateRemovalPaths = new Set<string>();
  const issues: string[] = [];

  for (const record of uniqueByLinkPath.values()) {
    const result = await removeManagedLink(record.linkPath);

    if (result.status === 'removed') {
      removed += 1;
      stateRemovalPaths.add(record.linkPath);
      continue;
    }

    if (result.status === 'skipped') {
      skipped += 1;
      stateRemovalPaths.add(record.linkPath);
      if (result.reason) {
        issues.push(result.reason);
      }
      continue;
    }

    failed += 1;
    if (result.reason) {
      issues.push(result.reason);
    }
  }

  await removeManagedLinks(state, [...stateRemovalPaths]);

  await ui.info(`Workspace Linker: removed ${removed}, skipped ${skipped}, failed ${failed}.`);
  if (issues.length > 0) {
    await ui.warn(`Workspace Linker details: ${issues.slice(0, 3).join(' | ')}`);
  }

  return { removed, skipped, failed };
}
