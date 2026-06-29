import { buildSaveMaterialRequest, MaterialDraftInput } from './materialDraft';
import { callCloudFunction, login } from './cloud';
import { readSession, readSyncData, writeSession, writeSyncData } from './cache';
import {
  createLocalLibrary,
  deleteLocalLibrary,
  deleteLocalMaterial,
  loadLocalSnapshot,
  moveLocalMaterial,
  replaceLocalMaterialAudio,
  renameLocalLibrary,
  reorderLocalMaterial,
  saveLocalMaterial,
  updateLocalMaterial
} from './localRepository';
import { DataMode } from '../types/runtime';
import {
  DeleteLibraryResponse,
  DeleteMaterialResponse,
  LoginResponse,
  MoveMaterialResponse,
  ReorderDirection,
  ReorderMaterialResponse,
  ReplaceListeningAudioResponse,
  RenameLibraryResponse,
  SaveLibraryResponse,
  SaveMaterialResponse,
  SyncDataRequest,
  SyncDataResponse,
  UpdateMaterialResponse
} from '../types/api';
import { AudioFormat } from '../types/domain';
import { UNFILED_LIBRARY_ID } from '../lib/libraries';

export interface AppSnapshot {
  session: LoginResponse;
  data: SyncDataResponse;
}

const LOCAL_SESSION: LoginResponse = {
  openid: 'local-user',
  isAdmin: false
};

export async function loadSnapshotByMode(mode: DataMode): Promise<AppSnapshot> {
  if (mode === 'local') {
    return {
      session: LOCAL_SESSION,
      data: loadLocalSnapshot()
    };
  }

  const session = await ensureCloudSession();
  const cached = readSyncData();
  const data = cached ?? (await syncCloudData());
  return { session, data };
}

export async function syncCloudData(request: SyncDataRequest = {}): Promise<SyncDataResponse> {
  const data = await callCloudFunction<SyncDataResponse>('syncData', request);
  writeSyncData(data);
  return data;
}

export async function saveDraftMaterialByMode(mode: DataMode, input: MaterialDraftInput): Promise<SaveMaterialResponse> {
  const unfiledInput = {
    ...input,
    libraryId: UNFILED_LIBRARY_ID
  };

  if (mode === 'local') {
    return saveLocalMaterial(unfiledInput);
  }

  return callCloudFunction<SaveMaterialResponse>('saveMaterial', buildSaveMaterialRequest(unfiledInput));
}

export async function saveLibraryByMode(mode: DataMode, name: string): Promise<SaveLibraryResponse> {
  if (mode === 'local') {
    return createLocalLibrary(name);
  }

  return callCloudFunction<SaveLibraryResponse>('saveLibrary', { name });
}

export async function deleteLibraryByMode(mode: DataMode, libraryId: string): Promise<DeleteLibraryResponse> {
  if (mode === 'local') {
    return deleteLocalLibrary(libraryId);
  }

  return callCloudFunction<DeleteLibraryResponse>('deleteLibrary', { libraryId });
}

export async function renameLibraryByMode(mode: DataMode, libraryId: string, name: string): Promise<RenameLibraryResponse> {
  if (mode === 'local') {
    return renameLocalLibrary(libraryId, name);
  }

  return callCloudFunction<RenameLibraryResponse>('renameLibrary', { libraryId, name });
}

export async function moveMaterialByMode(mode: DataMode, materialId: string, libraryId: string): Promise<MoveMaterialResponse> {
  if (mode === 'local') {
    return moveLocalMaterial(materialId, libraryId);
  }

  return callCloudFunction<MoveMaterialResponse>('moveMaterial', { materialId, libraryId });
}

export async function updateMaterialByMode(
  mode: DataMode,
  input: {
    materialId: string;
    title?: string;
    content: string;
  }
): Promise<UpdateMaterialResponse> {
  if (mode === 'local') {
    return updateLocalMaterial(input.materialId, input);
  }

  return callCloudFunction<UpdateMaterialResponse>('updateMaterial', input);
}

export async function replaceListeningAudioByMode(
  mode: DataMode,
  input: {
    materialId: string;
    cloudFileId: string;
    format: AudioFormat;
    durationMs?: number;
  }
): Promise<ReplaceListeningAudioResponse> {
  if (mode === 'local') {
    return replaceLocalMaterialAudio(input.materialId, input);
  }

  return callCloudFunction<ReplaceListeningAudioResponse>('replaceListeningAudio', input);
}

export async function reorderMaterialByMode(
  mode: DataMode,
  materialId: string,
  direction: ReorderDirection
): Promise<ReorderMaterialResponse> {
  if (mode === 'local') {
    return reorderLocalMaterial(materialId, direction);
  }

  return callCloudFunction<ReorderMaterialResponse>('reorderMaterial', { materialId, direction });
}

export async function deleteMaterialByMode(mode: DataMode, materialId: string): Promise<DeleteMaterialResponse> {
  if (mode === 'local') {
    return deleteLocalMaterial(materialId);
  }

  return callCloudFunction<DeleteMaterialResponse>('deleteMaterial', { materialId });
}

async function ensureCloudSession(): Promise<LoginResponse> {
  const cached = readSession();
  if (cached?.openid) {
    return cached;
  }

  const session = await login();
  writeSession(session);
  return session;
}
