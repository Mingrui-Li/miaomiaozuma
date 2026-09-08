# 《喵喵回窝》技术规格

> 2026-09-08 本轮更新：本文件下方旧“当前状态”、逐关等待及 ImageGen → Figma → Cocos 强制流程仅作历史记录，已被 [D008](05_DECISION_LOG.md) 取代；当前仅建立项目记忆，新 UI 流程待确认，禁止自动续跑旧生产任务。未被替代的玩法/质量要求保留；具体状态、几何来源与残留冲突见 [06](06_CURRENT_STATE.md)，新 UI 方向见 [01](01_UI_DIRECTION.md)。

> 引擎：Cocos Creator 3.8.8  
> 语言：TypeScript  
> 目标：抖音小游戏，开发期支持浏览器预览与 Mock 平台能力。

## 1. 工程结构

```text
assets/
  game/
    art/
    audio/
    configs/
    prefabs/
    scenes/
    scripts/
      app/
      core/
      gameplay/
      platform/
      presentation/
      services/
      ui/
    tests/
docs/
art/
settings/
package.json
tsconfig.json
```

职责边界：

- `core`：不依赖 Cocos 的纯 TypeScript 类型、数学与规则。
- `gameplay`：Cocos 组件、表现同步和输入。
- `ui`：页面与组件控制器，不直接修改领域状态。
- `platform`：抖音与 Mock 适配器。
- `services`：存档、音频、分析、资源。
- `presentation`：领域事件到动画/音效/震动的映射。

## 2. 依赖规则

`core` 不得导入 `cc`。`gameplay/ui/platform` 可以依赖 `core`，但彼此通过接口和事件通信。平台全局 `tt` 只能出现在 `platform/douyin` 目录。

禁止：

- UI 直接修改猫咪数组。
- 关卡脚本内硬编码关卡号分支。
- 业务规则依赖动画结束回调才能正确结算。
- 使用物理引擎模拟队伍顺序。
- 在每帧创建临时数组、节点或大量闭包。

## 3. 核心类型

```ts
export type CatType = 'orange' | 'ragdoll' | 'blue' | 'calico' | 'black';
export type PieceKind = 'normal' | 'boxed' | 'dusty' | 'rainbow';

export interface ChainPiece {
  id: number;
  kind: PieceKind;
  catType: CatType | null;
  hiddenCatType?: CatType;
  hp: number;
  distance: number;
}

export interface ShotPiece {
  kind: 'normal' | 'rainbow';
  catType: CatType | null;
}

export interface SessionSnapshot {
  levelId: number;
  state: GameState;
  elapsedMs: number;
  score: number;
  purr: number;
  remainingToSpawn: number;
  pieces: ChainPiece[];
  currentShot: ShotPiece;
  nextShot: ShotPiece;
  rngState: number;
  reviveCount: number; // 仅统计；第 6 关起不得用此字段限制资格
  freeReviveCount: number; // 第 1～5 关最多一次免费复活
  runId: string;
  failedSnapshotId: string | null;
}
```

每个猫咪 ID 在一局中唯一且单调递增。移除后的 ID 不复用，防止延迟动画错误绑定到新对象。

广告适配层另存当前 `adAttemptId` 与已兑现事务；每次失败后的新有效广告可再次发奖。旧 `reviveUsed` 布尔门禁不得沿用。此处为待实现契约，几何审核阶段不修改 Cocos 运行代码。

## 4. 路径系统

### 4.1 输入

每条轨道由 2D 控制点和路径类型组成。MVP 只需支持三次贝塞尔段拼接：

```ts
interface CubicSegmentConfig {
  p0: Vec2Data;
  p1: Vec2Data;
  p2: Vec2Data;
  p3: Vec2Data;
}
```

每条路径配置还必须包含唯一 `sourceAnchor` 与 `lairAnchor`。加载后校验：样条恰好两个端点、无分叉/断段/闭环，`P(0)` 对齐入口、`P(L)` 对齐老巢，脚印方向沿 `+s`。渲染轨道与碰撞轨道必须由同一份样条数据生成。

### 4.2 预采样

- 每段先按 `t` 以 1/80 粗采样。
- 计算累计弧长并生成查找表。
- 按每 4px 弧长重采样为等距点，记录位置、单位切线、累计距离。
- `sampleAtDistance(d)` 使用二分查找相邻样本并线性插值。
- `projectPoint(point, hintIndex?)` 先在 hint 附近搜索，再在必要时全表搜索，返回最近距离与平方误差。

路径坐标采用设计分辨率坐标，渲染层负责转换到 Cocos 世界坐标。

