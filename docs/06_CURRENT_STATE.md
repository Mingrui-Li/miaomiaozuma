# 06 · 当前真实状态与交接

最后核对：2026-09-11，总控 `/root`（UI-05 代表页面与组件）。这是最新快照；不要继续执行旧对话中的批量生图。

## 当前授权

**D018授权UI-05代表页面与组件；D019确认首页布局及安卓手机验证。** 首页采用大开始按钮＋关卡/图鉴/外观＋小设置，录屏分享在结算。独立场景、四个真实Prefab、字体子集、按钮状态与弹窗交互见 [13](13_UI_COMPONENT_PREVIEW.md)。UI-04资源与旧灰盒保持原样，未改main.scene、旧运行脚本/素材及源几何，未接入完整游戏规则。

UI-05本地组件验证已通过，安卓手机和所有者视觉批准仍待完成。UI-R03通过三尺寸浏览器44 CSS px热区及七关包络检查；UI-Q01玄猫小尺寸细表情、UI-Q02动态辨识仍需真机。Q002未正式冻结审美，Q003保留，Q004由D019解决并同步GDD/PRODUCT/UX。

用户最新要求后续图片任务采用GPT Image 2.5，已记D017；官方型号存在，当前内置工具无model参数，不能声称已切换。新生图前核验支持通道；同源现有资源的组件开发可继续，不需要重生成本批。

## UI-05 本地交付 · 2026-09-11

- 新增四Prefab、三个组件脚本、新隔离预览场景及63,008字节OFL字体子集；首页、HUD、暂停/结算/复活、禁用/加载/返回状态落地。细节见13。
- 编辑器预览与独立web-mobile构建均通过七关/三尺寸/真实点击、广告模拟取消与重复完成、免费出口和30次弹窗复用；两份回执diagnostics为空。18项布局/手势测试、Creator tsc严格检查通过；命令需Node22，系统Node16不支持 `--test`，已改用安装的22执行。
- 构建在 `/private/tmp/mmhw-ui05-build-20260911`，最终复制 `build/ui05-verified/`；静态包11,753,738字节，未做抖音主包优化。修复过首轮脚本UUID压缩引用及浏览器缺省favicon404；不是仅根据构建退出码判断通过。
- 手机访问尚未开放：自动审批拒绝向局域网任意设备提供静态资源，需要所有者明确确认。只启动了127.0.0.1:62290本机服务，已请求在应用内打开；用户Creator7456保留。没有后台自动工作。
- 旧assets/meta/几何与开始快照一致。编辑器自动新增 `.creator/asset-template/...url` 和新目录meta已保留；没有清理、提交或推送。
- 下一步：获准后临时开放明确地址供安卓验证，收集首页/第87关/弹窗截图与遮挡/触达/辨识反馈；尚不推进UI-06，不把Q002视觉批准或真机测试写成已完成。

## UI-04 验证 · 2026-09-11

- 12张PNG共330,055字节；源/导出/导入/提示词和纹理UUID可追溯，见12和 `design/ui/ui04/assets.json`。原图不进入游戏包；旧图片、meta和几何保持原样。
- 五猫256×256真RGBA；橘猫两次生成的RGB棋盘格结果保留，D016后使用本地Vision+GrabCut获得透明导出；玄猫保留实际返回alpha。所有可见像素都在原碰撞圆内；五猫64/56/48、灰阶、深浅底检查图在 `art/qa/ui04/cats_sizes.png`。
- 18项布局/手势/几何测试、Creator内置tsc严格编译、12图alpha/hash/导出同一性/九宫格中段检查通过。
- 七关、原灰盒容器交互、360×640/390×844/430×932实际浏览器输入通过；暂停透明边缘可点，产品按钮最小44 CSS px且互不重叠。最终diagnostics为空；截图在 `output/playwright/ui04/`，详细回执见 `design/ui/ui04/verification.json`。
- 独立构建输入与当前资源/源码逐字节核对；构建输出保存在 `build/ui04-verified/`（Git忽略）。日志和打包装载结果记入验收回执，不将单独退出码当作成功证据。
- 打包后发现Set展开转换缺陷，改为Array.from并重新构建；打包版本也通过七关/三尺寸回归且诊断为空。首个失败构建独立保留，最终构建不含该故障。
- 未测试手机/真实抖音胶囊、字体缺字、动态猫链、完整玩法/广告、全项目分包/性能；未建立正式Prefab。首批纹理文件和不等于主包体积。没有提交/推送或后台自动任务。

