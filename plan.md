# 首页双通道工作区 Plan

## 1. 需求文档

当前首页直接摆出本地资源、本地新建、云端资源、云端新建和听写练习。开发阶段需要本地通道稳定测试，因为云端环境当前不可完整验证；未来正式使用时又需要云端通道成为主入口。

本次要把首页改成两个清晰入口：

- 测试入口：进入本地资源、本地新建、本地练习。
- 云端入口：进入云端资源、云端新建、云端练习。

用户打开首页时先选择工作区，再在工作区里选择资源、新建或练习。两个工作区的页面结构保持镜像，数据通道不同。本地通道用于无云环境测试，云端通道用于 CloudBase 接入后的真实数据路径。

业务完成标准：首页只显示“测试入口”和“云端入口”；进入任一入口后，看到同构的三个操作入口；本地路径无需云环境可用，云端路径继续走云端接口且失败时明确提示。

## 2. 当前事实

- 当前工作区干净，上一轮改动已提交并推送。
- `pages/home/home.ts` 当前有本地资源、本地新建、云端资源、云端新建和一个不带 mode 的听写练习入口。
- `pages/resources/resources.ts` 已支持 `mode=local|cloud`。
- `pages/import/import.ts` 已支持 `mode=local|cloud`。
- `pages/practice/categories.ts`、`pages/practice/groups.ts`、`pages/practice/player.ts` 已支持 `mode=local|cloud`。
- `pages/practice/index.ts` 当前同时展示本地练习和云端练习，不是工作区内单通道页面。
- `miniprogram/types/runtime.ts` 当前只有 `DataMode` 和 `parseDataMode`。
- `spec.md` 当前验收标准仍写首页能直接进入本地资源、本地新建、云端资源、云端新建，没有记录首页工作区结构。
- `app.json` 已包含练习相关页面。
- `npm.cmd run verify` 和 `npm.cmd run build` 是当前完整验证命令。

## 3. 失败测试

以下任一情况视为失败：

- 首页仍直接显示本地资源、本地新建、云端资源、云端新建这四个一层入口。
- 首页没有清晰区分测试入口和云端入口。
- 工作区页没有提供资源、新建、练习三个镜像操作。
- 本地工作区的练习入口没有携带 `mode=local`。
- 云端工作区的练习入口没有携带 `mode=cloud`。
- 为了正式切换入口而保留注释代码、假开关、旧入口别名或兼容转发。
- 页面结构改变后出现按钮文字溢出、入口卡片挤压、图标缺失或整行用 `button` 当卡片。
- `spec.md` 与当前首页用户路径不一致。
- `npm.cmd run verify` 或 `npm.cmd run build` 失败。

## 4. 目标

- 首页只呈现两个工作区入口：测试入口、云端入口。
- 新增或改造工作区选择后的页面，使测试入口显示本地资源、本地新建、本地练习，云端入口显示云端资源、云端新建、云端练习。
- 练习首页按传入 `mode` 只展示当前工作区的练习入口，不再在同一页混放本地和云端。
- 新增小程序端工作区配置或纯规则，集中定义工作区名称、模式、图标和入口文案。
- 补充测试保护工作区配置和练习入口路由规则。
- 同步 `spec.md` 当前事实和验收标准。

## 5. 不做范围

- 不实现云端环境部署。
- 不改变资源、新建、材料、练习播放器的数据读写行为。
- 不删除本地通道。
- 不通过注释代码切换正式入口。
- 不新增复杂权限、登录、环境变量或远程配置开关。
- 不提交或 push；commit/push 必须另行得到 owner 确认。

## 6. 设计

主链路：

1. 首页读取工作区配置，展示两个工作区入口。
2. 用户点击测试入口，进入工作区页并携带 `mode=local`。
3. 用户点击云端入口，进入工作区页并携带 `mode=cloud`。
4. 工作区页根据 `mode` 展示三个操作：资源、新建、练习。
5. 资源入口跳转 `/pages/resources/resources?mode=<mode>`。
6. 新建入口跳转 `/pages/import/import?mode=<mode>`。
7. 练习入口跳转 `/pages/practice/index?mode=<mode>`。
8. 练习首页根据 `mode` 只展示当前通道的全部随机、分类随机、练习组三个入口。

