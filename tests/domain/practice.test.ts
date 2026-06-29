import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advancePracticeQueue,
  buildLibraryPracticeSummaries,
  buildPracticeMaterials,
  createPracticeQueue,
  filterPracticeMaterials,
  getCurrentPracticeMaterial,
  sanitizePracticeMaterialIds
} from '../../miniprogram/lib/practice';
import { ListeningAudio, Material, SourceLibrary } from '../../miniprogram/types/domain';

const libraries: SourceLibrary[] = [
  createLibrary('library-a', 'A', 100),
  createLibrary('library-b', 'B', 200)
];

const materials: Material[] = [
  createMaterial('a-1', 'library-a', 100),
  createMaterial('a-2', 'library-a', 200),
  createMaterial('b-1', 'library-b', 300),
  { ...createMaterial('archived', 'library-b', 400), status: 'archived' }
];

const audios: ListeningAudio[] = [
  createAudio('audio-a-1', 'a-1'),
  createAudio('audio-b-1', 'b-1'),
  createAudio('audio-archived', 'archived')
];

test('buildPracticeMaterials keeps only active materials with audio', () => {
  const practiceMaterials = buildPracticeMaterials({ libraries, materials, listeningAudios: audios });

  assert.deepEqual(practiceMaterials.map((material) => material.id), ['a-1', 'b-1']);
  assert.equal(practiceMaterials[0]?.libraryName, 'A');
  assert.equal(practiceMaterials[0]?.audio.id, 'audio-a-1');
});

test('filterPracticeMaterials supports all library and group sources', () => {
  const practiceMaterials = buildPracticeMaterials({ libraries, materials, listeningAudios: audios });

  assert.equal(filterPracticeMaterials({ materials: practiceMaterials, source: { type: 'all' } }).length, 2);
  assert.deepEqual(filterPracticeMaterials({ materials: practiceMaterials, source: { type: 'library', id: 'library-b' } }).map((item) => item.id), ['b-1']);
  assert.deepEqual(
    filterPracticeMaterials({
      materials: practiceMaterials,
      source: { type: 'group', id: 'group-1' },
      group: {
        id: 'group-1',
        mode: 'local',
        name: 'Group',
        materialIds: ['missing', 'a-1'],
        createdAt: 1,
        updatedAt: 1
      }
    }).map((item) => item.id),
    ['a-1']
  );
});

test('buildLibraryPracticeSummaries returns only libraries with playable materials', () => {
  const practiceMaterials = buildPracticeMaterials({ libraries, materials, listeningAudios: audios });
  const summaries = buildLibraryPracticeSummaries({ libraries, materials: practiceMaterials });

  assert.deepEqual(summaries, [
    { id: 'library-a', name: 'A', materialCount: 1 },
    { id: 'library-b', name: 'B', materialCount: 1 }
  ]);
});

test('practice queue shuffles unique ids and advances without repeating in a round', () => {
  const queue = createPracticeQueue(['a', 'b', 'a', 'c'], () => 0);

  assert.deepEqual(queue.materialIds.sort(), ['a', 'b', 'c']);

  const second = advancePracticeQueue({ materialIds: ['a', 'b'], currentIndex: 0 }, ['a', 'b'], () => 0);
  assert.equal(second.currentIndex, 1);

  const nextRound = advancePracticeQueue({ materialIds: ['a', 'b'], currentIndex: 1 }, ['a', 'b'], () => 0);
  assert.equal(nextRound.currentIndex, 0);
  assert.deepEqual(nextRound.materialIds.sort(), ['a', 'b']);
});

test('getCurrentPracticeMaterial returns null for stale ids', () => {
  const practiceMaterials = buildPracticeMaterials({ libraries, materials, listeningAudios: audios });

  assert.equal(getCurrentPracticeMaterial(practiceMaterials, { materialIds: ['missing'], currentIndex: 0 }), null);
  assert.equal(getCurrentPracticeMaterial(practiceMaterials, { materialIds: ['a-1'], currentIndex: 0 })?.id, 'a-1');
});

test('sanitizePracticeMaterialIds trims removes empty and deduplicates ids', () => {
  assert.deepEqual(sanitizePracticeMaterialIds([' a ', '', 'a', 'b']), ['a', 'b']);
});

function createLibrary(id: string, name: string, sortOrder: number): SourceLibrary {
  return {
    id,
    name,
    kind: 'user',
    ownerOpenid: 'user',
    sortOrder,
    createdAt: sortOrder,
    updatedAt: sortOrder
  };
}

function createMaterial(id: string, libraryId: string, sortOrder: number): Material {
  return {
    id,
    libraryId,
    ownerOpenid: 'user',
    title: id,
    content: id,
    status: 'ready',
    audioCount: 1,
    sortOrder,
    createdAt: sortOrder,
    updatedAt: sortOrder
  };
}

function createAudio(id: string, materialId: string): ListeningAudio {
  return {
    id,
    materialId,
    sourceKind: 'upload',
    format: 'mp3',
    cloudFileId: `/audio/${id}.mp3`,
    createdAt: 1,
    updatedAt: 1
  };
}
