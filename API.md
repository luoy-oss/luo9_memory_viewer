# Memory Viewer API 文档

## 基础信息

- **Base URL**: `https://your-domain.com`（本地开发: `http://localhost:3000`）
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

## 签名认证

所有写操作（POST/DELETE/PATCH）需要 ECDSA-P256 签名认证。

### 签名流程

1. 构造签名内容：`"{db_name}:{timestamp}"`
   - `db_name`：数据库名称
   - `timestamp`：秒级 Unix 时间戳（当前时间）
2. 使用 ECDSA-P256 私钥签名，生成 compact `r||s` 格式 hex（128 字符）
3. 将以下三个值放入请求头：

| Header | 说明 | 示例 |
|--------|------|------|
| `x-db-name` | 数据库名称 | `luo9_memory` |
| `x-timestamp` | 秒级 Unix 时间戳 | `1777967273` |
| `x-signature` | compact r\|\|s hex 签名 | `a1b2c3...`（128 字符） |

### 公钥格式

- 未压缩 hex：`04` + x（64 字符）+ y（64 字符）= 130 字符
- 示例：`04a1b2c3d4e5f6...`

### 防重放

- 时间戳与服务器时间差超过 **5 分钟**的请求会被拒绝（HTTP 403）

### 签名端参考（Rust）

```rust
use p256::ecdsa::{SigningKey, signature::Signer};
use std::time::{SystemTime, UNIX_EPOCH};

let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
let message = format!("{}:{}", db_name, timestamp);
let signature: p256::ecdsa::Signature = signing_key.sign(message.as_bytes());
// 发送 signature.to_bytes() 的 hex 编码
```

---

## API 端点

### 1. GET /api/registry

获取所有已注册的记忆空间及其记忆数量。

**认证**: 无

**请求**: 无参数