模块边界：

- `miniprogram/lib/workspaces.ts`：纯配置和路由构造规则，只描述当前有效工作区和入口，不保留隐藏旧入口。
- `pages/home/*`：只展示工作区选择，不直接承载资源、新建、练习入口。
- `pages/workspace/*`：展示单个工作区下的资源、新建、练习入口。
- `pages/practice/index.*`：展示单个 mode 的练习入口。
- `tests/domain/workspaces.test.ts`：验证工作区配置和路由生成。
- `spec.md`：同步当前产品事实和验收标准。

错误边界：

- `mode` 解析继续使用 `parseDataMode`，非法值回到 `local`。
- 云端不可用时不在首页假装可用；云端资源、新建、练习进入后由现有云端加载逻辑显示失败原因。

UI 边界：

- 入口卡片使用 `view bindtap`，不使用 `button` 当卡片。
- 两层入口都使用稳定 grid/flex 尺寸，设置 `min-width: 0` 和换行策略。
- 不加解释型长文案，不加伪统计。

## 7. 实施任务

- [x] T001 新增工作区纯规则模块；验收：能生成首页工作区配置和工作区内三个入口路由。
- [x] T002 新增工作区规则测试；验收：测试覆盖两个工作区、三类入口和 mode 路由。
- [x] T003 改造首页；验收：首页只显示测试入口和云端入口。
- [x] T004 新增工作区页面并注册路由；验收：测试入口和云端入口分别显示资源、新建、练习。
- [x] T005 改造练习首页为单 mode 页面；验收：`mode=local` 只显示本地练习，`mode=cloud` 只显示云端练习。
- [x] T006 同步 `spec.md`；验收：产品事实和验收标准描述双通道工作区。
- [x] T007 运行验证和构建；验收：`npm.cmd run verify`、`npm.cmd run build` 通过。
- [x] T008 收口记录；验收：`plan.md` 写明完成事实、验证结果和剩余风险。

## 8. 验证计划

执行：

```powershell
npm.cmd run verify
npm.cmd run build
rg "<button|button\\b|::after|display:\\s*flex|grid-template-columns|width:\\s*100%" pages app.wxss -n
```

检查：

- 首页 WXML 中不再出现直接的本地资源、本地新建、云端资源、云端新建入口。
- 首页 WXML 中存在测试入口和云端入口。
- 工作区页面存在资源、新建、练习三个入口。
- 练习首页路由带入 `mode` 并只渲染当前 mode 的入口。
- 构建产物生成到 `dist/miniprogram`。

## 9. 收口

目标已完成。

完成事实：

- 新增 `miniprogram/lib/workspaces.ts`，集中定义测试入口、云端入口和工作区内资源、新建、练习三个路由。
- 新增 `tests/domain/workspaces.test.ts`，覆盖两个工作区、工作区页路由和本地/云端镜像操作入口。
- 首页已改为只显示测试入口和云端入口。
- 新增 `pages/workspace/workspace` 并注册到 `app.json`。
- 工作区页根据 `mode=local|cloud` 展示资源、新建、练习三个入口。
- 练习首页已改为单 mode 页面；`mode=local` 展示本地练习，`mode=cloud` 展示云端练习。
- `spec.md` 已同步双通道工作区当前事实和验收标准。

验证结果：

- `npm.cmd run verify` 通过，48 个测试全部通过。
- `npm.cmd run build` 通过，`dist/miniprogram` 已生成工作区页面产物。
- UI 结构搜索已执行；入口卡片没有使用 `button`，`van-button` 仍只用于保存、新增、上传等真实命令。
- 旧首页方法名搜索无残留：`goLocalResources`、`goCloudResources`、`goLocalCreate`、`goCloudCreate`、`startAllLocal`、`startAllCloud` 等均未命中。

剩余风险：

- 未在微信开发者工具里人工点击预览；需要打开构建后的项目确认两层入口视觉和跳转手感。
- 本次没有 commit 或 push；按 `AGENTS.md` 规则，commit/push 前必须由 owner 再次明确确认。
