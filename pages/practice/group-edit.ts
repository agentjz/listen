import { buildPracticeMaterials } from '../../miniprogram/lib/practice';
import { toggleSelection, selectAll } from '../../miniprogram/lib/selection';
import { loadSnapshotByMode } from '../../miniprogram/services/runtimeData';
import { getPracticeGroup, savePracticeGroup } from '../../miniprogram/services/practiceGroups';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';
import { PracticeMaterial } from '../../miniprogram/types/practice';

interface PracticeGroupMaterialItem extends PracticeMaterial {
  isSelected: boolean;
}

interface PracticeGroupEditData {
  mode: DataMode;
  groupId: string;
  groupName: string;
  materials: PracticeGroupMaterialItem[];
  selectedMaterialIds: string[];
  selectedCount: number;
  isLoading: boolean;
  isSaving: boolean;
}

Page<PracticeGroupEditData, {
  load: () => Promise<void>;
  onNameInput: (event: { detail: { value: string } }) => void;
  toggleMaterial: (event: { currentTarget: { dataset: { id: string } } }) => void;
  selectAllMaterials: () => void;
  clearSelection: () => void;
  refreshSelection: (selectedMaterialIds: string[]) => void;
  saveGroup: () => Promise<void>;
}>({
  data: {
    mode: 'local',
    groupId: '',
    groupName: '',
    materials: [],
    selectedMaterialIds: [],
    selectedCount: 0,
    isLoading: true,
    isSaving: false
  },

  async onLoad(query) {
    this.setData({
      mode: parseDataMode(query?.mode),
      groupId: query?.groupId ?? ''
    });
    await this.load();
  },

  async load() {
    try {
      const existingGroup = this.data.groupId ? getPracticeGroup(this.data.mode, this.data.groupId) : null;
      const snapshot = await loadSnapshotByMode(this.data.mode);
      const selectedMaterialIds = existingGroup?.materialIds ?? this.data.selectedMaterialIds;
      const materials = buildPracticeMaterials({
        libraries: snapshot.data.libraries,
        materials: snapshot.data.materials,
        listeningAudios: snapshot.data.listeningAudios
      }).map((material) => ({
        ...material,
        isSelected: selectedMaterialIds.includes(material.id)
      }));
      const availableIds = new Set(materials.map((material) => material.id));
      const availableSelectedIds = selectedMaterialIds.filter((id) => availableIds.has(id));

      this.setData({
        groupName: existingGroup?.name ?? this.data.groupName,
        materials: materials.map((material) => ({
          ...material,
          isSelected: availableSelectedIds.includes(material.id)
        })),
        selectedMaterialIds: availableSelectedIds,
        selectedCount: availableSelectedIds.length,
        isLoading: false
      });
    } catch (error) {
      this.setData({ isLoading: false });
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  onNameInput(event) {
    this.setData({ groupName: event.detail.value });
  },

  toggleMaterial(event) {
    if (this.data.isSaving) {
      return;
    }

    this.refreshSelection(toggleSelection(this.data.selectedMaterialIds, event.currentTarget.dataset.id));
  },

  selectAllMaterials() {
    if (this.data.isSaving) {
      return;
    }

    this.refreshSelection(selectAll(this.data.materials.map((material) => material.id)));
  },

  clearSelection() {
    if (this.data.isSaving) {
      return;
    }

    this.refreshSelection([]);
  },

  refreshSelection(selectedMaterialIds) {
    this.setData({
      selectedMaterialIds,
      selectedCount: selectedMaterialIds.length,
      materials: this.data.materials.map((material) => ({
        ...material,
        isSelected: selectedMaterialIds.includes(material.id)
      }))
    });
  },

  async saveGroup() {
    if (this.data.isSaving) {
      return;
    }

    try {
      this.setData({ isSaving: true });
      savePracticeGroup({
        mode: this.data.mode,
        groupId: this.data.groupId || undefined,
        name: this.data.groupName,
        materialIds: this.data.selectedMaterialIds
      });
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.redirectTo({ url: `/pages/practice/groups?mode=${this.data.mode}` });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' });
      this.setData({ isSaving: false });
    }
  }
});
