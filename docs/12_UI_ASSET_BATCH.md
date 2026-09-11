# 12 · UI-04 首批独立资源与 Cocos 试样

D015 / D016，2026-09-10～11，总控 `/root`。本批完成五猫静态帧、通用按钮状态/面板/暂停图标的独立导出和代表关装载；未形成全游戏美术或可上线版本。

## 直接查看

- Creator 打开 [ui-greybox.scene](../assets/ui-greybox/ui-greybox.scene)，预览后可切换七关、首页、暂停、胜利和复活容器。[本地预览](http://localhost:7456/?scene=a03a9bbb-20f6-4b6b-9d18-c0c359f76001) 依赖用户当前编辑器服务。
- [五猫大图、64/56/48 小尺寸、灰阶和深底检查](../art/qa/ui04/cats_sizes.png)。这些尺寸是完整 Sprite 画布；耳朵和爪子也必须落在原碰撞圆内，不单独放大头部。
- [Cocos 截图](../output/playwright/ui04/README.md) 和 [资产清单](../design/ui/ui04/assets.json)；源图没有经过 Figma 转绘。

## 交付契约

| 资产 | PNG 画布 | 用途 / 约束 |
|---|---|---|
| `cat_orange / ragdoll / blue / calico / black` | 各 256×256 RGBA | 中心锚点；64/56 逻辑像素显示，48 压力检查；每猫静态一帧 |
| `btn_primary / primary_pressed` | 96×64 RGBA | 暖橘主按钮；九宫格四边 inset 均为 30 源像素 |
| `btn_secondary / secondary_pressed` | 96×64 RGBA | 奶油次按钮；inset 30 |
| `btn_disabled` | 96×64 RGBA | 禁用底图交付；正式 disabled/loading 语义绑定留待组件任务 |
| `panel_popup` | 128×128 RGBA | 通用面板；inset 36；贴花、标题、文字独立 |
| `icon_pause` | 64×64 RGBA | 实际图形，替代字体暂停符号；不可九宫格拉伸 |

共 **12 张 PNG，330,055 字节（约 322 KiB）**。这是本批 PNG 文件和，不是压缩主包体积或运行内存；五猫源图和 QA 图不进游戏包。按钮切线经中心行/列连续性检查，使用平整填色避免中段拉伸接缝。10 中较早的 192×128/256×256 与 inset 草案未被直接用作导出参数；本批真实参数以上表及清单为准，候选风格并未全局冻结。

`art/source/ui04/` 保留生成原图、分割中间结果、精修透明图和七个 SVG 源；`art/exports/ui04/` 为无损导出；`assets/game/art/ui04/` 的对应 PNG 与导出逐字节相同。逐项尺寸、alpha 边界、SHA-256、中心锚点及纹理 UUID 见清单。目录 meta 由 Creator 补齐；未覆盖旧资源及旧 meta。

纹理使用线性过滤、无 mipmap、边缘钳制。当前在灰盒脚本的序列化 `catTextures` / `uiTextures` 数组引用，按纹理建立 SpriteFrame；按钮和面板使用 `Sprite.Type.SLICED`，猫使用 SIMPLE。场景会直接携带这批依赖，不借用 `resources` 目录重复装载；未建立正式 Prefab、图集或分包。字体仍为 Cocos 系统字体回退，未嵌入、未冻结授权字体。

## 生图与透明处理记录

内置生图共六次：橘猫原图、橘猫透明修正尝试、另外四猫。实际模型版本未返回，不推测型号。[提示词](../art/source/ui04/prompts.json) 全部保留；第一只参考 UI-03 的 `style_board_02.png`，其余四只参考独立橘猫原图统一姿态。

橘猫前两次均为 1254×1254 RGB，棋盘格被画入像素，透明修正版本没有通过导出验收；保留为 `cat_orange_failed_alpha_original.png`，没有导入。布偶/蓝猫/三花是同尺寸灰底 RGB。玄猫此次实际返回 RGBA，直接保留其原始 alpha。

用户明确授权本地抠图/缩放后（D016），先通过 macOS Vision 提取橘/布/蓝/花的前景，再用 GrabCut 细化边缘。Vision 的粗分割曾保留橘猫棋盘格边圈，因此中间 `_alpha` 文件不能当成最终导入资源。`_refined` 为细化结果，随后裁透明外边、统一中心，以可见像素最大半径缩放进 256 画布的原碰撞圆；保留抗锯齿。实际可见最大半径约 123.3～124.3，小于 128。

工具：`tools/ui-assets/matte.m`（macOS Vision）、`refine.py`（OpenCV 4.11.0.86）、`export.py`（Pillow/CairoSVG）、`check.py`。Swift 尝试因本机编译器/SDK 版本不匹配未使用，保留脚本为失败实验记录；实际流程用 Objective-C 编译。Vision 在沙箱内返回不支持错误，已通过获准的本地进程调用完成；没有付费 API 或远端抠图服务。OpenCV 仅安装在临时 `/private/tmp/mmhw-image-libs`，不是仓库依赖或运行时依赖。

复现导出时保留已有资源：`export.py` 对不同内容拒绝覆盖，修改资产必须另做版本或明确更新对应契约。先完成四猫前景提取与细化，再统一运行导出，不生成残缺批次清单。原图和中间结果的哈希见验收记录。

## 短屏触达 UI-R03

保留原 88×88 视觉按钮，按 `screen.windowSize / devicePixelRatio` 与 stage 缩放计算透明点击区，目标至少 **44×44 CSS 像素**。360×640 的模拟刘海/胶囊条件下，热区从约 34.4 提升至 44 CSS 像素，等价 112.67 逻辑像素。暂停扩展区与七关玩法占用包络、底部道具扩展区与设施均仍保留至少 8 逻辑像素间隔；源几何、猫径及发射器不变。

暂停动作间距调整为 120 逻辑像素，复活模拟的五按钮同样拉开，面板高度从 764 改为 800，避免扩大热区后彼此重叠。开发工具栏继续独立于正式交互区域，不作为产品触达验收对象。

浏览器测试在新热区上边缘内 1 CSS 像素处点击，包含旧视觉框外的透明部分；初次以 1 逻辑像素取点时因 Chromium 事件坐标整数化落到边界外，修正测试采样后复测通过。未因此偷偷缩小热区或改几何。手机物理触感、真实抖音胶囊与热切换视口仍需 UI-05 验证。

## 验收和限制

- `node --test tools/ui-greybox/layout.test.mjs`：18 项通过，含几何来源、七关包络、预览避让、安全区、手势归属及短屏热区间隔。
- Creator 内置 TypeScript：`tsc --noEmit -p tsconfig.json` 严格编译通过。
- `python3 tools/ui-assets/check.py`：12 图导出/导入/hash、真 RGBA/全透明外边、五猫可见圆边界、九宫格中段连续性通过；报告 [checks.json](../art/qa/ui04/checks.json)。
- Playwright 实际 Canvas 操作：七关资源装载、原灰盒输入/弹窗流程，360×640、390×844、430×932 三尺寸的热区大小、互不重叠、边缘点击、免费恢复出口通过；最终控制台 diagnostics 为空。每尺寸重新加载页面，未冒充热 resize 或手机测试。
- 完整凭据与当前文件哈希见 [verification.json](../design/ui/ui04/verification.json)。UI-03G 验收 JSON/截图保持历史原样，不能拿其中旧代码哈希证明现在的文件。

构建运行检查额外发现 Creator 的 loose 转换把 `[...Set]` 编译为 `[].concat(Set)`，使轨道绘制数组出现 undefined；已改为 `Array.from(keep)`，源几何和简化误差不变。首个失败构建只保留为 `build/ui04-build-attempt-01/`，不能当作交付；最终以重新构建后的真实运行检查为准。此问题也说明编辑器预览通过不等于打包运行通过。

UI-Q01 玄猫口鼻已提亮，五猫静态小图色块/花纹可区分；48 像素尤其短屏实际缩放后的细表情仍弱。UI-Q02 毛发纹理经缩小得到控制，深浅底检查未见明显棋盘格残留，但未做动画辨识或手机验收。未制作设施/背景正式美术、完整 UI 页面/Prefab、字体、猫咪动画、真实广告/存档、动态百关或完整项目发布包。

下一任务 UI-05：以这些同源资源在 Cocos 做局内代表页及共用组件，再做首页/结算，补真实手机、安全区、字体和按钮状态验证，形成所有者认可的引擎视觉基线。
