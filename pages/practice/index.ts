import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';

interface PracticeIndexData {
  mode: DataMode;
  modeLabel: string;
  allDescription: string;
  groupDescription: string;
}

Page<PracticeIndexData, {
  startAll: () => void;
  openCategories: () => void;
  openGroups: () => void;
}>({
  data: {
    mode: 'local',
    modeLabel: '本地',
    allDescription: '本地所有有音频材料',
    groupDescription: '使用保存的本地练习组'
  },

  onLoad(query) {
    const mode = parseDataMode(query?.mode);
    const modeLabel = mode === 'local' ? '本地' : '云端';
    this.setData({
      mode,
      modeLabel,
      allDescription: `${modeLabel}所有有音频材料`,
      groupDescription: mode === 'local' ? '使用保存的本地练习组' : '当前设备保存的云端练习组'
    });
  },

  startAll() {
    wx.navigateTo({ url: `/pages/practice/player?mode=${this.data.mode}&sourceType=all` });
  },

  openCategories() {
    wx.navigateTo({ url: `/pages/practice/categories?mode=${this.data.mode}` });
  },

  openGroups() {
    wx.navigateTo({ url: `/pages/practice/groups?mode=${this.data.mode}` });
  }
});
