import { getRegistryCollection } from '~/server/utils/mongodb'
import { verifyRequestSignature } from '~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { db_name, display_name, icon, mongodb_uri, public_key } = body

  if (!db_name || !display_name || !mongodb_uri) {
    throw createError({ statusCode: 400, message: 'Missing db_name, display_name, or mongodb_uri' })
  }

  // 首次注册需要公钥
  if (!public_key) {
    throw createError({ statusCode: 400, message: 'Missing public_key (required for first registration)' })
  }

  console.log(`[registry.post] 注册请求: db_name=${db_name}, display_name=${display_name}`)

  // 如果已有该 db_name 的记录且有公钥，验证签名（防止篡改）
  const regCol = await getRegistryCollection()
  const existing = await regCol.findOne({ db_name }).catch(() => null)
  if (existing?.public_key) {
    try {
      verifyRequestSignature(event, existing.public_key)
      console.log(`[registry.post] 签名验证通过: ${db_name}`)
    } catch {
      // 签名验证失败：可能是密钥轮换（pem 文件重新生成）
      // 回退验证：用 mongodb_uri 证明数据库所有权
      if (existing.mongodb_uri !== mongodb_uri) {
        throw createError({ statusCode: 403, message: 'Invalid signature and mongodb_uri mismatch' })
      }
      // mongodb_uri 匹配 → 允许更新公钥（密钥恢复）
      console.log(`[registry.post] 签名验证失败但 URI 匹配，允许密钥恢复: ${db_name}`)
    }
  }

  await regCol.updateOne(
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

  console.log(`[registry.post] 注册成功: ${db_name}`)
  return { success: true }
})
