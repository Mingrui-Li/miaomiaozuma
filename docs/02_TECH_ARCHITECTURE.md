# 02 · 当前技术架构

核对日期：2026-09-08。依据仓库文件，不是重构方案。标为“建议/待实现”的内容不得当作已有能力。

## 真实工程

- `package.json`：Cocos Creator **3.8.8**，2D，项目版本 `0.1.0`；语言 TypeScript。不在本次升级引擎或增加框架。
- `tsconfig.json` 面向 Cocos；`tsconfig.core.json` 对纯逻辑、配置、存档和测试做严格编译，输出到 `.test-dist`。
- `settings/v2/packages/` 为现有编辑器设置；当前 builder 文件没有足以证明抖音发布配置已完成的内容。
- `assets/` 共发现 13 个 `.ts` 文件、1 个 `.scene`、0 个 `.prefab`。根目录 `art/` 与 `design/` 是设计工作区，不等同运行资源。

## 已有模块与边界

| 真实文件/目录 | 当前职责 | 差距/注意事项 |
|---|---|---|
| `assets/game/scripts/app/GameRoot.ts` | 启动、页面切换、输入、Graphics/Label 绘制、会话和存档调用 | 大量职责集中；不是新 UI 组件系统 |
| `scripts/core/Types.ts`、`GameSession.ts` | 纯 TS 类型、队列、匹配、道具、得分、暴走和胜负原型 | 多处仍是旧规则，详见 06 |
| `scripts/core/PathSampler.ts` | 路径预采样、按距离取点、点投影 | 可复用数学能力，不证明完整射击碰撞正确 |
| `scripts/core/Random.ts`、`LevelValidator.ts` | 确定性随机、旧配置校验 | 不等同百关动态验证 |
| `assets/game/configs/Levels.ts`、`Paths.ts` | 当前运行时 24 关、5 种旧路径 | 未接入百关设计源 |
| `scripts/services/SaveService.ts` | 本地存档、校验、主备恢复、通关奖励 | 解锁上限写死 24；完整迁移/事务验收未完成 |
| `scripts/platform/PlatformAdapter.ts` | 平台接口 | 与详细技术规格中的最终接口仍有差距 |
| `scripts/platform/MockPlatformAdapter.ts` | 浏览器替身 | GameRoot 当前固定实例化此类 |
| `scripts/platform/DouyinPlatformAdapter.ts` | 安全区、震动、上报包装；其他方法占位 | 广告返回 unavailable，录屏/分享不是实际接入 |
| `assets/game/tests/CoreTests.ts` | 旧核心断言和确定性模拟 | 通过也不代表符合新规则 |

表中 `scripts/...` 简写均相对 `assets/game/`。当前 `core` 不导入 `cc`；继续保持。实际抖音文件在 `scripts/platform/`，不要因旧技术文档写了 `platform/douyin` 就假定子目录已存在。

## 两套数据必须区分

1. **设计基线**：`design/track-review/catalog.source.json`，100 关，包含画布、发射器、章节和逐关几何参数。配套 `tools/track-review/geometry.mjs`、`catalog.mjs`、`pressure.mjs`、`similarity.mjs` 生成/检查几何；派生结果在 `design/track-review/generated/catalog/`。
2. **旧运行配置**：`assets/game/configs/Levels.ts` 与 `Paths.ts`，GameRoot 实际读取这一套，尚无已完成的百关接入链路。

未来获准接入时，建议显式转换设计参数为运行时配置并校验来源哈希、端点、尺寸和方向；设计坐标转引擎坐标仅在边界进行。不要手工抄两套路径或直接替换 JSON 假装兼容。本轮不开发转换器。

## 保留的技术原则

- Cocos 做输入、视图与资源；核心规则用纯 TS，可脱离引擎测试。
- 轨道采用预采样路径与距离参数，不用真实刚体挤压维持顺序。
- 表现读取快照/事件，不直接改猫数组；动画不能成为规则正确结算的唯一条件。
- 广告、录屏、分享、安全区、存档、震动和上报经适配边界，业务层不散布 `tt`。
- 猫、发射物、粒子和飘字需对象池；现有节点 Map 不算完整对象池。
- 使用现有单场景逐步拆 UI，不引入新后端、通用工作流引擎或复杂服务框架。

## 命令与证据范围

仓库工具使用 Node 22+；当前机器可用 `/Users/limingrui/.nvm/versions/node/v22.22.0/bin/node`。这是机器路径，不是跨机器保证；新窗口先运行 `node --version`。

| 命令 | 用途/副作用 |
|---|---|
| `node --test tools/track-review/catalog.test.mjs tools/track-review/geometry.test.mjs` | 只读检查当前百关与几何；本轮 139 项通过 |
| `npm run review:catalog` | **重生成**派生目录与压力证据，不是只读，不为看报告随手运行 |
| `npm run serve:track-review` | 几何预览服务，默认本机 4180；服务不会跨窗口保证存活 |
| `npm run test:core` | 调用 `tools/run-core-tests.mjs`；清理并生成 `.test-dist`，依赖本机 Cocos 3.8.8 内置 tsc 路径 |
| `npm run check` | 旧文件存在性检查，仍检查第 24 关与历史 Figma 图，**不是上线验收** |

本轮未运行核心构建、Cocos、抖音真机或发布测试。`tools/ui-art/` 是旧图片工作流工具，目前暂停使用；已有生成清单不能触发自动续跑。
