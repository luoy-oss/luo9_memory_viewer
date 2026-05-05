import { getThoughtsCollection, getRegistryCollection } from '~/server/utils/mongodb'
import { verifyRequestSignature } from '~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { db_name, thoughts } = body

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

  if (!Array.isArray(thoughts)) {
    throw createError({ statusCode: 400, message: 'thoughts must be an array' })
  }

  const col = await getThoughtsCollection(db_name)

  await col.createIndex({ content: 1, created: 1 }, { unique: true })
  await col.createIndex({ deleted: 1, created: -1 })

  let inserted = 0
  let skipped = 0

  for (const item of thoughts) {
    if (!item.content || !item.category || !item.created) {
      skipped++
      continue
    }

    try {
      await col.updateOne(
        { content: item.content, created: item.created },
        {
          $setOnInsert: {
            content: item.content,
            category: item.category,
            created: item.created,
            deleted: false,
            deleted_at: null,
            synced_at: new Date().toISOString(),
          },
        },
        { upsert: true },
      )
      inserted++
    } catch {
      skipped++
    }
  }

  return { inserted, skipped, total: thoughts.length }
})
