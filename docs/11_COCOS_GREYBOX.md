# 11 · Cocos 代表关布局灰盒

> UI-04 后续更新（2026-09-11）：同一场景已导入五猫与通用UI底图，短屏透明热区已扩大；当前效果和验收见 [12](12_UI_ASSET_BATCH.md)。本页下方以及ui03g截图/哈希是UI-03G历史交付，圆形猫和34.4px热区描述不再代表当前运行画面。入口/老巢仍占位，游戏规则仍未绑定。

任务 UI-03G；D014 授权；2026-09-09 开始、09-10 继续。基于现有 Creator 3.8.8 工程，新增隔离场景；这是一套可交互的布局试验，尚未绑定正式游戏规则。

## 打开与操作

在 Creator 资源管理器打开 [ui-greybox.scene](../assets/ui-greybox/ui-greybox.scene)，点击预览。当前编辑器服务可直接预览 [灰盒场景](http://localhost:7456/?scene=a03a9bbb-20f6-4b6b-9d18-c0c359f76001)；端口取决于实际运行的编辑器，不能假定跨窗口仍在线。

- 底部实验工具：换关、安全区、边界、胜利、复活、首页。它们用于验收，不属于正式游戏界面。
- 七个代表关依次为 L001、020、021、022、024、087、100。中央轻点交换；玩法区释放仅记录发射意图。道具点选后再次点同一道具取消。
- 暂停、设置返回、重开/退出确认、首页、胜利与复活都有占位容器。复活中的成功/取消/失败按钮是模拟回调，免费重开与返回始终可选。
- 猫链为固定快照；圆形、品种文字、入口与老巢方块都是占位。未导入风格板切图、正式字体或九宫格资源；没有实际消除、存档、广告或奖励事务。

## 几何与布局结果

唯一来源仍是 `design/track-review/catalog.source.json`，SHA-256：`fab0b72c634d89b6b4081c16a4253c2b1046183308304091b8f0510e75c72e7c`。

[Fixtures.ts](../assets/ui-greybox/Fixtures.ts) 只携带七关的只读派生快照，2px 重采样，六位小数；端点与尺寸校验保留，偏离源折线小于0.05px。中央发射器始终 `(375,675)`，五猫64/56px，轨道、设施、猫、发射器共同等比适配。

轨道 Graphics 绘制使用最大0.25逻辑像素误差的折线简化，减少无用顶点；它仅用于显示，未修改设计源、快照、猫位置或包络检查。一个引擎帧最多重画一次，避免同帧重复创建/销毁绘制节点。

| 代表关 | 顶部占位间隔 | 底部占位间隔 | 下一只位置 / 最小间隔 |
|---|---:|---:|---|
| 001 | 108px | 114px | 中央窝旁 / 24px |
| 020 | 53px | 84px | 中央窝旁 / 24px |
| 021 | 85.99px | 166.78px | 中央窝旁 / 28px |
| 022 | 24px | 30px | 中央窝旁 / 28px |
| 024 | 20px | 26px | 中央窝旁 / 16.08px |
| 087 | 24px | 26px | 顶部 HUD / 156.94px |
| 100 | 135.74px | 75.27px | 顶部 HUD / 258.30px |

调整方案：HUD 占位最下沿168，道具热区1188..1276；下一只在固定候选中检查轨道、两个设施与中央窝完整边框，不能满足8px时停靠顶部 `(668,108)`。同一关位置稳定，不跟着猫链移动。UI-R01 在七关占位条件下已处理；UI-R02 最小上下余量由12/10px增加到20/26px。正式毛绒边、阴影、粒子、设施尺寸仍须重新验证，不能称百关美术适配完成。

## 安全区与输入

读取 Creator `sys.getSafeAreaRect(false)` 的设计坐标，再转换成左上原点；内部拟合函数只接收同一坐标系的矩形，不混用DPR。背景可铺满，整个试验舞台拟合安全矩形。模拟胶囊额外排除顶部条带；正式抖音胶囊接口仍未接入。

测试覆盖360×640、390×844、430×932的真实引擎画布，另有五种尺寸的纯布局测试。Creator 网页全屏预览容器在启动时固定宽度，测试按尺寸重新载入页面；不把这个过程写成热旋转/原生窗口适配通过。

热区基准仍88×88逻辑像素。360×640加模拟安全区时整体缩放约0.814，88逻辑热区约34.4 CSS px：这是 **UI-R03 待正式试样优化**，需评估紧凑屏触达、扩大透明热区或重排外围HUD，并复验几何间隔；不能把逻辑88直接等同44 CSS px。

手势起点决定整段归属；UI拖入玩法区不发射，弹窗遮罩阻断玩法；后台/取消丢弃未完成手势；第二根手指不能替换第一根。真实浏览器测试通过鼠标事件进入 Cocos 输入系统；多指和取消另有纯逻辑断言，手机触摸尚未验证。

## 文件与复现

- [Greybox.ts](../assets/ui-greybox/Greybox.ts)：独立 Cocos 组件、分层绘制、快照与交互容器；不引用旧 GameSession/SaveService。
- [Layout.ts](../assets/ui-greybox/Layout.ts)：无 `cc` 依赖的几何、拟合与手势归属。
- [generate.mjs](../tools/ui-greybox/generate.mjs)：只输出首次派生文件的 apply_patch，已有文件时拒绝覆盖；不运行旧 catalog 重生成入口。
- [layout.test.mjs](../tools/ui-greybox/layout.test.mjs)：17项源一致性、绘制误差、间隔、安全区、输入检查。
- [browser-check.js](../tools/ui-greybox/browser-check.js)：通过 Playwright CLI 对真实画布点击并截图；预览前应关闭性能浮层并选择网页全屏。
- [引擎截图](../output/playwright/ui03g/README.md)：七关、暂停、首页、胜利、三种尺寸安全区。

本机检查命令：

```bash
/Users/limingrui/.nvm/versions/node/v22.22.0/bin/node --test tools/ui-greybox/layout.test.mjs
/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
```

编辑器打开原工程时，构建验证使用 `/private/tmp/mmhw-ui03g-build-20260910` 临时工程，只复制当前灰盒资产，保留其UUID。必须用真实路径，`/tmp`别名曾导致脚本UUID关联失败。最终退出码36，输出复制到 `build/ui-greybox-verified/`。遵循 [Creator 3.8 命令行构建说明](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-in-command-line.html)；仅验证代表场景可导入/打包，不代表原工程所有旧资源的发布质量。

## 验收边界与下一步

17项数学/手势测试、TypeScript严格检查、七关/核心容器/三尺寸真实浏览器检查和最终独立构建通过。绘制修复后最终diagnostics为空；复核及代码/截图哈希见 [验收JSON](../design/ui/ui03g/verification.json)。首轮发现并修正场景脚本压缩UUID引用；后续Graphics缓冲警告通过减少绘制顶点、合并同帧重画解决，未仅凭构建退出码宣布通过。

未完成：正式素材/字体/九宫格、可编辑生产 Prefab、手机安全区/胶囊/多指、包体/性能验收、百关运行配置与真实玩法/广告。UI-Q01玄猫小尺寸口鼻和UI-Q02绒毛留边仍留给独立资产验证。

下一任务是 UI-04 的最小独立资源批次，随后 UI-05 在此布局上形成实际引擎视觉基线；不能直接把这组灰盒截图定为最终美术。
