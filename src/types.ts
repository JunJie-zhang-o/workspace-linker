export type DestinationRootMode = 'pickWhenMultiRoot' | 'firstWorkspaceFolder';

export interface ExtensionConfig {
  markerFolderNames: string[];
  excludeDirNames: string[];
  followSymlinks: boolean;
  destinationRootMode: DestinationRootMode;
}

export interface WorkspaceFolderInfo {
  name: string;
  fsPath: string;
}

export interface ScanCandidate {
  workspaceFolderName: string;
  workspaceFolderPath: string;
  parentDirectoryPath: string;
  markerFolderName: string;
  markerPath: string;
  relativeMarkerPath: string;
}

export interface ManagedLinkRecord {
  linkPath: string;
  targetPath: string;
  createdAt: string;
}

export type Awaitable<T> = T | PromiseLike<T>;

export interface WorkspaceStateStore {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Awaitable<void>;
}

export interface SelectionItem<T> {
  label: string;
  description?: string;
  detail?: string;
  data: T;
}

export interface PickOptions {
  title: string;
  placeHolder?: string;
}

export interface UiAdapter {
  pickMany<T>(items: SelectionItem<T>[], options: PickOptions): Promise<T[] | undefined>;
  pickOne<T>(items: SelectionItem<T>[], options: PickOptions): Promise<T | undefined>;
  info(message: string): Awaitable<void>;
  warn(message: string): Awaitable<void>;
  error(message: string): Awaitable<void>;
}
