import {
  PUBLIC_LIBRARY_ID,
  PUBLIC_LIBRARY_NAME,
  PUBLIC_LIBRARY_SORT_ORDER,
  UNFILED_LIBRARY_ID,
  UNFILED_LIBRARY_NAME,
  UNFILED_LIBRARY_SORT_ORDER,
  sortLibrariesWithUnfiledLast
} from '../lib/libraries';
import { LOCAL_ASSET_MATERIALS } from '../generated/localAssets';
import { ListeningAudio, Material, SourceLibrary } from '../types/domain';
import {
  createPublicLibrary,
  createUnfiledLibrary,
  LOCAL_OPENID,
  LOCAL_SCHEMA_VERSION,
  LocalData
} from '../lib/localDataRules';

export const LOCAL_DATA_KEY = 'listen.localData';

export function readStoredLocalData(): LocalData | null {
  return wx.getStorageSync<LocalData | null>(LOCAL_DATA_KEY);
}

export function writeStoredLocalData(data: LocalData): void {
  wx.setStorageSync(LOCAL_DATA_KEY, data);
}

export function clearStoredLocalData(): void {
  wx.removeStorageSync(LOCAL_DATA_KEY);
}

export function createInitialLocalData(now = Date.now()): LocalData {
  const materials: Material[] = LOCAL_ASSET_MATERIALS.map((asset, index) => ({
    id: asset.id,
    libraryId: asset.libraryId,
    ownerOpenid: LOCAL_OPENID,
    title: asset.title,
    content: asset.content,
    status: 'ready',
    audioCount: asset.audio ? 1 : 0,
    sortOrder: (index + 1) * 1000,
    createdAt: now,
    updatedAt: now
  }));
  const listeningAudios: ListeningAudio[] = LOCAL_ASSET_MATERIALS.flatMap((asset) =>
    asset.audio
      ? [
          {
            id: `${asset.id}-audio`,
            materialId: asset.id,
            sourceKind: 'upload',
            format: asset.audio.format,
            cloudFileId: asset.audio.cloudFileId,
            createdAt: now,
            updatedAt: now
          }
        ]
      : []
  );

  return {
    schemaVersion: LOCAL_SCHEMA_VERSION,
    libraries: sortLibrariesWithUnfiledLast([
      ...buildLibrariesFromLocalAssets(now),
      createUnfiledLibrary(now)
    ]),
    materials,
    listeningAudios
  };
}

function buildLibrariesFromLocalAssets(now: number): SourceLibrary[] {
  const byId = new Map<string, SourceLibrary>();

  for (const asset of LOCAL_ASSET_MATERIALS) {
    if (!asset.libraryId || asset.libraryId === UNFILED_LIBRARY_ID) {
      continue;
    }

    if (byId.has(asset.libraryId)) {
      continue;
    }

    byId.set(asset.libraryId, {
      id: asset.libraryId,
      name: asset.libraryName || (asset.libraryId === PUBLIC_LIBRARY_ID ? PUBLIC_LIBRARY_NAME : asset.libraryId),
      kind: asset.libraryKind,
      ownerOpenid: asset.libraryKind === 'user' ? LOCAL_OPENID : undefined,
      description: asset.libraryId === PUBLIC_LIBRARY_ID ? '随项目提供的只读听力材料' : undefined,
      sortOrder: asset.libraryId === PUBLIC_LIBRARY_ID ? PUBLIC_LIBRARY_SORT_ORDER : nextLibrarySortOrder([...byId.values()]),
      createdAt: now,
      updatedAt: now
    });
  }

  if (!byId.has(PUBLIC_LIBRARY_ID)) {
    byId.set(PUBLIC_LIBRARY_ID, createPublicLibrary(now));
  }

  return [...byId.values()];
}

function nextLibrarySortOrder(libraries: SourceLibrary[]): number {
  const max = libraries
    .filter((library) => library.id !== UNFILED_LIBRARY_ID)
    .reduce((value, library) => Math.max(value, library.sortOrder), 0);
  return max + 1000;
}