下方UI-03G为历史验收，其旧源码哈希不再代表当前已修改的灰盒文件。

## UI-03G 验证 · 2026-09-10

- [验收记录与文件哈希](../design/ui/ui03g/verification.json)：17项源/几何/绘制误差/安全区/手势测试通过，Creator内置tsc严格检查通过。
- 真实Creator浏览器预览：七关、中央交换/发射意图、道具取消、暂停→设置→返回、重开确认取消、遮罩/拖动不穿透、前五关免费次数、广告成功/取消/失败/重复有效演示、加载态免费退出路径、首页/胜利容器通过；360×640、390×844、430×932重新载入实测通过。最终控制台告警/错误数组为空。
- 首轮发现脚本序列化UUID问题；连续绘制发现WebGL缓冲警告，已修复并重新截图。轨道仅显示折线简化≤0.25逻辑像素，每帧合并重画；源文件不变。源码与构建输入哈希匹配。
- 同一批灰盒资产的临时隔离工程通过web-mobile构建，Creator退出码36，最终日志无Missing class或error行；输出已保存 `build/ui-greybox-verified/`（Git忽略）。必须使用真实路径 `/private/tmp/mmhw-ui03g-build-20260910`，旧 `/tmp` 别名曾导致编译UUID映射缺失，失败日志不能当通过证据。
- [截图目录](../output/playwright/ui03g/README.md)共13张实际引擎截图：七关、首页/暂停/胜利、L087三尺寸。圆形品种文字为占位，不是正式五猫辨识验收。
- 百关源SHA与HEAD一致；Git无旧运行脚本/场景/素材内容差异。Creator为缺失元数据的旧资源自动补 `.meta`，另出现默认cocos-service配置，保留不覆盖；未提交/推送。
- 收尾检查：`git diff --check`通过；29份Markdown、175个本地链接、验收记录中的26个文件哈希核对通过；57份资产meta无顶层UUID重复，其中29份为旧资源缺失meta的自动补齐。
- 未测试正式字体/透明边缘/九宫格/生产Prefab、手机胶囊/触摸、真实广告/玩法、完整项目包体/性能/发布。UI-R03在360短屏模拟条件下热区约34.4 CSS px，需优化及手机复验。

## 已有产物与真实性边界

