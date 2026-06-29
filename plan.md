# 测试分层与构建产物集中 Plan

## 1. 需求文档

当前源码目录里同时存在 TypeScript 源码和 TypeScript 编译出来的 JavaScript 文件，导致后续维护时经常需要手动清理，也容易误把构建产物当成源码。`tests/` 目录也把所有测试平铺在根目录，不利于继续扩展。

本次要把工程整理成更稳定的生产结构：源码树只保存源码和小程序静态文件，编译后的运行目录统一生成到 `dist/miniprogram`；测试按职责进入子目录，测试命令仍能一次跑完整测试集。

业务完成标准：开发时看源码目录是清爽的；运行微信开发者工具时打开构建目录即可；新增测试时能按职责放入明确目录；构建、测试、完整验证都能稳定通过。

## 2. 当前事实

- 当前仓库有未提交的功能改动，包括听写练习、播放器生命周期、README、首页入口和相关测试；本任务不能回滚这些改动。
- `package.json` 当前 `build` 是 `npm.cmd run generate:local-assets && tsc`。
- `tsconfig.json` 当前没有 `outDir`，因此 `tsc` 会把 `.js` 输出到 `app.ts`、`pages/**/*.ts`、`miniprogram/**/*.ts`、`cloudfunctions/**/*.ts`、`tests/**/*.ts` 旁边。
- 当前本地已经存在散落构建产物：`app.js`、`pages/**/*.js`、`miniprogram/**/*.js`、`cloudfunctions/**/*.js`、`tests/**/*.js`。
- `.gitignore` 已经忽略这些散落 `.js` 和 `dist/`，说明它们不是源码。
- `project.config.json` 当前 `miniprogramRoot` 是 `./`，微信开发者工具打开根目录时会把源码根当作小程序根；清理源码 `.js` 后必须改为指向构建目录。
- 微信小程序运行目录必须保留页面结构：页面 `.js` 需要和对应 `.wxml`、`.wxss`、`.json` 在同一路径下。
- 当前 `tests/` 根目录有 11 个 `.test.ts` 文件平铺。
- 当前 `package.json` 的 `test` 脚本是 `tsx --test tests/*.test.ts`，不能发现子目录测试。
- `kitty/tests` 使用职责域子目录组织测试。

## 3. 失败测试

以下任一情况视为失败：

- 源码目录仍生成或保留 `app.js`、`pages/**/*.js`、`miniprogram/**/*.js`、`cloudfunctions/**/*.js`、`tests/**/*.js`。
- `npm.cmd run build` 没有生成可供微信开发者工具打开的 `dist/miniprogram`。
- `dist/miniprogram` 缺少 `app.json`、`app.js`、页面静态文件、页面编译产物、`local-assets` 或 Vant Weapp 运行资产。
- 根目录 `project.config.json` 没有指向 `dist/miniprogram/`。
- `dist/miniprogram/project.config.json` 不能直接打开构建目录。
- 测试移动后 `npm.cmd test` 不能递归跑完全部测试。
- import 路径因移动测试文件而损坏。
- `npm.cmd run verify` 或 `npm.cmd run build` 失败。

## 4. 目标

- 新增可重复执行的小程序构建脚本，把运行产物集中到 `dist/miniprogram`。
- 更新根目录微信项目配置，让微信开发者工具打开仓库根目录时使用 `dist/miniprogram`。
- 新增构建专用 TypeScript 配置，只编译小程序运行代码和云函数代码，不编译测试。
- 构建脚本负责复制小程序静态文件、`local-assets`、Vant Weapp 运行资产和适配后的微信项目配置。
- 清理当前已经散落在源码目录的 `.js` 构建产物。
- 将测试整理为 `tests/domain/`、`tests/services/`、`tests/cloud/`。
- 更新测试脚本为递归匹配。
- 保持现有产品功能、页面、云函数和测试语义不变。

## 5. 不做范围

- 不改变听写练习、材料管理、播放器、云函数和本地资源的业务行为。
- 不引入新的打包框架，不把项目迁移到第三方小程序框架。
- 不把 `dist/` 纳入版本控制。
- 不提交或推送，除非 owner 明确要求。
- 不保留任何兼容转发、旧入口别名或历史构建方式。

## 6. 设计

构建链路：

1. `npm.cmd run generate:local-assets` 扫描 `local-assets/` 并生成 `miniprogram/generated/localAssets.ts`。
2. `node scripts/build-miniprogram.js` 删除旧的 `dist/miniprogram`，创建干净输出目录。
3. 构建脚本复制运行所需静态文件：
   - 根级小程序文件：`app.json`、`app.wxss`、`sitemap.json`。
   - 页面静态文件：`pages/**/*.wxml`、`pages/**/*.wxss`、`pages/**/*.json`。
   - 本地材料文件：`local-assets/**`。
   - Vant Weapp 运行资产：从 `node_modules/@vant/weapp/dist` 复制到 `miniprogram_npm/@vant/weapp`，如果依赖不存在则明确失败，避免构建出不可运行目录。
