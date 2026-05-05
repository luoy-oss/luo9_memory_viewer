import { getThoughtsCollection } from '~/server/utils/mongodb'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const dbName = query.db as string

  if (!dbName) {
    throw createError({ statusCode: 400, message: 'Missing db parameter' })
  }

  console.log(`[stats.get] 查询统计: db=${dbName}`)

  const col = await getThoughtsCollection(dbName)

  const [active, deleted, byCategory] = await Promise.all([
    col.countDocuments({ deleted: { $ne: true } }),
    col.countDocuments({ deleted: true }),
    col.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]).toArray(),
  ])

  const categories: Record<string, number> = {
    reflection: 0,
    experience: 0,
    plan: 0,
    feeling: 0,
  }
  for (const item of byCategory) {
    categories[item._id] = item.count
  }

  console.log(`[stats.get] 结果: active=${active}, deleted=${deleted}`)

  return {
    total: active,
    deleted,
    ...categories,
  }
})