## 5. 队列系统

### 5.1 不变量

- `pieces` 始终按 `distance` 严格递减排列。
- 相邻普通移动状态下距离差不小于 0，稳定状态目标为 `catSpacing = 66`。
- 距离不小于 `spawnMinDistance`，不大于 `pathLength`，动画过冲只允许出现在渲染节点，不写入领域值。
- 任何一只 `piece.id` 只能存在一次。

### 5.2 移动

- Flowing 状态每个固定步长增加所有活跃队列段的距离。
- 非同色断口存在时，入口侧链段额外增加 160px/s 追赶速度，并在 2.4 秒内合链；同色断口改由老巢侧链段沿 `-s` 以 2.2 倍速度反向回吸。
- 固定模拟步长为 1/60 秒；大于 100ms 的帧间隔钳制并分步执行，避免切后台后瞬移。
- Resolver 工作期间基础移动暂停。
- 初始或新生成的猫在起点后方排队，距离可为负值；渲染只显示进入轨道可视区的猫。

### 5.3 插入

1. 发射物碰撞或到达预计轨道点。
2. 将碰撞点投影为 `hitDistance`。
3. 在有序数组中寻找插入索引。
4. 新猫初始距离等于 `hitDistance`。
5. 以被撞猫为锚点向前后重新分配目标间距。
6. 0.12 秒挤压动画结束后进入匹配解析。

同时发生多个碰撞时只接受时间最早者；发射物一旦消费立即失效。

## 6. 匹配解析器

解析器使用命令队列而非递归动画回调：

```text
ResolveAt(index)
  -> IdentifyGroup
  -> RemoveGroup | Finish
  -> DamageAdjacentObstacles
  -> RevealIfNeeded
  -> CompactGap
  -> ResolveSeam
  -> CheckOutcome
```

- 规则计算立即完成，生成 `DomainEvent[]` 描述表现。
- 表现层顺序播放事件；核心状态不依赖节点动画是否成功。
- 设置最大解析深度 32；超过时记录错误并强制稳定化，防止配置异常死循环。
- 彩虹归属在匹配识别前确定，但仅对当前解析临时生效；未匹配彩虹保持 rainbow。

领域事件至少包括：`PieceInserted`、`MatchStarted`、`PiecesRemoved`、`ObstacleDamaged`、`ObstacleRevealed`、`GapOpened`、`PullbackStarted`、`SegmentsJoined`、`ComboChanged`、`PurrChanged`、`FrenzyStarted`、`FrenzyPushback`、`FrenzyEnded`、`SourceClosed`、`SessionWon`、`SessionLost`。

## 7. 随机与发射序列

使用可序列化的确定性 PRNG，例如 Mulberry32。每关种子由 `levelSeed XOR attemptIndex` 生成。

序列来源优先级：

1. 教学固定发射序列。
2. 关卡脚本片段。
3. 帮助型随机选择。

帮助型权重：

- 统计队列中每种猫数量和相邻 2 连位置。
- 可立即形成三连的类型权重 ×3。
- 队列中存在但当前发射缓存没有的类型权重 ×1.5。
- 当前队列中不存在的类型权重为 0，除非后续生成计划将在 2 只以内出现该类型。
- 连续生成同类型最多 3 次；教学脚本例外。

## 8. 关卡数据契约

```ts
interface LevelConfig {
  id: number;
  chapter: number;
  name: string;
  pathId: string;
  sourceId: string;
  lairId: string;
  seed: number;
  speed: number;
  initialPieces: PieceSpawnConfig[];
  wavePieces: PieceSpawnConfig[];
  scriptedShots?: ShotPiece[];
  helperStrength: number;
  purrMultiplier: number;
  purrGuaranteeMs?: number;
  safeClampMs?: number;
  score2Star: number;
  score3Star: number;
  allowedBoosters: BoosterType[];
}
```

配置加载时执行 schema 校验：ID 连续、轨道存在、猫类型合法、障碍隐藏类型存在、阈值递增、数组非空。失败时开发构建抛错，发布构建回退到内置安全关卡并上报。

## 9. 输入

`AimController` 只输出领域无关的 `AimChanged(angle, hitPreview)`、`ShootRequested(direction)`、`SwapRequested()`。

- 触摸开始记录位置和时间。
- 移动超过 16px 进入拖动；否则结束时视为点击。
- 瞄准角允许连续 `0..360°`；射线离开玩法区或先命中 UI 禁入区时本次发射取消/回收，不制造机械死角。
- UI 命中优先于游戏瞄准。
- Playing 之外的输入请求被明确拒绝，不进入缓冲。