| 部分 | 当前记录（本轮或注明的历史核对） | 证据/不代表什么 |
|---|---|---|
| 项目记忆 | AGENTS + 00～07，08路线、09线框、10风格候选规范 | 记录事实与任务，不是自动调度系统 |
| 新 UI 路线 | 规划已进入首批同源资源的Cocos装载验证 | `08_UI_DEVELOPMENT_ROADMAP.md`、12；首批资源已导入，正式Prefab尚未制作 |
| UI-03 候选 | 1536×1024风格板，01原版+02逗猫棒修正版；10组色对、字体候选、组件状态与尺寸 | `art/concepts/ui03/manifest.json`、10与tokens；模型版本未知，候选未获审美批准 |
| UI-03 预检 | 五猫64/56/48框彩色与灰阶、10组色对及长文案试排 | `art/concepts/ui03/QA.md`；玄猫口鼻/绒毛留边需改独立源，字体/透明边缘/动态辨识未验 |
| 页面/状态规划 | P00～P11 导航、六类线框、十种复活契约、全局异常、引导/道具说明、十组资源及 3.8MB 首包草案 | `09_UI_STRUCTURE_AND_STATES.md`；预算未测量，Q004 未被当作产品删减决定 |
| 对话线框 | 六页面、首/末关几何、八种复活界面可切换，736/360px 浏览器检查 | 画面按钮为布局占位，未实现游戏导航、广告或核心逻辑；不是 Cocos 验收 |
| UI 几何试排 | 全部 100 关只读采样；发现下一只与上下设施余量风险 | 09 第 3 节；几何本身未改，不能宣称百关 UI 通过 |
| 百关几何 | 源文件有 100 关；现存检查报告 100/100 几何通过，4950 对形态比较无低于 48px RMS 复审对 | `design/track-review/catalog.source.json`、`generated/catalog/AUDIT.md`；不是动态可解性或实测难度 |
| 难度证据 | 已有多层压力、静态首撞/移除探针、开中末快照 | `generated/catalog/PRESSURE.md` 与 `evidence/`；静态移除不等于合法三消开缝 |
| 设计认可 | 所有者认可当前几何并免除重复逐关送审 | `tools/track-review/visual-authorization.json` 是先前 ImageGen 阶段授权存档；最新范围看D013，不含旧队列续跑 |
| 旧 UI 图片 | MEM-01 核对：`v2_ui/jobs.json` 129 个旧计划项，实际对应文件 12 项；另有返工变体 | 本轮未重跑图片盘点；不是全套完成。旧 qa.json 有 5 个 CONCEPT_PASS、4 个 REWORK，其余未记录；都未获新方向批准 |
| 旧 Figma | 仓库有交付记录与截图，交付记录标为已否决 | 本轮未连接/审查实时 Figma；不能宣称当前远端画布质量或数量 |
| Cocos 工程 | 3.8.8；旧原型13个TS+main.scene保持原样，灰盒3个TS+ui-greybox.scene，共16个TS/2个场景/0个Prefab；UI-04新增12图引用 | 七关首批资源已验证；完整玩法、正式页面/Prefab与发布仍未完成 |
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

- Q004：推荐首页主按钮 + 关卡/图鉴/外观 + 小设置，录屏分享主要在结算；尚未收到首页录屏入口的具体选择。GDD/PRODUCT 原条款仍保留，本轮没有取消录屏能力或新增活动系统。
- `CORE_GAMEPLAY_SPEC.md` 第 4.3 节旧首关螺旋坐标不是当前首关路线；**具体坐标以 catalog.source.json 为准**，该段仅历史示例。
- CORE 第 8.2 节统一猫半径与后续分档规格不一致；已确认尺寸以 D005、PRODUCT 第 5.1 节和当前几何 profile 为准。
- CORE 呼噜加值描述与 PRODUCT 公式不同；危险末段阈值有 97% / 95% 差别；需 Q003 收敛，不能自行选值实现。
- 旧详细规格中的当前阶段/强制美术流程已统一加失效提示；玩法与 QA 义务未整体废除。个别历史段落保留原文，不是当前执行指令。

## UI-03 验证与未完成项 · 2026-09-09

- 候选02 SHA-256：`5ab48d48927227085227fe62e3a6438334dab8fc29079723b66fd3a6bc9510c1`；1536×1024、RGB、1,698,194字节。01与02、提示词及来源清单已保存仓库，不覆盖旧文件；原板不进入发布包。
- 通过内置 image_gen 生成/编辑；工具未返回模型标识，实际模型记未知。逗猫棒的魔法棒误读已修正，精确颜色与尺寸独立用tokens表达。
- CUA浏览器检查五猫64/56/48框及灰阶切换，DOM确认15个框的CSS尺寸；1000/736/360px检查概念预览与按钮文案，控制台警告/错误为空。系统字体试排不冒充候选字体实测。
- UI-Q01：玄猫在48框内口鼻偏弱，独立源需增强脸部明暗；UI-Q02：五猫需统一轮廓留边、简化细绒毛，不侵占紧凑间隔。保留UI-R01下一只约6.60px、UI-R02上下约12/10px问题。
- Python内联计算10组sRGB色对，修正警戒字色后全部达到草案目标；官方字体来源/许可证和W3C计算依据见10。尚未下载、安装或子集化字体。
- 文档/JSON/图片尺寸与哈希、相对本轮开始白名单和几何源一致性检查通过，`git diff --check`通过；本轮相对1085文件开始快照新增9文件、修改11份Markdown。新增明细见下节，原有未提交内容保留，未提交/推送。
- 临时服务`127.0.0.1:62260`、本轮浏览器测试页均已关闭，视口恢复；无后台自动任务。服务日志有浏览器默认favicon请求404，页面与图片请求200，未影响自检内容。
- 未做Cocos/核心逻辑/真实广告/动态百关/真机/包体测试，也未检验正式字体、透明边缘或九宫格。候选预检不替代这些验收。

