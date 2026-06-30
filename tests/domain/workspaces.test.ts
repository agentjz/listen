import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorkspaceActions, buildWorkspaceUrl, getWorkspaceByMode, WORKSPACES } from '../../miniprogram/lib/workspaces';

const verifiedVantIcons = new Set([
  'cluster-o',
  'desktop-o',
  'play-circle-o',
  'records-o',
  'upgrade'
]);

test('workspace summaries expose test and cloud entries', () => {
  assert.deepEqual(WORKSPACES.map((workspace) => workspace.name), ['测试入口', '云端入口']);
  assert.deepEqual(WORKSPACES.map((workspace) => workspace.mode), ['local', 'cloud']);
});

test('buildWorkspaceUrl routes to the workspace page with mode', () => {
  assert.equal(buildWorkspaceUrl('local'), '/pages/workspace/workspace?mode=local');
  assert.equal(buildWorkspaceUrl('cloud'), '/pages/workspace/workspace?mode=cloud');
});

test('buildWorkspaceActions mirrors resources create and practice actions by mode', () => {
  const localActions = buildWorkspaceActions('local');
  const cloudActions = buildWorkspaceActions('cloud');

  assert.deepEqual(localActions.map((action) => action.title), ['本地资源', '本地新建', '本地练习']);
  assert.deepEqual(localActions.map((action) => action.url), [
    '/pages/resources/resources?mode=local',
    '/pages/import/import?mode=local',
    '/pages/practice/index?mode=local'
  ]);
  assert.deepEqual(cloudActions.map((action) => action.title), ['云端资源', '云端新建', '云端练习']);
  assert.deepEqual(cloudActions.map((action) => action.url), [
    '/pages/resources/resources?mode=cloud',
    '/pages/import/import?mode=cloud',
    '/pages/practice/index?mode=cloud'
  ]);
});

test('getWorkspaceByMode resolves workspace metadata', () => {
  assert.equal(getWorkspaceByMode('local').name, '测试入口');
  assert.equal(getWorkspaceByMode('cloud').name, '云端入口');
});

test('workspace icon names are available in the bundled Vant icon font', () => {
  const icons = [
    ...WORKSPACES.map((workspace) => workspace.icon),
    ...buildWorkspaceActions('local').map((action) => action.icon),
    ...buildWorkspaceActions('cloud').map((action) => action.icon)
  ];

  assert.deepEqual(icons.filter((icon) => !verifiedVantIcons.has(icon)), []);
});
