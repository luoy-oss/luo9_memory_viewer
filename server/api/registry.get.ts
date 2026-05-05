import { getRegistryCollection, getThoughtsCollection } from '~/server/utils/mongodb'

export default defineEventHandler(async () => {
  let col
  try {
    col = await getRegistryCollection()
  } catch {
    // MongoDB 未连接（首次注册前），返回空列表
    console.log('[registry.get] MongoDB 未连接，返回空列表')
    return []
  }

  console.log('[registry.get] 查询注册表...')
  const entries = await col.find({}).toArray()
  console.log(`[registry.get] 找到 ${entries.length} 条记录`)

  const results = []
  for (const entry of entries) {
    try {
      const thoughtsCol = await getThoughtsCollection(entry.db_name)
      const count = await thoughtsCol.countDocuments({ deleted: { $ne: true } })
      results.push({
        db_name: entry.db_name,
        display_name: entry.display_name,
        icon: entry.icon || '💭',
        count,
      })
    } catch {
      // Skip entries with connection issues
      console.warn(`[registry.get] 跳过 ${entry.db_name}: 连接问题`)
    }
  }

  console.log(`[registry.get] 返回 ${results.length} 条结果`)
  return results
})
