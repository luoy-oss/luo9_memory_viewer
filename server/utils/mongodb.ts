import { MongoClient, type Db, type Collection } from 'mongodb'

// Page's own MongoDB client (from NUXT_MONGODB_URI env var)
let pageClient: MongoClient | null = null
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

/** 获取页面自己的 MongoDB 连接（NUXT_MONGODB_URI） */
async function getPageClient(): Promise<MongoClient> {
  if (pageClient) return pageClient
  const uri = useRuntimeConfig().mongodbUri as string
  if (!uri) {
    throw new Error('NUXT_MONGODB_URI is not configured. Set it in Vercel environment variables or .env file.')
  }
  const client = new MongoClient(uri)
  await client.connect()
  pageClient = client
  return client
}

/** 获取或创建 MongoClient（按 URI 缓存，用于连接 bot 数据库） */
async function getClientForUri(uri: string): Promise<MongoClient> {
  if (clientCache.has(uri)) return clientCache.get(uri)!

  const client = new MongoClient(uri)
  await client.connect()
  clientCache.set(uri, client)
  return client
}

/** 获取 registry 集合（存在页面自己的 MongoDB 里） */
export async function getRegistryCollection(): Promise<Collection<RegistryEntry>> {
  const client = await getPageClient()
  return client.db('memory_viewer_shared').collection<RegistryEntry>('registry')
}

/** 根据 db_name 从 registry 查找 URI，连接对应 bot 数据库 */
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
