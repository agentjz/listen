import { ListeningAudio, Material, SourceLibrary } from '../types/domain';
import { PracticeGroup, PracticeMaterial, PracticeQueueState, PracticeSource } from '../types/practice';

export function buildPracticeMaterials(input: {
  libraries: SourceLibrary[];
  materials: Material[];
  listeningAudios: ListeningAudio[];
}): PracticeMaterial[] {
  const librariesById = new Map(input.libraries.map((library) => [library.id, library]));
  const audiosByMaterial = new Map<string, ListeningAudio>();

  for (const audio of input.listeningAudios) {
    if (!audiosByMaterial.has(audio.materialId)) {
      audiosByMaterial.set(audio.materialId, audio);
    }
  }

  return input.materials
    .filter((material) => material.status !== 'archived')
    .map((material) => {
      const audio = audiosByMaterial.get(material.id);
      if (!audio) {
        return null;
      }

      return {
        ...material,
        audio,
        libraryName: librariesById.get(material.libraryId)?.name ?? '材料'
      };
    })
    .filter((material): material is PracticeMaterial => !!material)
    .sort(comparePracticeMaterials);
}

export function filterPracticeMaterials(input: {
  materials: PracticeMaterial[];
  source: PracticeSource;
  group?: PracticeGroup | null;
}): PracticeMaterial[] {
  if (input.source.type === 'all') {
    return input.materials;
  }

  if (input.source.type === 'library') {
    return input.materials.filter((material) => material.libraryId === input.source.id);
  }

  if (!input.group) {
    return [];
  }

  const selectedIds = new Set(input.group.materialIds);
  return input.materials.filter((material) => selectedIds.has(material.id));
}

export function buildLibraryPracticeSummaries(input: {
  libraries: SourceLibrary[];
  materials: PracticeMaterial[];
}): Array<{ id: string; name: string; materialCount: number }> {
  return input.libraries
    .map((library) => ({
      id: library.id,
      name: library.name,
      materialCount: input.materials.filter((material) => material.libraryId === library.id).length
    }))
    .filter((library) => library.materialCount > 0)
    .sort((left, right) => {
      const leftLibrary = input.libraries.find((library) => library.id === left.id);
      const rightLibrary = input.libraries.find((library) => library.id === right.id);
      const leftSort = leftLibrary?.sortOrder ?? 0;
      const rightSort = rightLibrary?.sortOrder ?? 0;
      if (leftSort !== rightSort) {
        return leftSort - rightSort;
      }

      return left.name.localeCompare(right.name);
    });
}

export function createPracticeQueue(materialIds: string[], random: () => number = Math.random): PracticeQueueState {
  return {
    materialIds: shuffleUniqueIds(materialIds, random),
    currentIndex: 0
  };
}

export function advancePracticeQueue(queue: PracticeQueueState, sourceMaterialIds: string[], random: () => number = Math.random): PracticeQueueState {
  if (sourceMaterialIds.length === 0) {
    return { materialIds: [], currentIndex: 0 };
  }

  const nextIndex = queue.currentIndex + 1;
  if (nextIndex < queue.materialIds.length) {
    return {
      ...queue,
      currentIndex: nextIndex
    };
  }

  return createPracticeQueue(sourceMaterialIds, random);
}

export function getCurrentPracticeMaterial(materials: PracticeMaterial[], queue: PracticeQueueState): PracticeMaterial | null {
  const materialId = queue.materialIds[queue.currentIndex];
  if (!materialId) {
    return null;
  }

  return materials.find((material) => material.id === materialId) ?? null;
}

export function sanitizePracticeMaterialIds(materialIds: string[]): string[] {
  return [...new Set(materialIds.map((id) => id.trim()).filter(Boolean))];
}

function shuffleUniqueIds(materialIds: string[], random: () => number): string[] {
  const ids = sanitizePracticeMaterialIds(materialIds);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    const current = ids[index];
    ids[index] = ids[targetIndex] as string;
    ids[targetIndex] = current as string;
  }
  return ids;
}

function comparePracticeMaterials(left: PracticeMaterial, right: PracticeMaterial): number {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return left.createdAt - right.createdAt;
}
