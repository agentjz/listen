import { buildWorkspaceActions, getWorkspaceByMode, WorkspaceAction, WorkspaceSummary } from '../../miniprogram/lib/workspaces';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';

interface WorkspaceData {
  mode: DataMode;
  workspace: WorkspaceSummary;
  actions: WorkspaceAction[];
}

Page<WorkspaceData, {
  openAction: (event: { currentTarget: { dataset: { url: string } } }) => void;
}>({
  data: {
    mode: 'local',
    workspace: getWorkspaceByMode('local'),
    actions: buildWorkspaceActions('local')
  },

  onLoad(query) {
    const mode = parseDataMode(query?.mode);
    this.setData({
      mode,
      workspace: getWorkspaceByMode(mode),
      actions: buildWorkspaceActions(mode)
    });
  },

  openAction(event) {
    wx.navigateTo({ url: event.currentTarget.dataset.url });
  }
});
