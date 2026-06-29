import { callCloudFunction } from '../../miniprogram/services/cloud';
import { loadSnapshotByMode, syncCloudData, updateMaterialByMode } from '../../miniprogram/services/runtimeData';
import { chooseAndReplaceMaterialAudio } from '../../miniprogram/services/upload';
import { isPublicLibrary } from '../../miniprogram/lib/libraries';
import { ListeningAudio, Material } from '../../miniprogram/types/domain';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';

interface DetailData {
  mode: DataMode;
  action: 'view' | 'edit';
  isEditing: boolean;
  openid: string;
  materialId: string;
  material: Material | null;
  titleInput: string;
  contentInput: string;
  audios: ListeningAudio[];
  isSaving: boolean;
  isUploading: boolean;
  isGenerating: boolean;
}

Page<DetailData, {
  load: () => Promise<void>;
  onTitleInput: (event: { detail: { value: string } }) => void;
  onContentInput: (event: { detail: { value: string } }) => void;
  saveMaterial: () => Promise<void>;
  uploadAudio: () => Promise<void>;
  generateAudio: () => Promise<void>;
}>({
  data: {
    mode: 'local',
    action: 'view',
    isEditing: false,
    openid: '',
    materialId: '',
    material: null,
    titleInput: '',
    contentInput: '',
    audios: [],
    isSaving: false,
    isUploading: false,
    isGenerating: false
  },

  async onLoad(query) {
    const action = query?.action === 'edit' ? 'edit' : 'view';
    this.setData({
      mode: parseDataMode(query?.mode),
      action,
      isEditing: action === 'edit',
      materialId: query?.materialId ?? ''
    });
    await this.load();
  },

  async load() {
    try {
      const snapshot = await loadSnapshotByMode(this.data.mode);
      const material = snapshot.data.materials.find((item) => item.id === this.data.materialId) ?? null;
      const audios = snapshot.data.listeningAudios.filter((audio) => audio.materialId === this.data.materialId);
      const library = snapshot.data.libraries.find((item) => item.id === material?.libraryId);
      const canEdit = !!material && !isPublicLibrary(library);

      this.setData({
        openid: snapshot.session.openid,
        material,
        titleInput: material?.title ?? '',
        contentInput: material?.content ?? '',
        audios,
        isEditing: this.data.action === 'edit' && canEdit
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  onTitleInput(event) {
    this.setData({ titleInput: event.detail.value });
  },

  onContentInput(event) {
    this.setData({ contentInput: event.detail.value });
  },

  async saveMaterial() {
    try {
      this.setData({ isSaving: true });
      await updateMaterialByMode(this.data.mode, {
        materialId: this.data.materialId,
        title: this.data.titleInput,
        content: this.data.contentInput
      });
      if (this.data.mode === 'cloud') {
        await syncCloudData();
      }
      wx.showToast({ title: '已保存', icon: 'success' });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  },

  async uploadAudio() {
    try {
      this.setData({ isUploading: true });
      await chooseAndReplaceMaterialAudio({
        mode: this.data.mode,
        openid: this.data.openid,
        materialId: this.data.materialId
      });
      if (this.data.mode === 'cloud') {
        await syncCloudData();
      }
      wx.showToast({ title: '已上传', icon: 'success' });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '上传失败', icon: 'none' });
    } finally {
      this.setData({ isUploading: false });
    }
  },

  async generateAudio() {
    try {
      this.setData({ isGenerating: true });
      await callCloudFunction('generateAudio', {
        materialId: this.data.materialId,
        text: this.data.contentInput
      });
      await syncCloudData();
      wx.showToast({ title: '已生成', icon: 'success' });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '生成失败', icon: 'none' });
    } finally {
      this.setData({ isGenerating: false });
    }
  }
});
