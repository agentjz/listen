import { UNFILED_LIBRARY_ID } from '../../miniprogram/lib/libraries';
import { loadSnapshotByMode, moveMaterialByMode, syncCloudData } from '../../miniprogram/services/runtimeData';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';

interface CandidateMaterial extends Material {
  isMoving: boolean;
}

interface ImportExistingData {
  mode: DataMode;
  targetLibraryId: string;
  targetLibraryName: string;
  candidates: CandidateMaterial[];
  isLoading: boolean;
}

Page<ImportExistingData, {
  load: () => Promise<void>;
  importMaterial: (event: { currentTarget: { dataset: { id: string } } }) => Promise<void>;
  sortMaterials: (materials: Material[]) => Material[];
  resolveTargetLibrary: (libraries: SourceLibrary[]) => SourceLibrary;
}>({
  data: {
    mode: 'local',
    targetLibraryId: '',
    targetLibraryName: '',
    candidates: [],
    isLoading: true
  },

  async onLoad(query) {
    this.setData({
      mode: parseDataMode(query?.mode),
      targetLibraryId: query?.targetLibraryId ?? ''
    });
    await this.load();
  },

  async load() {
    try {
      const snapshot = await loadSnapshotByMode(this.data.mode);
      const targetLibrary = this.resolveTargetLibrary(snapshot.data.libraries);
      const candidates = this.sortMaterials(
        snapshot.data.materials.filter((material) => material.libraryId === UNFILED_LIBRARY_ID && material.status !== 'archived')
      ).map((material) => ({
        ...material,
        isMoving: false
      }));

      this.setData({
        targetLibraryName: targetLibrary.name,
        candidates,
        isLoading: false
      });
    } catch (error) {
      this.setData({ isLoading: false });
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  resolveTargetLibrary(libraries) {
    const targetLibrary = libraries.find((library) => library.id === this.data.targetLibraryId);
    if (!targetLibrary) {
      throw new Error('目标分类不存在');
    }

    if (targetLibrary.id === UNFILED_LIBRARY_ID) {
      throw new Error('未归类材料不需要导入');
    }

    if (targetLibrary.kind !== 'user') {
      throw new Error('公共资源不能导入材料');
    }

    return targetLibrary;
  },

  sortMaterials(materials) {
    return [...materials].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.createdAt - right.createdAt;
    });
  },

  async importMaterial(event) {
    const materialId = event.currentTarget.dataset.id;
    if (!materialId) {
      return;
    }

    try {
      this.setData({
        candidates: this.data.candidates.map((material) => ({
          ...material,
          isMoving: material.id === materialId
        }))
      });
      await moveMaterialByMode(this.data.mode, materialId, this.data.targetLibraryId);
      if (this.data.mode === 'cloud') {
        await syncCloudData();
      }
      wx.showToast({ title: '已导入', icon: 'success' });
      wx.redirectTo({ url: `/pages/materials/materials?mode=${this.data.mode}&libraryId=${this.data.targetLibraryId}` });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '导入失败', icon: 'none' });
      await this.load();
    }
  }
});
