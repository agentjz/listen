import { ALL_RESOURCES_VIEW_ID, ALL_RESOURCES_VIEW_NAME, UNFILED_LIBRARY_ID, isPublicLibrary } from './libraries';
import { ListeningAudio, Material, SourceLibrary } from '../types/domain';

export interface MaterialListCard extends Material {
  hasAudio: boolean;
  audio: ListeningAudio | null;
  libraryName: string;
  isPublicMaterial: boolean;
  isHighlighted: boolean;
  isDragging?: boolean;
}

export interface MaterialListView {
  libraryName: string;
  isUnfiledLibrary: boolean;
  isPublicLibrary: boolean;
  isAllResources: boolean;
  primaryManageActionText: string;
  materials: MaterialListCard[];
}

export function buildMaterialListView(input: {
  libraryId: string;
  highlightMaterialId: string;
  libraries: SourceLibrary[];
  materials: Material[];
  listeningAudios: ListeningAudio[];
}): MaterialListView {
  const currentLibrary = input.libraries.find((library) => library.id === input.libraryId);
  const librariesById = new Map(input.libraries.map((library) => [library.id, library]));
  const audiosByMaterial = new Map<string, ListeningAudio>();

  for (const audio of input.listeningAudios) {
    if (!audiosByMaterial.has(audio.materialId)) {
      audiosByMaterial.set(audio.materialId, audio);
    }
  }

  const isAllResources = input.libraryId === ALL_RESOURCES_VIEW_ID;
  const isUnfiledLibrary = input.libraryId === UNFILED_LIBRARY_ID;
  const materials = input.materials
    .filter((material) => (isAllResources || material.libraryId === input.libraryId) && material.status !== 'archived')
    .sort(compareMaterials)
    .map((material) => {
      const library = librariesById.get(material.libraryId);
      const audio = audiosByMaterial.get(material.id) ?? null;
      return {
        ...material,
        hasAudio: !!audio,
        audio,
        libraryName: library?.name ?? '材料',
        isPublicMaterial: isPublicLibrary(library),
        isHighlighted: material.id === input.highlightMaterialId
      };
    });

  return {
    libraryName: isAllResources ? ALL_RESOURCES_VIEW_NAME : (currentLibrary?.name ?? '材料'),
    isUnfiledLibrary,
    isPublicLibrary: isPublicLibrary(currentLibrary),
    isAllResources,
    primaryManageActionText: isUnfiledLibrary ? '新建材料' : '导入材料',
    materials
  };
}

export function compareMaterials(left: Material, right: Material): number {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return left.createdAt - right.createdAt;
}

export function formatPlaybackTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function getReorderDirection(sourceIndex: number, targetIndex: number): 'up' | 'down' {
  return targetIndex < sourceIndex ? 'up' : 'down';
}
