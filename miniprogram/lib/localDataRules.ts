import {
  PUBLIC_LIBRARY_ID,
  PUBLIC_LIBRARY_NAME,
  PUBLIC_LIBRARY_SORT_ORDER,
  UNFILED_LIBRARY_ID,
  UNFILED_LIBRARY_NAME,
  UNFILED_LIBRARY_SORT_ORDER,
  sortLibrariesWithUnfiledLast
} from './libraries';
import { ListeningAudio, Material, SourceLibrary } from '../types/domain';

export const LOCAL_SCHEMA_VERSION = 7;
export const LOCAL_OPENID = 'local-user';

export interface LocalData {
  schemaVersion: number;
  libraries: SourceLibrary[];
  materials: Material[];
  listeningAudios: ListeningAudio[];
}

export function createPublicLibrary(now: number): SourceLibrary {
  return {
    id: PUBLIC_LIBRARY_ID,
    name: PUBLIC_LIBRARY_NAME,
    kind: 'general',
    description: '随项目提供的只读听力材料',
    sortOrder: PUBLIC_LIBRARY_SORT_ORDER,
    createdAt: now,
    updatedAt: now
  };
}

export function createUnfiledLibrary(now: number): SourceLibrary {
  return {
    id: UNFILED_LIBRARY_ID,
    name: UNFILED_LIBRARY_NAME,
    kind: 'user',
    ownerOpenid: LOCAL_OPENID,
    description: '新建材料和删除分类后的材料会保存在这里',
    sortOrder: UNFILED_LIBRARY_SORT_ORDER,
    createdAt: now,
    updatedAt: now
  };
}

export function sortMaterials(materials: Material[]): Material[] {
  return [...materials].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt - right.createdAt;
  });
}

export function nextLibrarySortOrder(libraries: SourceLibrary[]): number {
  const max = libraries
    .filter((library) => library.id !== UNFILED_LIBRARY_ID)
    .reduce((value, library) => Math.max(value, library.sortOrder), 0);
  return max + 1000;
}

export function nextMaterialSortOrder(materials: Material[], libraryId: string): number {
  const sameLibrary = materials.filter((material) => material.libraryId === libraryId && material.status !== 'archived');
  const min = sameLibrary.reduce((value, material) => Math.min(value, material.sortOrder), 0);
  return min - 1000;
}

export function resolveWritableLibraryId(data: LocalData, requestedLibraryId?: string): string {
  if (requestedLibraryId && data.libraries.some((library) => library.id === requestedLibraryId && library.kind === 'user')) {
    return requestedLibraryId;
  }

  return UNFILED_LIBRARY_ID;
}

export function normalizeLocalData(data: LocalData): { data: LocalData; changed: boolean } {
  let changed = false;
  const now = Date.now();
  const normalized: LocalData = {
    schemaVersion: LOCAL_SCHEMA_VERSION,
    libraries: [...(data.libraries ?? [])],
    materials: [...(data.materials ?? [])],
    listeningAudios: [...(data.listeningAudios ?? [])]
  };

  if (normalized.schemaVersion !== data.schemaVersion) {
    changed = true;
  }

  let unfiled = normalized.libraries.find((library) => library.id === UNFILED_LIBRARY_ID);
  if (!unfiled) {
    unfiled = createUnfiledLibrary(now);
    normalized.libraries.push(unfiled);
    changed = true;
  }

  let publicLibrary = normalized.libraries.find((library) => library.id === PUBLIC_LIBRARY_ID);
  if (!publicLibrary) {
    publicLibrary = createPublicLibrary(now);
    normalized.libraries.push(publicLibrary);
    changed = true;
  }

  if (
    publicLibrary.name !== PUBLIC_LIBRARY_NAME ||
    publicLibrary.kind !== 'general' ||
    publicLibrary.ownerOpenid !== undefined ||
    publicLibrary.sortOrder !== PUBLIC_LIBRARY_SORT_ORDER
  ) {
    publicLibrary.name = PUBLIC_LIBRARY_NAME;
    publicLibrary.kind = 'general';
    publicLibrary.ownerOpenid = undefined;
    publicLibrary.description = '随项目提供的只读听力材料';
    publicLibrary.sortOrder = PUBLIC_LIBRARY_SORT_ORDER;
    publicLibrary.updatedAt = now;
    changed = true;
  }

  if (
    unfiled.name !== UNFILED_LIBRARY_NAME ||
    unfiled.kind !== 'user' ||
    unfiled.ownerOpenid !== LOCAL_OPENID ||
    unfiled.sortOrder !== UNFILED_LIBRARY_SORT_ORDER
  ) {
    unfiled.name = UNFILED_LIBRARY_NAME;
    unfiled.kind = 'user';
    unfiled.ownerOpenid = LOCAL_OPENID;
    unfiled.description = '新建材料和删除分类后的材料会保存在这里';
    unfiled.sortOrder = UNFILED_LIBRARY_SORT_ORDER;
    unfiled.updatedAt = now;
    changed = true;
  }

  const libraryIds = new Set(normalized.libraries.map((library) => library.id));
  for (const material of normalized.materials) {
    if (!libraryIds.has(material.libraryId)) {
      material.libraryId = UNFILED_LIBRARY_ID;
      material.updatedAt = now;
      changed = true;
    }
  }

  const sortedLibraries = sortLibrariesWithUnfiledLast(normalized.libraries);
  if (sortedLibraries.some((library, index) => library.id !== normalized.libraries[index]?.id)) {
    normalized.libraries = sortedLibraries;
    changed = true;
  }

  return { data: normalized, changed };
}
