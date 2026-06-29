# 每日英语听写生产级 TypeScript 开发 Plan

## 1. 需求文档

用户要开发“每日英语听写”微信小程序。目标不是先搭临时骨架，而是一次性交付可长期维护、可扩展、可验证的生产级工程主干。

产品面向个人英语学习。用户可以使用系统库中的通用听力，也可以维护自己的用户库。材料以文本块为单位，文章导入后自动分句，句子是播放和音频绑定的基本单位。一句文本绑定一句音频。音频可以由用户上传，也可以在缺音频时通过系统生成。上传音频支持 `mp3`、`m4a`、`wav`，小程序播放优先 `mp3` / `m4a`。云端数据为准，本地只做缓存。隐藏管理入口只允许管理员 `openid` 使用。

当前产品不做听写输入、音频导出、口语评分、发音纠错、语法教学、整篇音频自动对齐、音频自动切句和图片 OCR。TTS 接腾讯云，但必须封装成可替换 provider；未配置密钥时返回明确错误，不能伪装成生成成功。

业务上完成的标准是：仓库成为一个 TypeScript 微信小程序 + CloudBase 工程，具备清晰类型契约、职责边界、云函数、测试、文档和完整验证命令。后续新增能力时不需要推翻主架构。

## 2. 当前事实

当前目录事实：

- 项目目录是 `C:\Users\Administrator\Desktop\listen`。
- 当前已清理此前生成的 JavaScript 半成品工程文件。
- 当前根目录保留 `.codex/`、`.gitignore`、`AGENTS.md`、`CONTRIBUTING.md`、`LICENSE`、`README.md`、`SECURITY.md`、`plan.example.md`、`plan.md`、`spec.md`。
- `.codex/skills/listen-development/SKILL.md` 已存在，要求 TypeScript、共享契约、清晰职责和生产级交付。
- `.codex/skills/plan/SKILL.md` 已存在，要求 `plan.md` 作为单文件执行合同。
- 当前没有小程序工程代码、CloudBase 云函数、测试、构建配置、`package.json` 或 `tsconfig.json`。

当前产品事实：

- 平台：微信小程序。
- 后端：微信云开发 / CloudBase。
- 用户识别：微信 `openid`。
- 数据策略：云端为准，本地只做缓存。
- 资料库：系统库 + 用户库；通用听力属于系统库。
- 材料：文本块 -> 自动分句 -> 句子。
- 播放：按句播放，点击句子播放该句。
- 音频：一句文本绑定一句音频。
- 音频来源：用户上传 + 系统生成。
- 上传格式：`mp3`、`m4a`、`wav`。
- 管理：小程序内隐藏管理入口，只允许管理员 `openid` 使用。
- TTS：腾讯云 provider，但必须可替换；未配置时明确返回未配置错误。

当前未知点：

- 真实 CloudBase 环境 ID 未提供。
- 管理员真实 `openid` 未提供。
- 腾讯云 TTS SecretId、SecretKey、AppId、Region、VoiceType 等配置未提供。
- 系统库真实内容和授权来源未提供。
- 词典真实数据和格式未提供。

## 3. 失败测试

架构失败：

- 如果工程主实现不是 TypeScript，则失败。
- 如果没有共享领域类型和 API 契约，则失败。
- 如果页面文件直接承载数据访问、上传规则、播放器规则、统计规则或 TTS provider 逻辑，则失败。
- 如果 TTS provider 不能替换，或业务代码直接绑定腾讯云实现，则失败。
- 如果云函数没有统一响应结构，则失败。

产品失败：

- 如果实现听写输入、音频导出、口语评分、发音纠错、语法教学、整篇音频自动对齐、音频自动切句或图片 OCR，则失败。
- 如果音频上传不限制为 `mp3`、`m4a`、`wav`，则失败。
- 如果一句文本不能绑定一句音频，则失败。
- 如果管理入口不校验管理员 `openid`，则失败。
- 如果本地缓存覆盖云端主数据，则失败。

TTS 失败：

- 如果腾讯云 TTS 未配置时仍返回生成成功，则失败。
- 如果 TTS 错误没有稳定错误码，则失败。
- 如果缺音频时没有明确生成入口或未配置提示，则失败。

验证失败：

- 如果没有 `npm.cmd run verify`，则失败。
- 如果类型检查、测试、边界搜索不能通过，则失败。
- 如果 README、spec、AGENTS 与代码事实不一致，则失败。

## 4. 目标

最终交付一个生产级 TypeScript 微信小程序 + CloudBase 工程主干：

