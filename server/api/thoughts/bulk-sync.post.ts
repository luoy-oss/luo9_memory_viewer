import { getThoughtsCollection, getRegistryCollection } from '~/server/utils/mongodb'
import { verifyRequestSignature } from '~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  console.log('[bulk-sync] 收到请求')
  const body = await readBody(event)
  const { db_name, thoughts } = body
  console.log(`[bulk-sync] db_name: ${db_name}, thoughts: ${Array.isArray(thoughts) ? thoughts.length : 'N/A'}`)

  if (!db_name) {
    throw createError({ statusCode: 400, message: 'Missing db_name' })
  }

  // 从 registry 获取公钥验签
  console.log('[bulk-sync] 获取 registry...')
  const regCol = await getRegistryCollection()
  const entry = await regCol.findOne({ db_name })
  if (!entry?.public_key) {
    throw createError({ statusCode: 403, message: 'No public key registered for this db' })
  }
  console.log('[bulk-sync] 验证签名...')
  verifyRequestSignature(event, entry.public_key)
  console.log('[bulk-sync] 签名验证通过')

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

  console.log(`[bulk-sync] 完成: inserted=${inserted}, skipped=${skipped}, total=${thoughts.length}`)
  return { inserted, skipped, total: thoughts.length }
})
