import { buildDefaultMaterialTitle } from '../lib/materialTitle';
import { UNFILED_LIBRARY_ID, isPublicLibrary } from '../lib/libraries';
import {
  LOCAL_OPENID,
  LOCAL_SCHEMA_VERSION,
  LocalData,
  nextLibrarySortOrder,
  nextMaterialSortOrder,
  normalizeLocalData,
  resolveWritableLibraryId,
  sortMaterials
} from '../lib/localDataRules';
import {
  clearStoredLocalData,
  createInitialLocalData,
  readStoredLocalData,
  writeStoredLocalData
} from './localDataStore';
import {
  DeleteLibraryResponse,
  DeleteMaterialResponse,
  MoveMaterialResponse,
  ReorderDirection,
  ReorderMaterialResponse,
  ReplaceListeningAudioResponse,
  RenameLibraryResponse,
  SaveLibraryResponse,
  SaveMaterialResponse,
  SyncDataResponse,
  UpdateMaterialResponse
} from '../types/api';
import { AudioFormat, ListeningAudio, Material, SourceLibrary } from '../types/domain';

export interface SaveLocalMaterialInput {
  libraryId?: string;
  title?: string;
  content: string;
  now?: number;
}

export function loadLocalSnapshot(): SyncDataResponse {
  const data = readLocalData();
  return {
    serverTime: Date.now(),
    libraries: data.libraries,
    materials: data.materials,
    listeningAudios: data.listeningAudios
  };
}

export function saveLocalMaterial(input: SaveLocalMaterialInput): SaveMaterialResponse {
  const now = input.now ?? Date.now();
  const content = input.content.trim();

  if (!content) {
    throw new Error('请填写英文内容');
  }

  const data = readLocalData();
  const targetLibraryId = resolveWritableLibraryId(data, input.libraryId);
  const materialId = createLocalId('material', now);
  const material: Material = {
    id: materialId,
    libraryId: targetLibraryId,
    ownerOpenid: LOCAL_OPENID,
    title: input.title?.trim() || buildDefaultMaterialTitle(content, now),
    content,
    status: 'ready',
    audioCount: 0,
    sortOrder: nextMaterialSortOrder(data.materials, targetLibraryId),
    createdAt: now,
    updatedAt: now
  };

  data.materials.unshift(material);
  writeLocalData(data);

  return { material };
}

export function createLocalLibrary(name: string, now = Date.now()): SaveLibraryResponse {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('请填写分类名称');
  }

  const data = readLocalData();
  const library: SourceLibrary = {
    id: createLocalId('library', now),
    name: trimmedName,
    kind: 'user',
    ownerOpenid: LOCAL_OPENID,
    sortOrder: nextLibrarySortOrder(data.libraries),
    createdAt: now,
    updatedAt: now
  };

  data.libraries.push(library);
  writeLocalData(data);
  return { library };
}

export function deleteLocalLibrary(libraryId: string): DeleteLibraryResponse {
  const data = readLocalData();
  const library = data.libraries.find((item) => item.id === libraryId);
  if (!library) {
    throw new Error('分类不存在');
  }

  if (library.id === UNFILED_LIBRARY_ID) {
    throw new Error('未归类材料不能删除');
  }

  if (library.kind !== 'user') {
    throw new Error('公共资源不能删除');
  }

  const now = Date.now();
  const activeMaterials = data.materials.filter((material) => material.libraryId === libraryId && material.status !== 'archived');
  for (const material of activeMaterials) {
    material.libraryId = UNFILED_LIBRARY_ID;
    material.updatedAt = now;
  }

  data.libraries = data.libraries.filter((item) => item.id !== libraryId);
  writeLocalData(data);
  return {
    libraryId,
    movedMaterialCount: activeMaterials.length
  };
}

export function renameLocalLibrary(libraryId: string, name: string, now = Date.now()): RenameLibraryResponse {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('请填写分类名称');
  }

  const data = readLocalData();
  const library = data.libraries.find((item) => item.id === libraryId);
  if (!library) {
    throw new Error('分类不存在');
  }

  if (library.id === UNFILED_LIBRARY_ID) {
    throw new Error('未归类材料不能重命名');
  }

  if (library.kind !== 'user') {
    throw new Error('公共资源不能重命名');
  }

  library.name = trimmedName;
  library.updatedAt = now;
  writeLocalData(data);
  return { library };
}

export function moveLocalMaterial(materialId: string, libraryId: string, now = Date.now()): MoveMaterialResponse {
  const data = readLocalData();
  const targetLibrary = data.libraries.find((library) => library.id === libraryId);
  if (!targetLibrary) {
    throw new Error('目标分类不存在');
  }

  if (isPublicLibrary(targetLibrary)) {
    throw new Error('不能移动到公共资源');
  }

  const material = data.materials.find((item) => item.id === materialId);
  if (!material) {
    throw new Error('材料不存在');
  }

  const sourceLibrary = data.libraries.find((library) => library.id === material.libraryId);
  if (isPublicLibrary(sourceLibrary)) {
    throw new Error('公共资源不能移动');
  }

  material.libraryId = libraryId;
  material.sortOrder = nextMaterialSortOrder(data.materials.filter((item) => item.id !== materialId), libraryId);
  material.updatedAt = now;
  writeLocalData(data);
  return { material };
}

