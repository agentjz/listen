# 全部资源、搜索与公共只读 Plan

## 1. 需求文档

当前产品的资源入口需要更符合“公共资源 + 用户资源”的同构模型：

- 资源页顶部提供搜索框和搜索按钮，搜索当前可见材料。
- 输入搜索词时，下方实时显示命中列表；点击某个结果后进入材料所在分类的材料页，并高亮该材料。
- 点击搜索按钮时，如果有命中结果，进入第一个命中材料所在分类并高亮；没有命中时明确提示。
- 资源列表第一个入口是“全部资源”，展示当前可见的全部材料。
- “全部资源”是虚拟视图，不写入本地缓存或云端数据库，不生成真实分类。
- 公共资源只读，只能查看和播放，不能复制、编辑、移动、删除、排序或替换音频。
- 用户自己的材料仍可在真实分类中编辑、移动、删除、排序和替换音频。

业务完成标准：用户能先搜索或进入全部资源快速找到材料；公共材料不会产生用户副本；所有写操作只作用于真实用户材料。

同时执行一次文件职责审计：超过 250 行的源码文件必须触发审查；只有职责确实混杂时才拆分，不按行数机械拆文件。

## 2. 当前事实

- 本地和云端已经使用同一套 `SourceLibrary / Material / ListeningAudio` 数据结构。
- 本地初始化已有“公共资源”和置底“未归类材料”。
- 云端 `syncData` 已返回用户材料和公共分类材料。
- 资源页当前只展示真实分类，没有“全部资源”虚拟入口。
- 资源页当前没有搜索。
- 材料页当前按单个真实分类过滤材料。
- 公共材料复制路径已删除：API、runtime service、本地仓库函数、云函数、页面按钮和测试均不保留复制能力。
- 当前扫描到超过 250 行的 TypeScript 源文件包括 `miniprogram/services/localRepository.ts` 和 `pages/materials/materials.ts`；同名 `.js` 是 TypeScript 构建产物，不作为源文件拆分目标。

## 3. 失败测试

完成前以下情况代表失败：

- “全部资源”被写入缓存、生成文件或云端集合。
- 资源页顶部没有搜索框和搜索按钮。
- 输入搜索词后没有实时结果列表、空结果提示或可点击结果。
- 点击搜索按钮后没有进入第一个命中材料所在分类并高亮。
- 搜索结果点击后进入详情页，而不是材料所属分类的材料页。
- 搜索跳转后目标材料没有高亮提示。
- 公共资源仍显示复制入口，或仍存在复制云函数/API/service。
- 普通用户可以对公共材料做编辑、移动、删除、排序、替换音频或生成音频。
- 本地和云端入口行为不一致。
- 超过 250 行且职责混杂的源码文件未经拆分或未记录“不拆”的审计理由。

## 4. 目标

- 增加 `ALL_RESOURCES_VIEW_ID` 虚拟视图常量，仅用于页面路由和展示。
- 资源页列表顺序：搜索框、全部资源、公共资源、用户普通分类、未归类材料置底。
- 资源页搜索当前可见材料，结果展示标题、所属分类和是否有音频；无结果时显示明确空状态。
- 搜索按钮使用当前搜索词执行命令：有命中则进入第一个结果，没有命中则 toast。
- 搜索结果点击进入 `/pages/materials/materials?mode=...&libraryId=<真实分类>&highlightMaterialId=<材料>`。
- 材料页支持全部资源虚拟视图，聚合全部可见材料，并按所属分类标注来源。
- 材料页接收 `highlightMaterialId`，加载后给目标材料一次高亮效果。
- 公共资源管理入口只提示“公共资源无法管理”，不进入管理态。
- 删除公共复制能力：删除 API 类型、runtime service、本地仓库函数、云函数、页面按钮和测试。
- 更新 `spec.md`、测试、扫描和验证。
- 完成超过 250 行源码文件职责审计：单一职责则记录理由；职责混杂则拆到明确模块边界。

## 5. 不做范围

- 不做全文索引服务。
- 不做搜索历史。
- 不做高级筛选。
- 不做批量操作。
- 不做公共材料复制。
- 不做跨端同步本地缓存。

## 6. 设计

虚拟视图：

- `ALL_RESOURCES_VIEW_ID` 只放在 `miniprogram/lib/libraries.ts`。
- 它不是 `SourceLibrary`，不参与本地 normalize，不写云函数，不出现在数据库。
- 资源页用 `ResourceItem` 表示真实分类和虚拟入口的展示差异。
- 材料页看到 `libraryId === ALL_RESOURCES_VIEW_ID` 时聚合全部可见材料。

搜索：

- 资源页 `load()` 后缓存当前 snapshot 派生 `searchResults`。
- 搜索只匹配材料标题和正文，忽略大小写。
- 结果项包含真实 `libraryId` 和 `materialId`。
- 点击结果进入真实分类材料页，并携带 `highlightMaterialId`。
- 点击搜索按钮时复用同一结果集，跳第一个结果。

材料页：

