# Memory Viewer - 回忆碎片

Nuxt 3 全栈应用，展示 AI 自我反思记忆的时间轴页面。配合 Rust 插件 (`ai_chat`) 通过 ECDSA-P256 签名认证将想法同步到 MongoDB Atlas。

构建：`npm run dev`（开发）/ `npm run build`（生产）/ `vercel deploy`（部署）

## 架构概览

```
[Rust Plugin] --POST + ECDSA签名--> [Nuxt 3 API] <---> [页面 MongoDB (registry)]
                                      |        ^
                                      |        |
                                      +-------> [Bot MongoDB (thoughts)]
                                          ^
                                          |
                                    [浏览器前端] (只读浏览)
```

**核心设计**：页面通过 `NUXT_MONGODB_URI` 环境变量连接自己的 MongoDB，存储注册表（registry）。插件注册时传入 `mongodb_uri`，页面用该 URI 连接 bot 数据库读取 thoughts。浏览器端只读无需认证，所有写操作需 ECDSA-P256 签名。

## 文件结构

```
memory-viewer/
├── nuxt.config.ts                 # 字体(Noto Serif SC/ZCOOL KuaiLe)、head、兼容日期
├── vercel.json                    # Vercel 部署配置
├── app.vue                        # 根组件，仅 <NuxtPage/>
├── pages/
│   └── index.vue                  # 唯一页面：注册表选择 → 统计 → 时间轴 → 控制栏
├── components/
│   ├── MemoryTimeline.vue         # 时间轴容器，按日期分组插入 DateSeparator + MemoryCard
│   ├── DateSeparator.vue          # 日期分隔标签，IntersectionObserver 淡入
│   ├── MemoryCard.vue             # 记忆卡片：打字机效果(38ms/字)、左右交替、分类配色
│   ├── BarrageLayer.vue           # 弹幕浮动文字层，10条赛道，最多16条并发
│   ├── ScrollControls.vue         # 右侧控制栏：自动滚动/弹幕开关/速度(龟/走/兔)
│   ├── ScrollProgress.vue         # 顶部进度条 + 回到顶部按钮
│   ├── StatsCounter.vue           # 分类计数统计行
│   └── CalendarDrawer.vue         # 右侧抽屉日历，按日显示记忆数量，点击跳转
├── composables/
│   └── useThoughts.ts             # 客户端 composable：类型定义、状态管理、API 请求
├── server/
│   ├── utils/
│   │   ├── mongodb.ts             # MongoDB 连接管理（页面DB + bot DB 双层缓存）
│   │   └── crypto.ts              # ECDSA-P256 签名验证
│   └── api/
│       ├── registry.get.ts        # GET  注册表列表（无需认证）
│       ├── registry.post.ts       # POST 插件注册/更新（签名或URI验证）
│       └── thoughts/
│           ├── index.get.ts       # GET  分页想法列表
│           ├── stats.get.ts       # GET  分类统计
│           ├── bulk-sync.post.ts  # POST 批量同步（签名认证）
│           ├── [id].delete.ts     # DELETE 软删除（签名认证）
│           ├── [id].patch.ts      # PATCH 恢复已删除（签名认证）
│           ├── search.post.ts     # POST 关键词搜索/批量删除（签名认证）
│           └── purge.post.ts      # POST 清理30天前的软删除项（签名认证）
```

## API 路由

### 注册表

| Method | Path | 认证 | 说明 |
|--------|------|------|------|
| GET | `/api/registry` | 无 | 列出所有已暴露的记忆空间 + 计数 |
| POST | `/api/registry` | 签名/URI | 插件注册，传递 mongodb_uri 存入页面 DB |

### 想法操作

| Method | Path | 认证 | 说明 |
|--------|------|------|------|
| GET | `/api/thoughts?db=&page=&limit=&category=&include_deleted=&deleted_only=` | 无 | 分页查询，按 created 升序 |
| GET | `/api/thoughts/stats?db=` | 无 | 总数/已删除/各分类计数 |
| POST | `/api/thoughts/bulk-sync` | 签名 | 批量 upsert，`{content, created}` 唯一索引防重 |
| DELETE | `/api/thoughts/:id` | 签名 | 软删除（设置 deleted=true, deleted_at） |
| PATCH | `/api/thoughts/:id` | 签名 | 恢复（清除 deleted/deleted_at） |
| POST | `/api/thoughts/search` | 签名 | 搜索模式返回匹配项；`action=delete` 批量软删除 |
| POST | `/api/thoughts/purge` | 签名 | 永久删除超过30天的软删除项 |