广告复活补充（2026-09-07）：`reviveCount` 仅计数，不限制第 6 关起的复活资格；事务幂等键必须是 `runId + failedSnapshotId + adAttemptId`，不能只用 `runId`。旧广告回调不得作用于新局；同时只允许一个正在进行的广告复活请求。第 1～5 关的一次免费复活使用独立计数。完成次数、广告时间与局内活动时间分别记录。

## 10. 对象池与渲染同步

- `CatViewPool` 按表现种类预热，基础猫每种至少 16 个节点。
- 粒子、分数飘字、爱心、轨迹各自独立池。
- `ChainRenderer` 根据核心快照更新节点位置，不拥有顺序真相。
- 动画层可以添加 squash、rotation、offset，但不能修改核心 distance。
- 节点回收到池时必须清理 tween、事件监听、材质状态和透明度。

## 11. 存档

```ts
interface SaveDataV1 {
  schemaVersion: 1;
  updatedAt: number;
  highestUnlockedLevel: number;
  bestStarsByLevel: Record<string, number>;
  bestScoreByLevel: Record<string, number>;
  fishBalance: number;
  ownedCosmetics: string[];
  equippedCosmetics: { launcher: string; trail: string };
  boosterCounts: Record<BoosterType, number>;
  unlockedCards: string[];
  seenCards: string[];
  settings: { music: boolean; sfx: boolean; vibration: boolean };
  consecutiveFailuresByLevel: Record<string, number>;
  rewardedTransactions: string[];
}
```

- 本地 Key：`miaomiao_home_save_v1`。
- 写入采用 `serialize → checksum → temp → replace` 思路；平台存储不支持原子替换时保留主/备两份。
- 加载失败依次尝试主存档、备份、默认存档。
- `rewardedTransactions` 只保留最近 100 条。
- 新版本通过显式迁移函数升级，禁止散落兼容分支。

## 12. 平台适配

```ts
interface PlatformAdapter {
  getSafeArea(): SafeArea;
  vibrate(kind: 'light' | 'medium'): Promise<void>;
  showRewardedAd(placement: AdPlacement): Promise<AdResult>;
  startRecord(): Promise<void>;
  stopRecord(): Promise<RecordedClip | null>;
  shareClip(clip: RecordedClip, payload: SharePayload): Promise<ShareResult>;
  report(event: AnalyticsEvent): void;
  readCloudSave(): Promise<string | null>;
  writeCloudSave(data: string): Promise<void>;
  onPause(handler: () => void): Unsubscribe;
  onResume(handler: () => void): Unsubscribe;
}
```

实现：

- `MockPlatformAdapter`：浏览器和自动测试，所有结果可注入。
- `DouyinPlatformAdapter`：仅包装 `tt.*`，所有异常转为统一结果，不把平台错误抛到 UI。

## 13. 分析与日志

- 发布构建关闭逐帧与逐猫日志。
- 错误日志包含版本、关卡、会话 ID、配置版本和状态机状态，不包含用户照片或敏感数据。
- 数据上报在内存队列中批量发送；失败最多重试两次，失败不阻塞游戏。
- `level_end` 必须在同一会话中幂等，只上报一次。

## 14. 测试策略

纯逻辑单元测试覆盖：路径采样、端点绑定、连通与无环、有序插入、3/4/5 连、两侧匹配、彩虹归属、断口回吸、连续连锁、障碍扣血、暴走减速与回推、失败先于胜利、奖励幂等、存档迁移。

属性测试/随机模拟不变量：

- ID 唯一。
- 队列顺序合法。
- 分数、呼噜值、余额非负。
- Resolver 在 32 步内终止。
- 同一种子与输入序列得到完全相同结果。

## 15. 构建与配置

- 开发、测试、发布三套环境配置。
- 广告位 ID、上报开关和云存档开关不得硬编码到业务脚本。
- 提交仓库时不包含真实密钥、个人 token、缓存与构建产物。
- Cocos `.meta` 文件与资源一起提交，禁止只提交图片不提交 meta。

## 16. 技术完成定义

- 浏览器 Mock 模式完整可玩。
- 抖音适配代码可在没有 `tt` 全局时安全降级。
- 自动测试覆盖所有核心规则并通过。
- 关卡数据通过 schema 校验。
- 无持续增长的节点、事件监听或 tween。
- 60 FPS 目标设备上核心玩法帧时间稳定，低端模式可关闭非关键粒子。
- 构建脚本、运行说明和已知限制写入 README。
