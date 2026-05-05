import { getRegistryCollection, getThoughtsCollection } from '~/server/utils/mongodb'

export default defineEventHandler(async () => {
  const col = await getRegistryCollection()
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
