import { DataMode } from '../types/runtime';

export type WorkspaceKind = 'test' | 'cloud';
export type WorkspaceActionKind = 'resources' | 'create' | 'practice';

export interface WorkspaceSummary {
  kind: WorkspaceKind;
  mode: DataMode;
  name: string;
  icon: string;
  description: string;
}

export interface WorkspaceAction {
  kind: WorkspaceActionKind;
  title: string;
  icon: string;
  description: string;
  url: string;
}

export const WORKSPACES: WorkspaceSummary[] = [
  {
    kind: 'test',
    mode: 'local',
    name: '测试入口',
    icon: 'desktop-o',
    description: '本地资源、本地新建、本地练习'
  },
  {
    kind: 'cloud',
    mode: 'cloud',
    name: '云端入口',
    icon: 'upgrade',
    description: '云端资源、云端新建、云端练习'
  }
];

export function getWorkspaceByMode(mode: DataMode): WorkspaceSummary {
  return WORKSPACES.find((workspace) => workspace.mode === mode) ?? WORKSPACES[0];
}

export function buildWorkspaceUrl(mode: DataMode): string {
  return `/pages/workspace/workspace?mode=${mode}`;
}

export function buildWorkspaceActions(mode: DataMode): WorkspaceAction[] {
  const prefix = mode === 'local' ? '本地' : '云端';

  return [
    {
      kind: 'resources',
      title: `${prefix}资源`,
      icon: mode === 'local' ? 'cluster-o' : 'upgrade',
      description: `查看和管理${prefix}材料`,
      url: `/pages/resources/resources?mode=${mode}`
    },
    {
      kind: 'create',
      title: `${prefix}新建`,
      icon: 'records-o',
      description: `新建${prefix}听写材料`,
      url: `/pages/import/import?mode=${mode}`
    },
    {
      kind: 'practice',
      title: `${prefix}练习`,
      icon: 'play-circle-o',
      description: `随机播放${prefix}有音频材料`,
      url: `/pages/practice/index?mode=${mode}`
    }
  ];
}
