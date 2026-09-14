# 14 · 抖币／钻石复活资格核验

核验日期：2026-09-14。任务 PAY-01；总控 `/root`。这是官方公开规则核验记录，不是新增商业化决策或支付实现。

## 结论与授权判断

所有者要求：先确定用抖币是否无需内购资格、无需版号；仅在此前提成立时，新增与看广告并列的付费复活方式。

**条件不成立，本轮不新增付费复活。** 官方确有钻石小额支付，可与激励广告并列，用于复活等奖励；但它属于小游戏虚拟支付／内购体系。公开支付协议要求提交版号与软著等材料，不能因为使用平台虚拟币、金额小或称为免广告，就当作广告能力接入。

本轮未登录项目开发者后台，未核验该主体的具体资质和权限，也未获得任何针对本项目的例外许可。结论依据以下官方规则，不依据论坛用户猜测。

## 官方证据

1. [小额支付](https://partner.open-douyin.com/docs/resource/zh-CN/mini-game/guide/business-guide/virtual-payment/small-payment-guide)：第一节把小额支付归为付费点设计和定价策略，计入内购；第三节案例1直接展示在复活点位提供少量钻石免广告的方案。这证明产品形式存在，不证明免除支付资质。
2. [小额支付接入指引](https://partner.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/payment/micropayment-guide)：使用道具直购能力，以钻石或现金兑换明确的道具／权益；安卓调用 `tt.requestGamePayment`。无需先转换游戏币，是交易流程简化，不是免内购。
3. [支付能力接入介绍](https://partner.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/payment/access-process)：前提条件要求申请虚拟支付、补齐资质、同意协议、开通收款商户并通过审核；道具直购与游戏币支付均在此体系内。
4. [小游戏虚拟道具支付协议](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/agreement-and-norms/business-capacity/protocol-2/item-payment)：页面标注2025-07-22更新／生效。第1.11条涵盖用法定货币或指定虚拟货币购买的游戏道具和服务；第6.1条要求提供版号批文、软件著作权登记证明及合法授权材料。这里包含虚拟币购买的游戏服务，不限于现金直购。
5. [小游戏审核常见问题·资质篇](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/contactus/endowments)：版号是开通内购能力的重要凭证，与支付协议要求相互印证。
6. [钻石兑换功能](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/business-guide/virtual-payment/diamonds)：该小游戏能力的官方用语是“抖音钻石”，在商业化的虚拟支付页签约，支持兑换游戏服务及道具，结算沿用内购流程。不能把日常所说“抖币”自动当作一条免资质的独立接口。
7. [钻石小额直付](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/business-guide/virtual-payment/diamond-pay)：满足余额和额度条件后可免二次确认，描述的是用户付款体验，未提供开发者免版号、免虚拟支付权限的规则。

“可以接入广告”也不等于无需任何上线资质：[ICP核准指引](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/icp/icp-filings)列有无版号小游戏先完成小游戏备案再进入ICP核准的路径。本轮不把广告模式概括成普遍法律豁免，也不宣称本项目已通过备案或上线审核。

## 对项目的处理

- 保持 `GAME_DESIGN.md` 第7节及D004：第1～5关一次免费复活；第6关起每次有效激励广告可复活一次、单局不限次数；取消／失败不发奖，免费重开和退出始终可选。这是设计规则，不是当前代码已全部实现的声明。
- 不新增抖币／钻石按钮、价格、支付接口、订单或扣币逻辑；不改GDD、核心规则和首发无内购范围。未追加改变商业化的决策。
- 未来如具备版号、平台虚拟支付及钻石能力权限，可重新评估广告与钻石并列复活；若规则将来明确给予本项目适用的豁免，应先保存官方依据并核验后台权限，再重新确认实施范围。当前不设价格、不预建支付框架。

## 验证与限制

2026-09-14通过官方文档网页读取及检索交叉核对；本轮仅新增本文件并追加06/07的核验与交接记录。文档链接目标、差异空白与修改范围检查见07。本轮未运行游戏／Cocos／广告／支付／真机测试，没有代码变更，也没有发起真实订单或外部联系。