## UI-02 历史布局风险与验证 · 2026-09-09

- UI-R01：有限右下候选下，含 4px 预览边框的下一只气泡在 L087 最小占位间隔约 6.60px，未达建议 8px。L100 候选为 `(394.67,748.41)`、约 14.49px；这是采样估计，正式猫耳/阴影仍需检查。
- UI-R02：现有 80×40 设施示意在 L024 可到 y=188..1162；HUD 收在 176 内、道具从 1172 起仍只余 12/10px。加入 L022/L024 和 L087 灰盒检查，不改几何迁就 UI。
- 开始时 `main` 已有 UI-01 的 12 份 Markdown 修改与未跟踪 08；本轮开始记录 1084 个文件哈希到 `/tmp/mmhw-ui02-start.json`，用作本轮范围核对。未清理、提交、推送或创建分支。
- 几何只读核对：Node 内联脚本调用现有 `makePath/parameterize/resample/at`，约 2px 步长检查 100 关包络和设施、下一只候选间隔；只输出估算。源 SHA-256 仍为 `fab0b72c634d89b6b4081c16a4253c2b1046183308304091b8f0510e75c72e7c`，与开始时及 HEAD 字节一致。
- 文档检查：`git diff --check`；`python3` 内联检查 27 份 Markdown 的本地链接/围栏、新文件空白、任务白名单和源几何一致性，均通过。相对本轮开始仅新增 09、修改 11 份 Markdown；既有 UI_ART_PIPELINE、IMPLEMENTATION_PLAN 的 UI-01 变更原样保留。
- 线框检查：通过 visualize 的 `scripts/render.py … --serve` 临时包装，再用 CUA 浏览器核对六页面、L001/L100、八个复活界面状态和 736/360px 显示；修复了隐藏选择器、呼噜填充起点、末关标注重叠和恢复时免费重开入口，浏览器警告/错误日志为空。未改变系统主题，深色仅具备对应色值，未做深色实测。
- 最终线框为 21KB 级片段，位于本任务可写 visualization 目录；没有外部请求或正式资产导入。临时服务 `127.0.0.1:62250` 已关闭，测试页已关闭，临时视口已恢复，无后台续跑任务。
- 未运行核心单测、几何重生成、Cocos、真实广告、包体/性能或手机测试。本轮规划与浏览器显示检查不能代替这些验证；R-PLAYING/R-STALE 只定义契约。
- UI-02 规划交付完成，认领已释放；D012 仅记录承接路线和规划授权。Q002/Q003/Q004、UI-R01/UI-R02 已交接。

## UI-01 本轮验证 · 2026-09-08

- 开始时分支为 `main`，`git status --short` 为空；执行前在 07 认领文档范围，无其他活动认领。
- 只读核对 package、场景、GameRoot、平台适配器、详细规格及源几何；当前 13 个 TS、一个场景、0 个 Prefab。L100 源参数为三层、108° 三层覆盖，作为视觉试样候选，不推断动态难度。
- 几何源 SHA-256：`fab0b72c634d89b6b4081c16a4253c2b1046183308304091b8f0510e75c72e7c`；交付检查与开始时及 `git show HEAD:design/track-review/catalog.source.json` 字节一致。
- `git diff --check` 通过。`python3` 内联只读检查 26 份 Markdown、129 个本地链接、代码围栏、修改白名单与新增文件空白，错误 0；确认仅 12 份 Markdown 修改、1 份 Markdown 新增。
- 官方资料已核验 Cocos 3.8 Sprite/SafeArea/Bundle/抖音构建及抖音安全区/代码包约束，来源紧邻 08 对应条目。抖音适配清单直接抓取超时后通过搜索正文核对，仅引用跨引擎安全区要求。
- 本轮不运行核心测试、几何重生成、Cocos、真实广告、包体/性能或手机测试；文档规划无相应实现变更，MEM-01 的历史 139 项通过不冒充本轮测试。
- UI-01 规划已完成，07 认领已释放。未创建新预览服务/自动任务，未提交或推送。

