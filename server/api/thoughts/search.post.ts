import { getThoughtsCollection, getRegistryCollection } from '~/server/utils/mongodb'
import { verifyRequestSignature } from '~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { keyword, action, db_name } = body

  if (!keyword || typeof keyword !== 'string') {
    throw createError({ statusCode: 400, message: 'Missing keyword' })
  }

  if (!db_name) {
    throw createError({ statusCode: 400, message: 'Missing db_name' })
  }

  // 从 registry 获取公钥验签
  const regCol = await getRegistryCollection()
  const entry = await regCol.findOne({ db_name })
  if (!entry?.public_key) {
    throw createError({ statusCode: 403, message: 'No public key registered for this db' })
  }
  verifyRequestSignature(event, entry.public_key)

  const col = await getThoughtsCollection(db_name)

  const filter = {
    content: { $regex: keyword, $options: 'i' },
    deleted: { $ne: true },
  }

  if (action === 'delete') {
    const result = await col.updateMany(filter, {
      $set: {
        deleted: true,
        deleted_at: Date.now(),
      },
    })
    return { deleted: result.modifiedCount }
  }

  const results = await col.find(filter).sort({ created: 1 }).limit(50).toArray()
  return {
    thoughts: results.map(t => ({
      id: t._id?.toString(),
      content: t.content,
      category: t.category,
      created: t.created,
    })),
    count: results.length,
  }
})