- `MaterialCard` 增加 `libraryName`、`isPublicMaterial`、`isHighlighted`。
- 全部资源视图不允许拖拽排序，因为材料来自多个分类。
- 管理态下：
  - 用户材料显示编辑、移动、删除。
  - 公共材料不显示写操作。
  - 全部资源视图不提供“导入材料/新建材料”主操作。
- 公共资源页点击管理只 toast，不切换管理态。

公共只读：

- 删除复制能力，不保留兼容转发或旧别名。
- 云函数 `copyMaterial` 目录删除。
- `CopyMaterialRequest/Response` 删除。
- 测试改为保护“公共材料不可复制，且无复制接口残留”。

职责审计：

- `pages/materials/materials.ts` 负责页面交互，但不应承载材料聚合、来源标注、高亮派生和排序判断等纯展示规则；若审计确认混杂，拆到 `miniprogram/lib/materialListView.ts`。
- `miniprogram/services/localRepository.ts` 是本地仓库服务入口，但不应同时承担素材初始化、缓存读写、normalize、排序规则和所有 CRUD 细节；若审计确认混杂，拆出本地数据存储和纯规则模块，保留 service 只暴露业务动作。

## 7. 实施任务

- [x] T001 更新虚拟视图与计划事实；验收：计划明确“全部资源不落库，公共资源不可复制”。
- [x] T002 改资源页搜索和全部资源入口；验收：搜索结果能跳到真实分类材料页并携带高亮参数。
- [x] T003 改材料页聚合视图、高亮和公共管理限制；验收：全部资源聚合展示，公共资源无法进入管理态。
- [x] T004 删除公共复制能力；验收：无复制 API/service/cloud/page/test 残留。
- [x] T005 更新 spec 和测试；验收：文档只描述当前真实能力，测试保护全部资源、搜索和公共只读。
- [x] T006 执行超过 250 行源码职责审计并按需拆分；验收：每个超阈值源文件都有拆分结果或不拆理由。
- [x] T007 验证和构建；验收：旧复制能力扫描无命中，`npm.cmd run verify` 和 `npm.cmd run build` 通过。
- [x] T008 收口记录；验收：记录完成事实、验证结果和未验证内容。

## 8. 验证计划

执行：

```powershell
rg "copyMaterial|CopyMaterial|复制到未归类材料|公共材料可以复制|copyLocalMaterial" miniprogram pages cloudfunctions tests spec.md -n --glob "!*.js"
rg "fallback|FALLBACK|默认分类|默认本地分类|librarySort|getFallbackLibraryId|本地导入|云端导入|本地材料|local-library" miniprogram pages cloudfunctions tests spec.md .codex AGENTS.md app.json local-assets -n --glob "!*.js"
rg "TODO|stub|假接口|空实现|手机文件|系统媒体|图片|配图" pages miniprogram cloudfunctions tests spec.md .codex local-assets -n --glob "!*.js"
npm.cmd run verify
npm.cmd run build
```

期望：

- 复制公共材料能力无运行代码残留。
- 旧分类和旧导入语义无命中。
- 假接口和图片残留无命中。
- 类型检查、测试、边界检查、样例资产检查和构建通过。

## 9. 收口

已完成：

- 资源页增加搜索框和搜索按钮；输入搜索词时实时显示命中列表，点击结果进入材料真实分类并高亮。
- 点击搜索按钮时复用当前搜索结果：有命中则进入第一个命中材料所在分类并高亮；无命中或空输入会 toast。
- 资源页新增“全部资源”虚拟入口，聚合当前可见材料，不写入缓存、生成文件或云端数据库。
- 材料页支持全部资源聚合展示，并在聚合视图中标注材料来源分类。
- 材料页支持 `highlightMaterialId` 一次性高亮。
- 公共资源取消复制能力，只能查看和播放；公共资源页点击管理只提示无法管理。
- 删除公共复制能力相关 API、service、本地仓库函数、云函数目录、页面按钮和测试。
- `spec.md` 同步为当前事实。

职责审计：

- `pages/materials/materials.ts` 超过 250 行，审计结论是页面事件、播放器接线、拖拽接线仍集中在页面层，但已拆出纯展示派生、时间格式和拖拽规则到 `miniprogram/lib/materialListView.ts`、`miniprogram/lib/dragOrder.ts`；剩余内容是页面交互接线，当前不为行数继续硬拆。
- `miniprogram/services/localRepository.ts` 超过 250 行，审计结论是本地 CRUD service 仍较长，但已拆出缓存存储、初始化和 normalize/排序规则到 `miniprogram/services/localDataStore.ts`、`miniprogram/lib/localDataRules.ts`；剩余内容是本地仓库业务动作，当前不为行数继续硬拆。

验证：

- 复制公共材料能力扫描无命中。
- 旧分类和旧导入语义扫描无命中。
- 假接口、空实现和图片残留扫描无命中。
- `npm.cmd run typecheck` 通过。
- `npm.cmd test` 通过，31 个测试全部通过。
- `npm.cmd run verify` 通过。
- `npm.cmd run build` 通过。

未验证：

- 未在微信开发者工具里手动点击搜索、全部资源和高亮跳转路径；当前验证覆盖类型、测试、边界扫描、样例资产检查和构建。