## MEM-01 历史验证 · 2026-09-08

- 只读核查 package/settings、场景 JSON、全部脚本文件清单、关键实现、几何源/报告、图片清单与 qa.json。
- Node 22.22.0 执行 `node --test --test-reporter=dot tools/track-review/catalog.test.mjs tools/track-review/geometry.test.mjs`：**139 项通过，退出码 0**。未重生成几何/图片。
- 未运行 Cocos、核心编译/旧核心模拟、真实平台、性能和真机测试；不借用历史结果冒充本轮验证。
- 文档检查：README、AGENTS、docs 全部 Markdown 及旧图片 README 共 25 份，本地 Markdown 链接无失效目标；00～07 八份文件齐全。`git diff --check` 通过（仅覆盖已跟踪差异，不能代表所有未跟踪文件的检查）。
- 工作区原本已有大量未跟踪内容及修改；本轮未清理、提交或推送。未来需要所有者授权 Git 备份；仅保存在当前磁盘不等于已远端备份。

## UI-03 文件清单

新增 [10_UI_STYLE_GUIDE.md](10_UI_STYLE_GUIDE.md)、[候选令牌](../design/ui/ui03.tokens.json)，以及 `art/concepts/ui03/` 中两张PNG、两份提示词、manifest.json、QA.md、qa_preview.html，共9文件。修改 AGENTS、README、00、01、04、05、06、07、08、09、UX_UI_SPEC，共11份Markdown。原有03、IMPLEMENTATION_PLAN、UI_ART_PIPELINE等未新增本轮修改。

未改运行脚本、场景、几何配置、运行素材、`.meta`、构建配置或旧图片目录。

## UI-02 历史文件清单

新增 [09_UI_STRUCTURE_AND_STATES.md](09_UI_STRUCTURE_AND_STATES.md)。相对 UI-02 开始状态，修改 AGENTS、README、00、01、03、04、05、06、07、08 及 UX_UI_SPEC 顶部入口，共 11 份修改、1 份新增，均为 Markdown。另提供本任务对话线框预览，不进入 Cocos 资源目录。

没有修改运行脚本、场景、几何配置、素材、`.meta` 或构建配置。

## UI-01 历史文件清单

新增 [08_UI_DEVELOPMENT_ROADMAP.md](08_UI_DEVELOPMENT_ROADMAP.md)。修改 AGENTS、README、00、01、03、04、05、06、07，并在 UX_UI_SPEC、UI_ART_PIPELINE、IMPLEMENTATION_PLAN 顶部补充最新路线入口与历史依赖说明。共 1 份新增、12 份修改，全部为 Markdown。

本轮没有修改运行脚本、场景、几何配置、素材、`.meta` 或构建配置。

## MEM-01 历史文件清单

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

下一步：读08/09/10/11/12及UI-04验收JSON，按后续任务推进 **UI-05 代表页面/组件与手机视觉验证**。UI-04已交付，不重复五猫生图、旧整板或129项队列。采用同源PNG建立实际组件，继承UI-Q01/02与真实胶囊/手机触达检查；首页入口若有具体选择再同步Q004与GDD/PRODUCT。7456预览依赖用户编辑器；未创建后台自动工作。

更新本文件时保留关键证据路径，移除已过期“进行中”；只把有证据的内容标完成。新决定去 05，任务与交接去 07，不把聊天全文堆进这里。
