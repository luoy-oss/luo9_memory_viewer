import { ObjectId } from 'mongodb'
import { getThoughtsCollection, getRegistryCollection } from '~/server/utils/mongodb'
import { verifyRequestSignature } from '~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing id' })
  }

  const body = await readBody(event).catch(() => ({}))
  const { db_name } = body

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

  try {
    const result = await col.updateOne(
      { _id: new ObjectId(id), deleted: { $ne: true } },
      {
        $set: {
          deleted: true,
          deleted_at: Date.now(),
        },
      },
    )

    if (result.matchedCount === 0) {
      throw createError({ statusCode: 404, message: 'Thought not found or already deleted' })
    }

    return { success: true, id }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 400, message: 'Invalid id format' })
  }
})