- 工程配置：`package.json`、`tsconfig.json`、小程序项目配置和验证脚本齐全。
- 类型契约：`miniprogram/types/` 定义领域模型、状态枚举、API 请求/响应、错误码。
- 纯规则：`miniprogram/lib/` 使用 TypeScript 实现分句、音频格式、统计、权限、缓存合并等可测试规则。
- 服务层：`miniprogram/services/` 负责 CloudBase API、上传、播放器、学习记录、缓存，不让页面直接处理外部接线。
- 页面层：`pages/*` 只负责页面状态、用户事件和渲染数据。
- 云函数：`cloudfunctions/` 包含登录、同步、保存文本块、绑定音频、生成音频、记录学习事件、管理员更新。
- 云函数共享层：`cloudfunctions/_shared/` 包含响应 helper、领域类型、鉴权、TTS provider 接口和腾讯云 provider。
- TTS 边界：腾讯云 provider 存在；未配置时返回 `TTS_NOT_CONFIGURED`；provider 可替换。
- 测试：`tests/` 覆盖分句、音频格式、统计、权限、API 契约、TTS 未配置、产品边界搜索。
- 文档：`README.md`、`spec.md`、`AGENTS.md` 与当前工程事实同步。
- 验证：`npm.cmd run verify` 一条命令完成类型检查、测试和边界检查。

## 5. 不做范围

- 不部署到微信后台。
- 不创建真实 CloudBase 环境。
- 不写入真实腾讯云密钥。
- 不内置大批系统库内容。
- 不内置真实词典数据。
- 不提交真实用户文本、音频、图片或个人数据。
- 不实现听写输入。
- 不实现音频导出。
- 不实现口语评分。
- 不实现发音纠错。
- 不实现语法教学。
- 不实现整篇音频自动对齐。
- 不实现音频自动切句。
- 不实现图片 OCR。

## 6. 设计

### 主链路

打开小程序 -> 登录获取 `openid` -> 校验管理员状态 -> 拉取系统库和用户库 -> 导入文本块 -> 自动分句 -> 保存文本块和句子 -> 上传句子音频或请求生成音频 -> 音频绑定到句子 -> 点击句子播放 -> 记录学习事件 -> 统计页面读取云端统计 -> 本地缓存最近数据用于恢复和加速。

### 目录边界

- `miniprogram/types/domain.ts`：领域模型。只定义 Library、Block、Sentence、AudioBinding、StudyEvent、DictionaryEntry、Settings 等类型。
- `miniprogram/types/api.ts`：小程序端和云函数共享的请求、响应、错误码和函数名。
- `miniprogram/lib/`：纯函数规则。只能依赖输入参数，不访问 `wx`、云函数或数据库。
- `miniprogram/services/cloud.ts`：统一 CloudBase 调用。
- `miniprogram/services/upload.ts`：统一图片和音频上传。
- `miniprogram/services/player.ts`：播放器状态和播放控制。
- `miniprogram/services/study.ts`：学习事件记录和统计接线。
- `miniprogram/services/cache.ts`：本地缓存读写，必须服从云端为准。
- `pages/*`：页面状态、事件处理、渲染数据。页面不直接写云函数名，不直接实现业务规则。
- `cloudfunctions/_shared/`：云函数共享类型、响应、数据库集合名、管理员校验、TTS provider 接口。
- `cloudfunctions/login`：返回 `openid` 和管理员状态。
- `cloudfunctions/syncData`：拉取库、文本块、句子、音频绑定、统计摘要。
- `cloudfunctions/saveBlock`：保存文本块并按句保存句子。
- `cloudfunctions/bindAudio`：保存句子音频绑定。
- `cloudfunctions/generateAudio`：调用 TTS provider，生成或返回未配置错误。
- `cloudfunctions/recordStudy`：记录播放学习事件。
- `cloudfunctions/adminUpdate`：仅管理员维护系统库结构。
- `tests/`：用 Node 测试纯规则、契约和边界。
- `scripts/check-boundaries.js`：检查禁止能力、JavaScript 主实现、产品边界和文档一致性。

### 状态归属

- 云数据库是主状态。
- 本地缓存只保存最近资料库、文本块、句子、音频绑定和统计摘要。
- 音频和图片文件归属云存储。
- 管理员列表归属云函数环境变量或 `settings` 集合。
- TTS 密钥归属云函数环境变量。
- UI 状态只存在页面内，不写入领域模型。

### 数据集合

- `libraries`：系统库、通用听力、用户库。
- `blocks`：文本块。
- `sentences`：句子。
- `audioBindings`：句子音频绑定。
- `studyEvents`：播放事件。
- `dictionary`：词典条目，允许为空。
- `settings`：管理员和系统配置。

### 错误、恢复、中断、重试

- 网络失败：页面显示错误，同时允许读取本地缓存。
- 云函数失败：返回统一 `{ ok: false, code, message }`。
- 未配置 TTS：返回 `TTS_NOT_CONFIGURED`，前端显示“生成服务未配置，可先上传音频”。
- 上传失败：句子保持缺音频状态，不写假绑定。
- 非管理员访问：返回 `FORBIDDEN`，管理页不显示操作。
- 本地缓存冲突：云端数据覆盖本地缓存。