**响应** `200 OK`:
```json
[
  {
    "db_name": "luo9_memory",
    "display_name": "luo9",
    "icon": "💭",
    "count": 142
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `db_name` | string | 数据库标识 |
| `display_name` | string | 显示名称 |
| `icon` | string | emoji 图标，默认 `💭` |
| `count` | number | 未删除的记忆数量 |

**异常**:
- MongoDB 未配置时返回空数组 `[]`

---

### 2. POST /api/registry

插件注册/更新记忆空间。首次注册必须提供公钥和 MongoDB 连接串。

**认证**: 签名认证（已有记录时）或 URI 匹配（密钥恢复场景）

**请求体**:
```json
{
  "db_name": "luo9_memory",
  "display_name": "luo9",
  "icon": "💭",
  "mongodb_uri": "mongodb+srv://user:pass@cluster.mongodb.net/luo9_memory?retryWrites=true&w=majority",
  "public_key": "04a1b2c3d4e5f6..."
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `db_name` | 是 | 数据库标识，唯一 |
| `display_name` | 是 | 显示名称 |
| `icon` | 否 | emoji 图标，默认 `💭` |
| `mongodb_uri` | 是 | 该记忆空间的 MongoDB 连接串 |
| `public_key` | 是（首次） | ECDSA-P256 未压缩公钥 hex（130 字符） |

**响应** `200 OK`:
```json
{ "success": true }
```

**验证逻辑**:
1. 首次注册（无已有记录）→ 直接存入
2. 已有记录且有公钥 → 验证签名
3. 签名失败但 `mongodb_uri` 匹配 → 允许更新公钥（密钥恢复）
4. 签名失败且 `mongodb_uri` 不匹配 → 403 拒绝

**错误码**:
| 状态码 | 说明 |
|--------|------|
| 400 | 缺少 `db_name`、`display_name`、`mongodb_uri` 或 `public_key` |
| 403 | 签名无效且 URI 不匹配 |

---

### 3. GET /api/thoughts

分页查询记忆列表。

**认证**: 无

**查询参数**:

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `db` | 是 | - | 数据库名称 |
| `page` | 否 | `1` | 页码（从 1 开始） |
| `limit` | 否 | `50` | 每页数量（最大 200） |
| `category` | 否 | - | 分类过滤：`reflection`/`experience`/`plan`/`feeling` |
| `include_deleted` | 否 | `false` | 是否包含已删除记录 |
| `deleted_only` | 否 | `false` | 是否只返回已删除记录 |

**请求示例**:
```
GET /api/thoughts?db=luo9_memory&page=1&limit=20&category=reflection
```

**响应** `200 OK`:
```json
{
  "thoughts": [
    {
      "id": "68184c9b8b1234567890abcd",
      "content": "今天天气真好",
      "category": "feeling",
      "created": 1777721267,
      "deleted": false,
      "deleted_at": null
    }
  ],
  "total": 142,
  "page": 1,
  "pages": 8
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `thoughts[].id` | string | MongoDB ObjectId |
| `thoughts[].content` | string | 记忆内容 |
| `thoughts[].category` | string | 分类 |
| `thoughts[].created` | number | 创建时间（秒级 Unix 时间戳） |
| `thoughts[].deleted` | boolean | 是否已软删除 |
| `thoughts[].deleted_at` | number \| null | 软删除时间戳（毫秒） |
| `total` | number | 符合条件的总数 |
| `page` | number | 当前页码 |
| `pages` | number | 总页数 |

**排序**: 按 `created` 升序（从旧到新）

**错误码**:
| 状态码 | 说明 |
|--------|------|
| 400 | 缺少 `db` 参数 |
| 404 | 数据库未在注册表中找到 |

---

### 4. GET /api/thoughts/stats

获取记忆分类统计。

**认证**: 无

**查询参数**:

| 参数 | 必填 | 说明 |
|------|------|------|
| `db` | 是 | 数据库名称 |

**请求示例**:
```
GET /api/thoughts/stats?db=luo9_memory
```

**响应** `200 OK`:
```json
{
  "total": 142,
  "deleted": 3,
  "reflection": 45,
  "experience": 38,
  "plan": 28,
  "feeling": 31
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `total` | number | 未删除的记忆总数 |
| `deleted` | number | 已软删除的数量 |
| `reflection` | number | 「脑海涟漪」分类数量 |
| `experience` | number | 「日常片段」分类数量 |
| `plan` | number | 「小小念头」分类数量 |
| `feeling` | number | 「心情碎片」分类数量 |

---

### 5. POST /api/thoughts/bulk-sync

批量同步记忆（upsert）。由插件定期调用，将新记忆同步到页面。

**认证**: 签名认证

**请求头**:
```
x-db-name: luo9_memory
x-timestamp: 1777967273
x-signature: a1b2c3d4e5f6...（128 字符）
```

**请求体**:
```json
{
  "db_name": "luo9_memory",
  "thoughts": [
    {
      "content": "今天天气真好",
      "category": "feeling",
      "created": 1777721267
    },
    {
      "content": "明天要早起",
      "category": "plan",
      "created": 1777721300
    }
  ]
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `db_name` | 是 | 数据库名称 |
| `thoughts` | 是 | 记忆数组 |
| `thoughts[].content` | 是 | 记忆内容 |
| `thoughts[].category` | 是 | 分类：`reflection`/`experience`/`plan`/`feeling` |
| `thoughts[].created` | 是 | 创建时间（秒级 Unix 时间戳） |

**响应** `200 OK`:
```json
{
  "inserted": 2,
  "skipped": 0,
  "total": 2
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `inserted` | number | 成功插入/更新的数量 |
| `skipped` | number | 跳过的数量（字段缺失或重复） |
| `total` | number | 请求中的总数 |

**去重逻辑**: `{content, created}` 唯一索引，相同内容+时间戳的记录不会重复插入（`$setOnInsert`）。

**自动创建索引**:
- `{content: 1, created: 1}` unique
- `{deleted: 1, created: -1}`

---

### 6. DELETE /api/thoughts/:id

软删除单条记忆。

**认证**: 签名认证

**路径参数**:

| 参数 | 说明 |
|------|------|
| `id` | MongoDB ObjectId（24 字符 hex） |

**请求头**:
```
x-db-name: luo9_memory
x-timestamp: 1777967273
x-signature: a1b2c3d4e5f6...
```

**请求体**:
```json
{
  "db_name": "luo9_memory"
}
```

**响应** `200 OK`:
```json
{
  "success": true,
  "id": "68184c9b8b1234567890abcd"
}
```

**行为**: 设置 `deleted: true`，`deleted_at: Date.now()`（毫秒时间戳）

**错误码**:
| 状态码 | 说明 |
|--------|------|
| 400 | 缺少 `id` 或 `db_name`，或 id 格式无效 |
| 403 | 签名验证失败或无公钥 |
| 404 | 记录不存在或已删除 |

---

### 7. PATCH /api/thoughts/:id

恢复已软删除的记忆。

**认证**: 签名认证

**路径参数**:

| 参数 | 说明 |
|------|------|
| `id` | MongoDB ObjectId |

**请求头**:
```
x-db-name: luo9_memory
x-timestamp: 1777967273
x-signature: a1b2c3d4e5f6...
```

**请求体**:
```json
{
  "db_name": "luo9_memory",
  "action": "restore"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `db_name` | 是 | 数据库名称 |
| `action` | 是 | 必须为 `"restore"` |

**响应** `200 OK`:
```json
{
  "success": true,
  "id": "68184c9b8b1234567890abcd"
}
```

**行为**: 设置 `deleted: false`，`deleted_at: null`

**错误码**:
| 状态码 | 说明 |
|--------|------|
| 400 | 缺少参数或 action 不是 `"restore"` |
| 403 | 签名验证失败 |
| 404 | 记录不存在或未被删除 |

---

### 8. POST /api/thoughts/search

搜索记忆，支持批量软删除。

**认证**: 签名认证

**请求头**:
```
x-db-name: luo9_memory
x-timestamp: 1777967273
x-signature: a1b2c3d4e5f6...
```

**请求体（搜索模式）**:
```json
{
  "db_name": "luo9_memory",
  "keyword": "天气"
}
```

**请求体（批量删除模式）**:
```json
{
  "db_name": "luo9_memory",
  "keyword": "天气",
  "action": "delete"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `db_name` | 是 | 数据库名称 |
| `keyword` | 是 | 搜索关键词（正则匹配，大小写不敏感） |
| `action` | 否 | `"delete"` 则批量软删除匹配项 |

**搜索模式响应** `200 OK`:
```json
{
  "thoughts": [
    {
      "id": "68184c9b8b1234567890abcd",
      "content": "今天天气真好",
      "category": "feeling",
      "created": 1777721267
    }
  ],
  "count": 1
}
```

- 最多返回 50 条结果
- 按 `created` 升序排序
- 只搜索未删除的记录

**批量删除响应** `200 OK`:
```json
{
  "deleted": 3
}
```

---

### 9. POST /api/thoughts/purge

永久清理超过 30 天的软删除记录。

**认证**: 签名认证

**请求头**:
```
x-db-name: luo9_memory
x-timestamp: 1777967273
x-signature: a1b2c3d4e5f6...
```

**请求体**:
```json
{
  "db_name": "luo9_memory"
}
```

**响应** `200 OK`:
```json
{
  "purged": 5
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `purged` | number | 永久删除的记录数 |

**行为**: 删除 `deleted: true` 且 `deleted_at < (当前时间 - 30天)` 的记录。此操作不可逆。

---

## 错误响应格式

所有错误返回 HTTP 状态码 + JSON：

```json
{
  "statusCode": 400,
  "message": "Missing db_name"
}
```

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 403 | 签名验证失败 / 请求过期 / 无公钥 |
| 404 | 数据库或记录未找到 |
| 500 | 服务器内部错误 |

---

## 数据模型

### Thought（记忆）

```json
{
  "_id": "ObjectId",
  "content": "string — 记忆内容",
  "category": "reflection | experience | plan | feeling",
  "created": "number — 秒级 Unix 时间戳",
  "deleted": "boolean — 是否软删除",
  "deleted_at": "number | null — 软删除时间（毫秒）",
  "synced_at": "string — ISO 8601 同步时间"
}
```

### RegistryEntry（注册表）

```json
{
  "_id": "ObjectId",
  "db_name": "string — 数据库标识",
  "display_name": "string — 显示名称",
  "icon": "string — emoji 图标",
  "mongodb_uri": "string — bot 的 MongoDB 连接串",
  "public_key": "string — ECDSA-P256 公钥 hex",
  "registered_at": "string — ISO 8601 注册时间"
}
```

### 分类定义

| category | 中文 | 图标 |
|----------|------|------|
| `feeling` | 心情碎片 | 💗 |
| `reflection` | 脑海涟漪 | 🔮 |
| `experience` | 日常片段 | 🌿 |
| `plan` | 小小念头 | ☁️ |

---

## 典型对接流程

### 插件首次注册

```
1. 生成 ECDSA-P256 密钥对，持久化到 ecc_key.pem
2. POST /api/registry
   Body: { db_name, display_name, icon, mongodb_uri, public_key }
3. 保存注册结果
```

### 插件同步记忆

```
1. 读取本地记忆
2. 构造签名: message = "{db_name}:{timestamp}"
3. POST /api/thoughts/bulk-sync
   Headers: x-db-name, x-timestamp, x-signature
   Body: { db_name, thoughts: [{content, category, created}, ...] }
4. 处理响应: inserted / skipped / total
```

### 插件删除记忆

```
1. 构造签名
2. POST /api/thoughts/search
   Body: { db_name, keyword: "xxx", action: "delete" }
3. 或 DELETE /api/thoughts/:id
   Body: { db_name }
```

### 浏览器端（只读，无需认证）

```
1. GET /api/registry              → 获取记忆空间列表
2. GET /api/thoughts?db=xxx       → 分页加载记忆
3. GET /api/thoughts/stats?db=xxx → 获取统计数据
```
