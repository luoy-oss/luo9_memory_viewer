import { getRegistryCollection, bootstrapWithUri } from '~/server/utils/mongodb'
import { verifyRequestSignature } from '~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { db_name, display_name, icon, mongodb_uri, public_key } = body

  if (!db_name || !display_name || !mongodb_uri) {
    throw createError({ statusCode: 400, message: 'Missing db_name, display_name, or mongodb_uri' })
  }

  // 如果已有该 db_name 的记录且有公钥，验证签名（防止篡改）
  const regCol = await getRegistryCollection().catch(() => null)
  if (regCol) {
    const existing = await regCol.findOne({ db_name }).catch(() => null)
    if (existing?.public_key) {
      verifyRequestSignature(event, existing.public_key)
    }
  }

  // 首次注册需要公钥
  if (!public_key) {
    throw createError({ statusCode: 400, message: 'Missing public_key (required for first registration)' })
  }

  // Bootstrap if MONGODB_URI env var was not set
  try {
    await bootstrapWithUri(mongodb_uri)
  } catch {
    // Already bootstrapped, ignore
  }

  const col = await getRegistryCollection()
  await col.updateOne(
    { db_name },
    {
      $set: {
        db_name,
        display_name,
        icon: icon || '💭',
        mongodb_uri,
        public_key,
        registered_at: new Date().toISOString(),
      },
    },
    { upsert: true },
  )

  return { success: true }
})
