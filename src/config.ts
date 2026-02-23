import { ExtensionConfig } from './types';

export const DEFAULT_MARKER_FOLDERS = ['.vscode'];

export const DEFAULT_EXCLUDE_FOLDERS = [
  '.git',
  'node_modules',
  'venv',
  '.venv',
  'dist',
  'build',
  'out',
  'target',
  '.idea',
  '.tox'
];

const DEFAULT_DESTINATION_MODE: ExtensionConfig['destinationRootMode'] = 'pickWhenMultiRoot';

function sanitizeFolderNames(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) {
    return [...fallback];
  }

  const unique = new Set<string>();
  for (const value of input) {
    if (typeof value !== 'string') {
      continue;
    }
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }
    unique.add(normalized);
  }

  return unique.size > 0 ? [...unique] : [...fallback];
}

export function normalizeConfig(raw?: Partial<ExtensionConfig>): ExtensionConfig {
  const markerFolderNames = sanitizeFolderNames(raw?.markerFolderNames, DEFAULT_MARKER_FOLDERS);
  const excludeDirNames = sanitizeFolderNames(raw?.excludeDirNames, DEFAULT_EXCLUDE_FOLDERS);

  const destinationRootMode =
    raw?.destinationRootMode === 'firstWorkspaceFolder' || raw?.destinationRootMode === 'pickWhenMultiRoot'
      ? raw.destinationRootMode
      : DEFAULT_DESTINATION_MODE;

  return {
    markerFolderNames,
    excludeDirNames,
    followSymlinks: Boolean(raw?.followSymlinks),
    destinationRootMode
  };
}
