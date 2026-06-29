import { deletePracticeGroup, listPracticeGroups } from '../../miniprogram/services/practiceGroups';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';
import { PracticeGroup } from '../../miniprogram/types/practice';

interface PracticeGroupsData {
  mode: DataMode;
  groups: PracticeGroup[];
}

Page<PracticeGroupsData, {
  load: () => void;
  createGroup: () => void;
  openGroup: (event: { currentTarget: { dataset: { id: string } } }) => void;
  editGroup: (event: { currentTarget: { dataset: { id: string } } }) => void;
  deleteGroup: (event: { currentTarget: { dataset: { id: string; name: string } } }) => Promise<void>;
}>({
  data: {
    mode: 'local',
    groups: []
  },

  onLoad(query) {
    this.setData({ mode: parseDataMode(query?.mode) });
    this.load();
  },

  onShow() {
    this.load();
  },

  load() {
    this.setData({ groups: listPracticeGroups(this.data.mode) });
  },

  createGroup() {
    wx.navigateTo({ url: `/pages/practice/group-edit?mode=${this.data.mode}` });
  },

  openGroup(event) {
    wx.navigateTo({ url: `/pages/practice/player?mode=${this.data.mode}&sourceType=group&sourceId=${event.currentTarget.dataset.id}` });
  },

  editGroup(event) {
    wx.navigateTo({ url: `/pages/practice/group-edit?mode=${this.data.mode}&groupId=${event.currentTarget.dataset.id}` });
  },

  async deleteGroup(event) {
    const confirmed = await wx.showModal({
      title: '删除练习组',
      content: `确认删除“${event.currentTarget.dataset.name}”？`,
      showCancel: true
    });
    if (!confirmed.confirm) {
      return;
    }

    deletePracticeGroup(this.data.mode, event.currentTarget.dataset.id);
    wx.showToast({ title: '已删除', icon: 'success' });
    this.load();
  }
});