4. 根目录 `project.config.json` 指向 `dist/miniprogram/` 和 `dist/miniprogram/cloudfunctions/`，用于直接打开仓库根目录。
5. 构建脚本写入 `dist/miniprogram/project.config.json`，其中 `miniprogramRoot` 为 `./`，`cloudfunctionRoot` 为 `cloudfunctions/`，用于必要时直接打开构建目录。
6. 构建脚本调用 `tsc -p tsconfig.build.json`，把 `app.ts`、`pages/**/*.ts`、`miniprogram/**/*.ts`、`cloudfunctions/**/*.ts` 编译到 `dist/miniprogram` 对应路径。

测试目录边界：

- `tests/domain/`：纯规则和领域函数测试。
- `tests/services/`：小程序服务、播放器、仓库、练习组等接线测试。
- `tests/cloud/`：云函数共享规则和 provider 测试。

清理边界：

- 只删除已忽略的构建产物路径：`app.js`、`pages/**/*.js`、`miniprogram/**/*.js`、`cloudfunctions/**/*.js`、`tests/**/*.js`。
- 不删除 `scripts/*.js`，因为它们是源码脚本。

## 7. 实施任务

- [x] T001 新增构建专用 TypeScript 配置；验收：运行代码能输出到 `dist/miniprogram`，测试不参与构建。
- [x] T002 新增小程序构建脚本；验收：静态文件、项目配置、`local-assets`、Vant Weapp 运行资产和 TS 产物都进入 `dist/miniprogram`。
- [x] T003 更新 `package.json` 脚本；验收：`build` 使用集中输出构建，`test` 递归发现测试。
- [x] T004 整理 `tests/` 目录；验收：根目录不再平铺 `.test.ts`，import 路径正确。
- [x] T005 清理源码树散落 `.js` 产物；验收：目标源码目录下没有旧构建 `.js`。
- [x] T006 运行测试、完整验证和构建；验收：`npm.cmd test`、`npm.cmd run verify`、`npm.cmd run build` 通过。
- [x] T007 收口记录；验收：`plan.md` 写明完成事实、验证结果和剩余风险。

## 8. 验证计划

执行：

```powershell
npm.cmd test
npm.cmd run verify
npm.cmd run build
Get-ChildItem -Recurse -File -Include *.js app.js,pages,miniprogram,cloudfunctions,tests
Test-Path dist/miniprogram/app.js
Test-Path dist/miniprogram/app.json
Test-Path dist/miniprogram/pages/home/home.js
Test-Path dist/miniprogram/pages/home/home.wxml
Test-Path dist/miniprogram/project.config.json
```

期望：

- 测试、完整验证、构建全部通过。
- 源码目录指定范围不再有散落 `.js` 构建产物。
- `dist/miniprogram` 存在完整小程序运行结构。
- 微信开发者工具应打开 `dist/miniprogram` 目录进行预览。

## 9. 收口

目标已完成。

完成事实：

- 新增 `tsconfig.build.json`，运行时代码编译到 `dist/miniprogram`，测试不参与小程序构建。
- 新增 `scripts/build-miniprogram.js`，每次构建都会清空并重建 `dist/miniprogram`。
- `npm.cmd run build` 现在执行本地资源扫描、静态文件复制、Vant Weapp 运行资产复制、微信项目配置写入和 TypeScript 编译。
- 根目录 `project.config.json` 已指向 `dist/miniprogram/`，微信开发者工具打开仓库根目录时使用构建产物。
- `dist/miniprogram/project.config.json` 保持 `miniprogramRoot: "./"`，可直接打开构建目录。
- `tests/` 已分为 `tests/domain/`、`tests/services/`、`tests/cloud/`。
- `package.json` 的 `test` 脚本已改为递归匹配 `tests/**/*.test.ts`。
- 已删除源码目录散落的 `app.js`、`pages/**/*.js`、`miniprogram/**/*.js`、`cloudfunctions/**/*.js`、`tests/**/*.js`。

验证结果：

- `npm.cmd test` 通过，44 个测试全部通过。
- `npm.cmd run verify` 通过，包含本地资源生成、类型检查、递归测试、边界检查和本地素材检查。
- `npm.cmd run build` 通过，生成 `dist/miniprogram`。
- 结构检查通过：源码目标目录没有散落 `.js`；`dist/miniprogram/app.js`、`app.json`、`pages/home/home.js`、`pages/home/home.wxml`、`project.config.json`、Vant icon 组件和本地样例音频都存在。

剩余风险：

- 未在微信开发者工具里做人工预览；下一步应打开仓库根目录，确认开发者工具读取的是 `dist/miniprogram/`。
- 当前工作区仍包含本次之前的未提交功能改动，本任务没有回滚或重写这些改动。
