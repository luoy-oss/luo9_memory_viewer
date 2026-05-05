import { getThoughtsCollection } from '~/server/utils/mongodb'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const dbName = query.db as string

  if (!dbName) {
    throw createError({ statusCode: 400, message: 'Missing db parameter' })
  }

  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(query.limit as string) || 50))
  const category = query.category as string | undefined
  const includeDeleted = query.include_deleted === 'true'
  const deletedOnly = query.deleted_only === 'true'

  console.log(`[thoughts.get] 查询: db=${dbName}, page=${page}, limit=${limit}, category=${category || 'all'}`)

  const col = await getThoughtsCollection(dbName)

  const filter: any = {}
  if (deletedOnly) {
    filter.deleted = true
  } else if (!includeDeleted) {
    filter.deleted = { $ne: true }
  }
  if (category && ['reflection', 'experience', 'plan', 'feeling'].includes(category)) {
    filter.category = category
  }

  const total = await col.countDocuments(filter)
  const thoughts = await col
    .find(filter)
    .sort({ created: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()

  console.log(`[thoughts.get] 返回 ${thoughts.length}/${total} 条`)

  return {
    thoughts: thoughts.map(t => ({
      id: t._id?.toString(),
      content: t.content,
      category: t.category,
      created: t.created,
      deleted: t.deleted,
      deleted_at: t.deleted_at,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  }
})
