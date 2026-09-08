# 06 · 当前真实状态与交接

最后核对：2026-09-08，总控窗口（本轮项目记忆任务）。这是最新快照；不要继续执行旧对话中的“继续生图”。

## 当前授权

**UI 从零设计的准备阶段；本轮仅文档建设。** 不生成图片、不写 Figma、不改场景/脚本/素材、不新增功能。100 关几何已完成且获所有者认可；新 UI 流程未定。旧强制流程已停止采用，详见 D008。

## 已有产物与真实性边界

| 部分 | 本轮核对结果 | 证据/不代表什么 |
|---|---|---|
| 项目记忆 | AGENTS + 00～07 已建立，规则/决策/状态/待办分离 | 本轮仅文档，不是自动调度系统 |
| 百关几何 | 源文件有 100 关；现存检查报告 100/100 几何通过，4950 对形态比较无低于 48px RMS 复审对 | `design/track-review/catalog.source.json`、`generated/catalog/AUDIT.md`；不是动态可解性或实测难度 |
| 难度证据 | 已有多层压力、静态首撞/移除探针、开中末快照 | `generated/catalog/PRESSURE.md` 与 `evidence/`；静态移除不等于合法三消开缝 |
| 设计认可 | 所有者认可当前几何并免除重复逐关送审 | `tools/track-review/visual-authorization.json` 是先前 ImageGen 阶段授权存档；新的生产范围看 D008 |
| 旧 UI 图片 | `v2_ui/jobs.json` 129 个旧计划项，实际对应文件 12 项；另有返工变体 | 本轮按磁盘核对；不是全套完成。旧 qa.json 有 5 个 CONCEPT_PASS、4 个 REWORK，其余未记录；都未获新方向批准 |
| 旧 Figma | 仓库有交付记录与截图，交付记录标为已否决 | 本轮未连接/审查实时 Figma；不能宣称当前远端画布质量或数量 |
| Cocos 原型 | 3.8.8；13 个 TS 文件、一个 main.scene、无 Prefab | 存在旧代码不等于可玩性、正式 UI 或发布完成 |
| 当前运行关卡 | Levels.ts 为 24 关、Paths.ts 五种旧路径 | 百关几何尚未接入运行时 |
| 字体/图集 | 未发现字体文件或 `.pac` / `.spriteatlas` 配置；有 cat_atlas.png | 不代表字体已授权或图集已配置 |
| 抖音与上线 | 有适配器骨架，当前 GameRoot 固定 Mock | 无本轮真机、真实广告、包体或上线证据 |

上述路径 `generated/...` 相对 `design/track-review/`，`v2_ui/...` 相对 `art/concepts/`。

旧几何报告仍写“验收 0/100/待审”，是逐关字段快照；D006 的整体认可未伪写成 100 次点击验收。旧图片 `progress.json` 可能落后于磁盘，本轮未重生成。不要让这些旧状态覆盖最新所有者决定。

## 已知差距（记录，不在本轮修复）

| ID | 可核对位置 | 真实问题/风险 |
|---|---|---|
| R01 | `configs/Levels.ts`、`Paths.ts`、`services/SaveService.ts` | 24 关/5 旧路径；存档解锁 Math.min(24)；章节、障碍投放也属旧配置 |
| R02 | `app/GameRoot.ts:onAimEnd` | 触点投影路径后直接调用 shootAtDistance，并非中央弹射物首撞全过程 |
| R03 | `core/GameSession.ts:revive`、`Types.ts` | reviveUsed 单次限制、后退 6 格，与无限广告复活及退链 25%/末端清理规格不符 |
| R04 | `app/GameRoot.ts:showResult/resetContent` | 结算清空 session；“复活”按钮实际重新 startLevel，未恢复失败快照，也未走广告 |
| R05 | `core/GameSession.ts:runFrenzy/compact/checkOutcome` | 暴走清除一个品种；断口直接压紧；胜利先查。与新暴走、真实断口、失败优先规格有差距 |
| R06 | `platform/DouyinPlatformAdapter.ts` | 广告固定 unavailable；录屏为空/不可分享；分享 false；非完整平台接入 |
| R07 | `app/GameRoot.ts` 与资产目录 | Graphics/Label 原型、未建立正式 UI/对象池；旧资源重复，引用/授权/分包未清点完成 |
| R08 | `tools/check-project.mjs` | 仅查旧交付物和第 24 关；输出 Project QA passed 不代表新规格通过 |