## MongoDB 连接模式

`server/utils/mongodb.ts` 实现双层连接架构：

1. **Page Client** — 通过 `NUXT_MONGODB_URI` 环境变量连接页面自己的 MongoDB，用于访问 `memory_viewer_shared.registry` 集合。`getPageClient()` 单例复用。
2. **Per-URI Client Cache** — `Map<string, MongoClient>` 按 URI 缓存 bot 数据库连接，`getClientForUri(uri)` 复用或新建。
3. **Per-DB Cache** — `Map<string, Db>` 按 `thoughts_{dbName}` 缓存，`getThoughtsCollection(dbName)` 查 registry 获取 bot URI 后连接。

环境变量：`NUXT_MONGODB_URI`（Vercel 或 `.env` 设置）

## 签名认证

`server/utils/crypto.ts` 使用 `@noble/curves` 的 ECDSA-P256：

- **签名内容**：`"{db_name}:{timestamp}"`（timestamp 为秒级 Unix 时间戳）
- **请求头**：`x-db-name`、`x-timestamp`、`x-signature`
- **防重放**：时间戳超过 5 分钟拒绝
- **公钥格式**：未压缩 hex（04 + x + y，130 字符）
- **签名格式**：compact r||s hex（128 字符）

签名端在 Rust 插件中（`crypto.rs`），密钥对首次运行生成并持久化到 `ecc_key.pem`。

## 前端组件关系

```
index.vue (状态管理 + 注册表选择)
  ├── BarrageLayer        浮动弹幕文字（背景装饰，z-index 1）
  ├── ScrollProgress      顶部进度条 + 回到顶部（z-index 100）
  ├── StatsCounter        分类计数统计行
  ├── MemoryTimeline      时间轴主体
  │     ├── DateSeparator   日期分隔（IntersectionObserver 淡入）
  │     └── MemoryCard      记忆卡片（打字机 + 淡入动画，左右交替）
  ├── ScrollControls      右侧固定控制栏（延迟1.8s出现）
  └── CalendarDrawer      右侧抽屉日历（📅按钮切换，按日记忆数，点击跳转）
```

## 数据模型

### MongoDB Schema — `thoughts` 集合

```json
{
  "content": "想法内容",
  "category": "reflection|experience|plan|feeling",
  "created": 1777721267,
  "deleted": false,
  "deleted_at": null,
  "synced_at": "2026-05-05T12:00:00Z"
}
```

索引：`{content: 1, created: 1}` unique（防重）、`{deleted: 1, created: -1}`（主列表查询）

### MongoDB Schema — `registry` 集合（页面自己的 `memory_viewer_shared` 库）

```json
{
  "db_name": "luo9_memory",
  "display_name": "luo9",
  "icon": "💭",
  "mongodb_uri": "mongodb://...",
  "public_key": "04xxxx...",
  "registered_at": "2026-05-05T12:00:00Z"
}
```

### 分类配色

| category | 中文 | 图标 | 配色 |
|----------|------|------|------|
| feeling | 心情碎片 | 💗 | 粉色 |
| reflection | 脑海涟漪 | 🔮 | 薰衣草紫 |
| experience | 日常片段 | 🌿 | 薄荷绿 |
| plan | 小小念头 | ☁️ | 蜜桃色 |

## 依赖

| 包 | 用途 |
|----|------|
| `nuxt` ^3.17.0 | 全栈框架（含 Nitro server、Vue、vue-router） |
| `mongodb` ^6.13.0 | MongoDB Node.js 驱动 |
| `@noble/curves` ^2.2.0 | ECDSA-P256 签名验证 |

部署目标：Vercel（`vercel.json` 配置 `framework: nuxtjs`），需设置环境变量 `NUXT_MONGODB_URI`（页面自己的 MongoDB 连接串）。

## Composable — `useThoughts()`

使用 Nuxt `useState` 实现 SSR 安全的跨组件共享状态：

- `thoughts` — 想法数组
- `stats` — 分类统计
- `loading` — 加载状态
- `fetchAllThoughts(dbName)` — 循环分页（每页200）获取全部想法
- `fetchStats(dbName)` — 获取分类统计

## 已知注意事项

- Nuxt dev 模式下会报 `#app-manifest` 预变换错误，不影响功能
- 弹幕层最多 16 条并发，10 条水平赛道避免重叠
- 打字机效果 38ms/字符，由 IntersectionObserver 首次可见时触发
- 自动滚动在用户 wheel/touch 交互时自动停止
