# 喵喵回窝

《喵喵回窝》是一款面向抖音小游戏的竖屏、单指轨道三消游戏。玩家把同品种猫咪凑成三只，让它们“贴贴回窝”，并通过连续消除触发“呼噜暴走”。

本项目由一人公司借助 AI Coding 开发。所有方案必须优先保证：范围可控、快速上线、首局有吸引力、操作简单、反馈足够爽。

## 项目规范

新窗口从 [AGENTS.md](AGENTS.md) 开始，再阅读 [项目简报与记忆索引](docs/00_PROJECT_BRIEF.md)、[决策日志](docs/05_DECISION_LOG.md)、[当前状态](docs/06_CURRENT_STATE.md) 和 [任务/交接](docs/07_NEXT_TASKS.md)。首次进入还需读 UI、技术、Cocos、素材四份主题记忆。稳定规则与短期进度分开维护，不依赖聊天上下文。

- [游戏设计规范](docs/GAME_DESIGN.md)：详细产品规则；最新决策及主题优先级按项目记忆入口执行。
- [核心玩法与轨道逻辑](docs/CORE_GAMEPLAY_SPEC.md)：唯一入口、单向连续轨道、中央发射器、唯一老巢、插入与连锁的审核基线。
- [产品功能规格](docs/PRODUCT_SPEC.md)：页面、流程、状态、数值、文案、商业化和数据事件的可执行定义。
- [交互与视觉规格](docs/UX_UI_SPEC.md)：设计画布、屏幕布局、组件状态、设计令牌和交互验收。
- [技术规格](docs/TECHNICAL_SPEC.md)：工程结构、核心算法、数据契约、存档与平台适配。
- [关卡规格](docs/LEVEL_SPEC.md)：100 关独立设计要求、章节递进、生成规则；旧 20×5 映射已废止。
- [V2 轨道整改与审查](docs/TRACK_REDESIGN_REVIEW.md)：前十关候选、首撞实验、验收证据和未完成项。
- [难度递进与无限广告复活](docs/DIFFICULTY_AND_REVIVE_SPEC.md)：已确认的后期紧凑尺寸、难度目标和第六关起不限次数的广告复活。
- [资产规格](docs/ASSET_SPEC.md)：ImageGen、Figma、Cocos 所需的美术、动画和声音清单。
- [测试与验收](docs/QA_ACCEPTANCE.md)：功能、性能、视觉、异常与发布检查表。
- [实施计划](docs/IMPLEMENTATION_PLAN.md)：按依赖顺序推进的开发里程碑。
- [旧 UI 与美术工作流](docs/UI_ART_PIPELINE.md)：历史记录，原强制转绘流程已停止采用；新方向见 [01](docs/01_UI_DIRECTION.md)。
- [AI Coding 协作规则](AGENTS.md)：所有参与开发的 AI Agent 必须遵守。

如代码与有效规格冲突，记录真实差距，按授权修复；不得修改规格来迁就旧代码。新规则变更需所有者确认。

## 当前状态：百关几何已设计，UI 从零设计准备

2026-09-08 最新要求：仅建立长期项目记忆，不开发新功能。停止旧 ImageGen → Figma → Cocos 强制路径，新生产流程待确认；不自动续跑旧图片任务、写 Figma 或重构 Cocos。

百关源参数为 `design/track-review/catalog.source.json`，几何图及检查表在 `design/track-review/generated/catalog/`；已获所有者认可并免除重复逐关送审。动态可玩性、出猫计划、引擎接入和新视觉验收仍未完成，压力分不是实测通关率。当前运行代码仍为旧 24 关原型，详见当前状态文档。

几何只读检查使用 Node 22+：`node --test tools/track-review/catalog.test.mjs tools/track-review/geometry.test.mjs`。预览可运行 `npm run serve:track-review`，访问 <http://127.0.0.1:4180/design/track-review/generated/catalog/index.html>。`npm run review:catalog` 会重生成派生文件，不是只读查看。

原 `design/track-review/index.html` 与 `generated/first-ten-atlas.svg` 仅保留为历史前十关首撞实验，不是当前百关基线。旧低压力百关参数归档在 `design/track-review/generated/rejected-low-pressure.catalog.json`。