## 7. 实施任务

- [ ] T001 建立 TypeScript 工程配置；文件：`package.json`、`tsconfig.json`、`typings/`；依赖：当前文档；验收：`npm.cmd run typecheck` 可运行。
- [ ] T002 建立领域类型和 API 契约；文件：`miniprogram/types/domain.ts`、`miniprogram/types/api.ts`；依赖：T001；验收：模型覆盖 Library、Block、Sentence、AudioBinding、StudyEvent、Settings 和云函数请求/响应。
- [ ] T003 建立纯规则模块；文件：`miniprogram/lib/*.ts`；依赖：T002；验收：分句、音频格式、统计、权限、缓存合并纯函数通过测试。
- [ ] T004 建立小程序服务层；文件：`miniprogram/services/*.ts`；依赖：T002、T003；验收：CloudBase、上传、播放器、学习事件、缓存逻辑不在页面中实现。
- [ ] T005 建立小程序入口；文件：`app.ts`、`app.json`、`app.wxss`、`project.config.json`、`sitemap.json`；依赖：T001；验收：入口使用 TypeScript，配置不声明未实现能力。
- [ ] T006 建立资料库页面；文件：`pages/library/*`；依赖：T004；验收：显示系统库、通用听力、用户库、最近材料、管理员入口。
- [ ] T007 建立导入页面；文件：`pages/import/*`；依赖：T004；验收：保存文本块、自动分句、文本块级图片附件入口。
- [ ] T008 建立文本块详情页面；文件：`pages/block/*`；依赖：T004；验收：句子列表、盲听、速度、循环、上传音频、生成入口、按句播放。
- [ ] T009 建立统计页面；文件：`pages/stats/*`；依赖：T004；验收：学习时长、听句数、播放次数、重复次数来自云端或缓存摘要。
- [ ] T010 建立隐藏管理页面；文件：`pages/admin/*`；依赖：T004；验收：管理员 `openid` 校验通过才显示系统库维护操作。
- [ ] T011 建立云函数共享层；文件：`cloudfunctions/_shared/*`；依赖：T002；验收：统一响应、集合名、鉴权、TTS provider 接口存在。
- [ ] T012 实现 CloudBase 云函数；文件：`cloudfunctions/login`、`syncData`、`saveBlock`、`bindAudio`、`generateAudio`、`recordStudy`、`adminUpdate`；依赖：T011；验收：每个函数职责单一，返回统一响应。
- [ ] T013 实现腾讯云 TTS provider；文件：`cloudfunctions/_shared/tts/tencent.ts`；依赖：T011；验收：未配置返回 `TTS_NOT_CONFIGURED`，配置存在时只通过 provider 接口暴露能力。
- [ ] T014 建立自动测试；文件：`tests/`；依赖：T002、T003、T011；验收：覆盖纯规则、权限、TTS 未配置、API 契约和产品边界。
- [ ] T015 建立边界检查脚本；文件：`scripts/check-boundaries.js`；依赖：T014；验收：检查禁止能力、JavaScript 主实现、直接 provider 调用、页面职责越界。
- [ ] T016 同步文档；文件：`README.md`、`spec.md`、`AGENTS.md`；依赖：T001-T015；验收：文档记录当前工程入口、验证命令、数据集合、云函数、TTS 未配置边界。
- [ ] T017 运行完整验证并修复；命令：`npm.cmd run verify`；依赖：T014-T016；验收：类型检查、测试、边界检查通过。
- [ ] T018 收口 `plan.md`；依赖：T017；验收：记录目标、失败测试、改动文件、验证结果、未验证内容和剩余风险。

## 8. 验证计划

必须运行：

- `npm.cmd install`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run check:boundaries`
- `npm.cmd run verify`

必须检查：

- TypeScript 主实现存在，没有 JavaScript 主实现。
- 页面文件不直接调用具体 TTS provider。
- 页面文件不直接实现分句、音频格式判断、统计计算、缓存合并。
- 云函数统一返回结构。
- 未配置 TTS 返回 `TTS_NOT_CONFIGURED`。
- 管理入口校验管理员 `openid`。
- 上传格式只允许 `mp3`、`m4a`、`wav`。
- README、spec、AGENTS 与当前工程事实一致。
- 禁止能力只出现在不做范围或边界检查中。

未验证内容：

- 不验证真实微信开发者工具预览。
- 不验证真实 CloudBase 部署。
- 不验证真实腾讯云 TTS 调用。
- 不验证真实微信 `openid`。
- 不验证真实系统库素材和词典数据。

这些未验证内容是外部环境缺失造成的客观边界，不能在代码或文档中写成已完成事实。

## 9. 收口

待执行完成后更新。
