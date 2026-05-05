import { getThoughtsCollection, getRegistryCollection } from '~/server/utils/mongodb'
import { verifyRequestSignature } from '~/server/utils/crypto'

export default defineEventHandler(async (event) => {
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

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const result = await col.deleteMany({
    deleted: true,
    deleted_at: { $lt: cutoff },
  })

  return { purged: result.deletedCount }
})
