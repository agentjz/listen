import { buildWorkspaceUrl, WORKSPACES, WorkspaceSummary } from '../../miniprogram/lib/workspaces';

interface HomeData {
  workspaces: WorkspaceSummary[];
}

Page<HomeData, {
  openWorkspace: (event: { currentTarget: { dataset: { mode: WorkspaceSummary['mode'] } } }) => void;
}>({
  data: {
    workspaces: WORKSPACES
  },

  openWorkspace(event) {
    wx.navigateTo({ url: buildWorkspaceUrl(event.currentTarget.dataset.mode) });
  }
});
