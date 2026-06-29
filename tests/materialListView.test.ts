import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_RESOURCES_VIEW_ID, PUBLIC_LIBRARY_ID, UNFILED_LIBRARY_ID } from '../miniprogram/lib/libraries';
import { buildMaterialListView, formatPlaybackTime } from '../miniprogram/lib/materialListView';
import { getDragTargetIndex, moveItemPreview } from '../miniprogram/lib/dragOrder';
import { ListeningAudio, Material, SourceLibrary } from '../miniprogram/types/domain';

const libraries: SourceLibrary[] = [
  {
    id: PUBLIC_LIBRARY_ID,
    name: '公共资源',
    kind: 'general',
    sortOrder: 100,
    createdAt: 1,
    updatedAt: 1
  },
  {
    id: UNFILED_LIBRARY_ID,
    name: '未归类材料',
    kind: 'user',
    ownerOpenid: 'local-user',
    sortOrder: 999999,
    createdAt: 1,
    updatedAt: 1
  }
];

const materials: Material[] = [
  createMaterial('public-dog', PUBLIC_LIBRARY_ID, 1000, 1),
  createMaterial('my-friend', UNFILED_LIBRARY_ID, 500, 2)
];

const audios: ListeningAudio[] = [
  {
    id: 'audio-1',
    materialId: 'public-dog',
    sourceKind: 'upload',
    format: 'mp3',
    cloudFileId: '/local-assets/dog/audio.mp3',
    createdAt: 1,
    updatedAt: 1
  }
];

test('buildMaterialListView aggregates all visible materials for the virtual all resources view', () => {
  const view = buildMaterialListView({
    libraryId: ALL_RESOURCES_VIEW_ID,
    highlightMaterialId: 'my-friend',
    libraries,
    materials,
    listeningAudios: audios
  });

  assert.equal(view.libraryName, '全部资源');
  assert.equal(view.isAllResources, true);
  assert.equal(view.materials.length, 2);
  assert.equal(view.materials[0]?.id, 'my-friend');
  assert.equal(view.materials[0]?.isHighlighted, true);
  assert.equal(view.materials[1]?.isPublicMaterial, true);
  assert.equal(view.materials[1]?.hasAudio, true);
});

test('formatPlaybackTime formats finite and invalid values safely', () => {
  assert.equal(formatPlaybackTime(65.9), '01:05');
  assert.equal(formatPlaybackTime(Number.NaN), '00:00');
});

test('drag order helpers preview movement and clamp target index', () => {
  assert.deepEqual(moveItemPreview(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.equal(getDragTargetIndex({ startY: 0, currentY: 500, itemHeight: 100, sourceIndex: 0, itemCount: 3 }), 2);
});

function createMaterial(id: string, libraryId: string, sortOrder: number, createdAt: number): Material {
  return {
    id,
    libraryId,
    ownerOpenid: 'local-user',
    title: id,
    content: id,
    status: 'ready',
    audioCount: 0,
    sortOrder,
    createdAt,
    updatedAt: createdAt
  };
}
