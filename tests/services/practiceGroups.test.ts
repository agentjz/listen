import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearPracticeGroups,
  deletePracticeGroup,
  getPracticeGroup,
  listPracticeGroups,
  savePracticeGroup
} from '../../miniprogram/services/practiceGroups';

const storage = new Map<string, unknown>();

Object.assign(globalThis, {
  wx: {
    getStorageSync<T>(key: string): T {
      return storage.get(key) as T;
    },
    setStorageSync<T>(key: string, data: T): void {
      storage.set(key, data);
    },
    removeStorageSync(key: string): void {
      storage.delete(key);
    }
  } as typeof wx
});

test('practice groups save separately for local and cloud modes', () => {
  clearPracticeGroups();

  const local = savePracticeGroup({ mode: 'local', name: 'Local', materialIds: ['a'], now: 1 });
  const cloud = savePracticeGroup({ mode: 'cloud', name: 'Cloud', materialIds: ['b'], now: 2 });

  assert.equal(listPracticeGroups('local')[0]?.id, local.id);
  assert.equal(listPracticeGroups('cloud')[0]?.id, cloud.id);
  assert.equal(getPracticeGroup('local', cloud.id), null);
});

test('practice groups validate name and material ids', () => {
  clearPracticeGroups();

  assert.throws(() => savePracticeGroup({ mode: 'local', name: ' ', materialIds: ['a'] }), /请填写练习组名称/);
  assert.throws(() => savePracticeGroup({ mode: 'local', name: 'Empty', materialIds: ['', ' '] }), /请选择材料/);
});

test('practice groups update and delete existing groups', () => {
  clearPracticeGroups();

  const group = savePracticeGroup({ mode: 'local', name: 'Before', materialIds: ['a', 'a', 'b'], now: 1 });
  const updated = savePracticeGroup({ mode: 'local', groupId: group.id, name: 'After', materialIds: ['c'], now: 2 });

  assert.equal(updated.id, group.id);
  assert.equal(updated.name, 'After');
  assert.deepEqual(updated.materialIds, ['c']);

  deletePracticeGroup('local', group.id);
  assert.equal(listPracticeGroups('local').length, 0);
});
