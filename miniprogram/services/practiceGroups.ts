import { DataMode } from '../types/runtime';
import { PracticeGroup, PracticeGroupsByMode } from '../types/practice';
import { sanitizePracticeMaterialIds } from '../lib/practice';

const PRACTICE_GROUPS_KEY = 'listen.practiceGroups';

export function listPracticeGroups(mode: DataMode): PracticeGroup[] {
  return readPracticeGroups()[mode];
}

export function getPracticeGroup(mode: DataMode, groupId: string): PracticeGroup | null {
  return listPracticeGroups(mode).find((group) => group.id === groupId) ?? null;
}

export function savePracticeGroup(input: {
  mode: DataMode;
  name: string;
  materialIds: string[];
  groupId?: string;
  now?: number;
}): PracticeGroup {
  const name = input.name.trim();
  if (!name) {
    throw new Error('请填写练习组名称');
  }

  const materialIds = sanitizePracticeMaterialIds(input.materialIds);
  if (materialIds.length === 0) {
    throw new Error('请选择材料');
  }

  const now = input.now ?? Date.now();
  const store = readPracticeGroups();
  const groups = store[input.mode];
  const existing = input.groupId ? groups.find((group) => group.id === input.groupId) : undefined;

  if (existing) {
    existing.name = name;
    existing.materialIds = materialIds;
    existing.updatedAt = now;
    writePracticeGroups(store);
    return existing;
  }

  const group: PracticeGroup = {
    id: createPracticeGroupId(now),
    mode: input.mode,
    name,
    materialIds,
    createdAt: now,
    updatedAt: now
  };

  groups.unshift(group);
  writePracticeGroups(store);
  return group;
}

export function deletePracticeGroup(mode: DataMode, groupId: string): void {
  const store = readPracticeGroups();
  store[mode] = store[mode].filter((group) => group.id !== groupId);
  writePracticeGroups(store);
}

export function clearPracticeGroups(): void {
  wx.removeStorageSync(PRACTICE_GROUPS_KEY);
}

function readPracticeGroups(): PracticeGroupsByMode {
  const stored = wx.getStorageSync<PracticeGroupsByMode | null>(PRACTICE_GROUPS_KEY);
  return {
    local: Array.isArray(stored?.local) ? stored.local : [],
    cloud: Array.isArray(stored?.cloud) ? stored.cloud : []
  };
}

function writePracticeGroups(groups: PracticeGroupsByMode): void {
  wx.setStorageSync(PRACTICE_GROUPS_KEY, groups);
}

function createPracticeGroupId(now: number): string {
  return `practice-group-${now}-${Math.random().toString(36).slice(2, 8)}`;
}