表中简称均相对 `assets/game/scripts/`，`configs/` 相对 `assets/game/`。修复 R01～R08 需要后续功能任务授权，不能借文档任务顺手改代码。

## 文档中的未决冲突

- `CORE_GAMEPLAY_SPEC.md` 第 4.3 节旧首关螺旋坐标不是当前首关路线；**具体坐标以 catalog.source.json 为准**，该段仅历史示例。
- CORE 第 8.2 节统一猫半径与后续分档规格不一致；已确认尺寸以 D005、PRODUCT 第 5.1 节和当前几何 profile 为准。
- CORE 呼噜加值描述与 PRODUCT 公式不同；危险末段阈值有 97% / 95% 差别；需 Q003 收敛，不能自行选值实现。
- 旧详细规格中的当前阶段/强制美术流程已统一加失效提示；玩法与 QA 义务未整体废除。个别历史段落保留原文，不是当前执行指令。

## 本轮验证

- 只读核查 package/settings、场景 JSON、全部脚本文件清单、关键实现、几何源/报告、图片清单与 qa.json。
- Node 22.22.0 执行 `node --test --test-reporter=dot tools/track-review/catalog.test.mjs tools/track-review/geometry.test.mjs`：**139 项通过，退出码 0**。未重生成几何/图片。
- 未运行 Cocos、核心编译/旧核心模拟、真实平台、性能和真机测试；不借用历史结果冒充本轮验证。
- 文档检查：README、AGENTS、docs 全部 Markdown 及旧图片 README 共 25 份，本地 Markdown 链接无失效目标；00～07 八份文件齐全。`git diff --check` 通过（仅覆盖已跟踪差异，不能代表所有未跟踪文件的检查）。
- 工作区原本已有大量未跟踪内容及修改；本轮未清理、提交或推送。未来需要所有者授权 Git 备份；仅保存在当前磁盘不等于已远端备份。

## 本轮文件清单

相对本轮开始时的磁盘状态，新增 8 份、修改 15 份；不少旧文件原本未跟踪，因此 Git 的 `??` 不等于本轮新建。

新增项目记忆：

- [00_PROJECT_BRIEF.md](00_PROJECT_BRIEF.md)
- [01_UI_DIRECTION.md](01_UI_DIRECTION.md)
- [02_TECH_ARCHITECTURE.md](02_TECH_ARCHITECTURE.md)
- [03_COCOS_STRUCTURE.md](03_COCOS_STRUCTURE.md)
- [04_ASSET_GUIDE.md](04_ASSET_GUIDE.md)
- [05_DECISION_LOG.md](05_DECISION_LOG.md)
- [06_CURRENT_STATE.md](06_CURRENT_STATE.md)
- [07_NEXT_TASKS.md](07_NEXT_TASKS.md)

修改入口与产品流程：[AGENTS.md](../AGENTS.md)、[README.md](../README.md)、[GAME_DESIGN.md](GAME_DESIGN.md)。

仅添加旧流程失效/当前记忆入口提示，保留原内容：[CORE_GAMEPLAY_SPEC.md](CORE_GAMEPLAY_SPEC.md)、[PRODUCT_SPEC.md](PRODUCT_SPEC.md)、[UX_UI_SPEC.md](UX_UI_SPEC.md)、[TECHNICAL_SPEC.md](TECHNICAL_SPEC.md)、[LEVEL_SPEC.md](LEVEL_SPEC.md)、[ASSET_SPEC.md](ASSET_SPEC.md)、[QA_ACCEPTANCE.md](QA_ACCEPTANCE.md)、[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)、[UI_ART_PIPELINE.md](UI_ART_PIPELINE.md)、[FIGMA_HANDOFF.md](FIGMA_HANDOFF.md)、[TRACK_REDESIGN_REVIEW.md](TRACK_REDESIGN_REVIEW.md)、[旧图片 README](../art/concepts/v2_ui/README.md)。

没有修改运行脚本、场景、几何配置、素材或构建配置。

## 恢复入口

下一步：总控与所有者确定 **UI-01 新生产流程**，再进行有边界的小样任务；不要续跑 129 项旧图片队列，也不要把百关重新套成几个重复模板。旧本机预览 URL/进程不是永久服务，换窗口必须重新检查。

更新本文件时保留关键证据路径，移除已过期“进行中”；只把有证据的内容标完成。新决定去 05，任务与交接去 07，不把聊天全文堆进这里。