export function updateLocalMaterial(
  materialId: string,
  input: {
    title?: string;
    content: string;
    now?: number;
  }
): UpdateMaterialResponse {
  const content = input.content.trim();
  if (!content) {
    throw new Error('请填写英文内容');
  }

  const data = readLocalData();
  const material = data.materials.find((item) => item.id === materialId && item.status !== 'archived');
  if (!material) {
    throw new Error('材料不存在');
  }

  const library = data.libraries.find((item) => item.id === material.libraryId);
  if (isPublicLibrary(library)) {
    throw new Error('公共资源不能编辑');
  }

  const now = input.now ?? Date.now();
  material.title = input.title?.trim() || buildDefaultMaterialTitle(content, now);
  material.content = content;
  material.updatedAt = now;
  writeLocalData(data);
  return { material };
}

export function replaceLocalMaterialAudio(
  materialId: string,
  input: {
    cloudFileId: string;
    format: AudioFormat;
    durationMs?: number;
    now?: number;
  }
): ReplaceListeningAudioResponse {
  if (!input.cloudFileId) {
    throw new Error('音频文件不能为空');
  }

  const data = readLocalData();
  const material = data.materials.find((item) => item.id === materialId && item.status !== 'archived');
  if (!material) {
    throw new Error('材料不存在');
  }

  const library = data.libraries.find((item) => item.id === material.libraryId);
  if (isPublicLibrary(library)) {
    throw new Error('公共资源不能替换音频');
  }

  const now = input.now ?? Date.now();
  const listeningAudio: ListeningAudio = {
    id: createLocalId('audio', now),
    materialId,
    sourceKind: 'upload',
    format: input.format,
    cloudFileId: input.cloudFileId,
    durationMs: input.durationMs,
    createdAt: now,
    updatedAt: now
  };

  data.listeningAudios = data.listeningAudios.filter((audio) => audio.materialId !== materialId);
  data.listeningAudios.unshift(listeningAudio);
  material.audioCount = 1;
  material.updatedAt = now;
  writeLocalData(data);
  return { listeningAudio };
}

export function reorderLocalMaterial(materialId: string, direction: ReorderDirection, now = Date.now()): ReorderMaterialResponse {
  const data = readLocalData();
  const current = data.materials.find((material) => material.id === materialId);
  if (!current) {
    throw new Error('材料不存在');
  }

  const library = data.libraries.find((item) => item.id === current.libraryId);
  if (isPublicLibrary(library)) {
    throw new Error('公共资源不能排序');
  }

  const siblings = sortMaterials(data.materials.filter((material) => material.libraryId === current.libraryId && material.status !== 'archived'));
  const currentIndex = siblings.findIndex((material) => material.id === materialId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= siblings.length) {
    return { materials: siblings };
  }

  const target = siblings[targetIndex];
  const currentSortOrder = current.sortOrder;
  current.sortOrder = target.sortOrder;
  current.updatedAt = now;
  target.sortOrder = currentSortOrder;
  target.updatedAt = now;
  writeLocalData(data);

  return {
    materials: sortMaterials(data.materials.filter((material) => material.libraryId === current.libraryId && material.status !== 'archived'))
  };
}

export function deleteLocalMaterial(materialId: string): DeleteMaterialResponse {
  const data = readLocalData();
  const material = data.materials.find((item) => item.id === materialId);
  if (!material) {
    throw new Error('材料不存在');
  }

  const library = data.libraries.find((item) => item.id === material.libraryId);
  if (isPublicLibrary(library)) {
    throw new Error('公共资源不能删除');
  }

  const deletedAudioCount = data.listeningAudios.filter((audio) => audio.materialId === materialId).length;

  data.materials = data.materials.filter((material) => material.id !== materialId);
  data.listeningAudios = data.listeningAudios.filter((audio) => audio.materialId !== materialId);
  writeLocalData(data);

  return {
    materialId,
    deletedAudioCount
  };
}

export function clearLocalRepository(): void {
  clearStoredLocalData();
}

function readLocalData(): LocalData {
  const stored = readStoredLocalData();
  if (stored?.schemaVersion === LOCAL_SCHEMA_VERSION && stored.libraries?.length) {
    const normalized = normalizeLocalData(stored);
    if (normalized.changed) {
      writeLocalData(normalized.data);
    }
    return normalized.data;
  }

  const initialData = createInitialLocalData();
  writeLocalData(initialData);
  return initialData;
}

function writeLocalData(data: LocalData): void {
  writeStoredLocalData(data);
}

function createLocalId(prefix: string, now: number): string {
  return `local-${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}`;
}
