import { getRegistryCollection, getThoughtsCollection } from '~/server/utils/mongodb'

export default defineEventHandler(async () => {
  let col
  try {
    col = await getRegistryCollection()
  } catch {
    // MongoDB 未连接（首次注册前），返回空列表
    return []
  }

  const entries = await col.find({}).toArray()

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
    }
  }

  return results
})
