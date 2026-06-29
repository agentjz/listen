import { buildLibraryPracticeSummaries, buildPracticeMaterials } from '../../miniprogram/lib/practice';
import { loadSnapshotByMode } from '../../miniprogram/services/runtimeData';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';

interface CategoryPracticeItem {
  id: string;
  name: string;
  materialCount: number;
}

interface PracticeCategoriesData {
  mode: DataMode;
  isLoading: boolean;
  categories: CategoryPracticeItem[];
}

Page<PracticeCategoriesData, {
  load: () => Promise<void>;
  openCategory: (event: { currentTarget: { dataset: { id: string } } }) => void;
}>({
  data: {
    mode: 'local',
    isLoading: true,
    categories: []
  },

  async onLoad(query) {
    this.setData({ mode: parseDataMode(query?.mode) });
    await this.load();
  },

  async load() {
    try {
      const snapshot = await loadSnapshotByMode(this.data.mode);
      const materials = buildPracticeMaterials({
        libraries: snapshot.data.libraries,
        materials: snapshot.data.materials,
        listeningAudios: snapshot.data.listeningAudios
      });
      this.setData({
        isLoading: false,
        categories: buildLibraryPracticeSummaries({
          libraries: snapshot.data.libraries,
          materials
        })
      });
    } catch (error) {
      this.setData({ isLoading: false, categories: [] });
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  openCategory(event) {
    wx.navigateTo({ url: `/pages/practice/player?mode=${this.data.mode}&sourceType=library&sourceId=${event.currentTarget.dataset.id}` });
  }
});
