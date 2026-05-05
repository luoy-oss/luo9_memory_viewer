import { MongoClient, type Db, type Collection } from 'mongodb'

// Bootstrap client for registry lookups
let bootstrapClient: MongoClient | null = null
let bootstrapUri: string | null = null
const clientCache = new Map<string, MongoClient>()
const dbCache = new Map<string, Db>()

export interface Thought {
  _id?: string
  content: string
  category: 'reflection' | 'experience' | 'plan' | 'feeling'
  created: number
  deleted: boolean
  deleted_at: number | null
  synced_at: string
}

export interface RegistryEntry {
  _id?: string
  db_name: string
  display_name: string
  icon?: string
  count?: number
  mongodb_uri: string
  public_key: string
  registered_at: string
}

/** 获取或创建 MongoClient（按 URI 缓存） */
async function getClientForUri(uri: string): Promise<MongoClient> {
  if (clientCache.has(uri)) return clientCache.get(uri)!

  const client = new MongoClient(uri)
  await client.connect()
  clientCache.set(uri, client)
  return client
}

/**
 * 获取 bootstrap 客户端
 * 优先使用 MONGODB_URI 环境变量
 * 如果未设置，使用首次注册时传入的 URI
 */
export async function getBootstrapClient(): Promise<MongoClient> {
  if (bootstrapClient) return bootstrapClient

  // 尝试从环境变量获取
  const config = useRuntimeConfig()
  const envUri = config.mongodbUri
  if (envUri) {
    bootstrapClient = new MongoClient(envUri)
    await bootstrapClient.connect()
    bootstrapUri = envUri
    return bootstrapClient
  }

  // 尝试从已有注册记录获取（启动时可能已有数据）
  // 这里不能递归，所以直接抛出错误提示
  throw new Error('MONGODB_URI not set and no bootstrap URI available. First registration will bootstrap.')
}

/**
 * 用指定 URI 初始化 bootstrap 连接（首次注册时调用）
 */
export async function bootstrapWithUri(uri: string): Promise<void> {
  if (bootstrapClient) return
  bootstrapClient = new MongoClient(uri)
  await bootstrapClient.connect()
  bootstrapUri = uri
}

/** 获取 registry 集合 */
export async function getRegistryCollection(): Promise<Collection<RegistryEntry>> {
  const client = await getBootstrapClient()
  return client.db('memory_viewer_shared').collection<RegistryEntry>('registry')
}

/** 根据 db_name 从 registry 查找 URI，连接对应数据库 */
export async function getThoughtsCollection(dbName: string): Promise<Collection<Thought>> {
  const cacheKey = `thoughts_${dbName}`
  if (dbCache.has(cacheKey)) {
    return dbCache.get(cacheKey)!.collection<Thought>('thoughts')
  }

  const regCol = await getRegistryCollection()
  const entry = await regCol.findOne({ db_name: dbName })
  if (!entry?.mongodb_uri) {
    throw createError({ statusCode: 404, message: `Database "${dbName}" not found in registry` })
  }

  const client = await getClientForUri(entry.mongodb_uri)
  const db = client.db(dbName)
  dbCache.set(cacheKey, db)
  return db.collection<Thought>('thoughts')
}
