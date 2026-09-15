# 03 · Cocos 场景与组织记忆

2026-09-15 UI-08：`tools/ui-release/`在临时副本裁剪引擎模块并关闭debug构建，复用UI-06/UI-07原场景，没有新建一套UI或修改原工程设置。两份最终包与性能/回归证据见 [17](17_UI_RELEASE_READINESS.md)。

2026-09-15：UI-07新增 `assets/ui-catalog/` 的独立百关场景、CatalogBase/CatalogPreview、无cc依赖的ReviewLayout、源派生JSON及新字体子集；复用已验收Prefab/纹理，旧场景不改。百关静态适配证据与限制见 [16](16_UI_CATALOG_QA.md)。

2026-09-14：UI-06新增 `assets/ui-flow/FlowView.ts` 页面组合、无cc依赖的FlowModel演示状态、FlowBase布局绘制及独立场景。沿用UI-05 Prefab，不改已验收场景；地图/卡片按分页复用节点，详细行为与限制见 [15](15_UI_FLOW_PREVIEW.md)。

核对日期：2026-09-11。UI-05新增 `assets/ui-preview/`，实例化四个真实Prefab：CommonButtonView、DialogPanel、GameHud、HomeView；对应三个组件脚本在 `assets/game/scripts/ui/`，字体在 `assets/game/fonts/`。复用UI-04纹理和九宫格，旧灰盒不变，验收与限制见 [13](13_UI_COMPONENT_PREVIEW.md)。

规划依据：[08 UI 路线](08_UI_DEVELOPMENT_ROADMAP.md) 要求先用代表关灰盒验证布局，再将小批资源装入真实 Prefab；[09](09_UI_STRUCTURE_AND_STATES.md) 给出组件草表与接口。灰盒已实施，结果与剩余问题见11；不以 Figma 全量完成为前置。

## 现状

旧原型 `assets/game/scenes/main.scene` 保持原样；Canvas/Camera 下由 GameRoot 创建页面。UI-03G/04灰盒保持原样，读取 Fixtures 七关快照和Layout纯数学模块，说明见 [11](11_COCOS_GREYBOX.md)。UI-05在新场景复用这两个只读模块，新增Prefab与视图脚本已落地；独立gameplay/presentation架构仍未实施，不凭UI试样重构旧main。

GameRoot 使用 Graphics/Label 拼画面，集中实现首页、地图、图鉴、设置、游戏、暂停、结算。不能据此声称有独立页面控制器或正式视觉组件。

## 后续建议：保留单场景，逐步拆分

以下树是**建议职责层级**，名称尚未创建；后续获准实施时按实际需要引入，不先建大量空壳。

```text
main.scene
└─ Canvas
   ├─ Camera
   ├─ BackgroundLayer     纯装饰，可延伸到安全区外
   ├─ GameplayLayer       同一坐标系下的轨道、设施、猫链、发射物
   ├─ HudLayer            安全区内的目标、暂停、呼噜、道具
   ├─ PageLayer           首页、地图、图鉴、外观、设置
   ├─ ModalLayer          暂停、结算、复活、确认；阻断背景输入
   └─ ToastLayer          短提示、加载反馈
```

GameplayLayer 内 Source / Track / Chain / Launcher / Projectile / Lair 分工独立；设施从路径端点和切线定位。轨道、猫链与发射器整体等比适配，不能分别拉伸。SafeArea 应约束交互层，不能为避让 HUD 独自挪走发射器。

## Prefab 候选与职责

| 候选 | 职责 | 不应承担 |
|---|---|---|
| `CatView` | 品种外观、表情、局部动画、回收清理 | 猫链顺序/匹配规则 |
| `LauncherView` | 当前猫、下一只、朝向、交换反馈 | 生成普通猫链/判失败 |
| `SourceView` / `LairView` | 唯一设施的状态与洞口表现 | 决定整条路径几何 |
| `HudPanel` / `BoosterItem` | 快照展示、操作意图与禁用态 | 直接修改库存/会话 |
| `CommonButton` / `DialogBase` / `Toast` | 复用布局、状态、热区 | 各页业务的万能管理器 |
| 页面/结算面板 | 各自导航和状态绑定 | 平台 API 与核心算法 |

同类五猫优先一个结构配 SpriteFrame/数据，不复制五套逻辑；页面按复杂度决定是否独立 Prefab，不要求每个文字或静态图都做 Prefab。

## 脚本渐进拆分建议

- `app/GameRoot.ts` 留初始化、模块装配、导航入口；分批移出 UI 绘制，不一次重写所有逻辑。
- `core/` 保留纯规则、数据与路径数学。
- `gameplay/` 将来放输入、猫链/设施视图和投射物同步；`ui/` 放面板与公共组件。
- `presentation/` 将来映射规则事件到动画/音效；`services/` 在现有存档之外按需增加资源/音频服务。
- `platform/` 延续现有接口，待单独任务接入真实抖音能力。

## 场景资源纪律

- 资源与 `.meta` 成对保留，检查 UUID 引用；不删除 meta 再生成来“修复”丢引用。
- 用序列化属性显式绑定必要节点，少用长路径字符串查找；不在每帧搜索场景树。
- 监听在启用时注册、禁用/销毁时清理；对象池回收清理 tween、监听、透明度和临时状态。
- 页面切换不能误删尚需复活的会话快照；异步广告回调必须核对会话和失败快照身份。
- 编辑器可打开、引用完整、状态切换可测、真机截图与批准基线一致后才算对应视图完成。仅场景 JSON 有效不代表游戏可用。
