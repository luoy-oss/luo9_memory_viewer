import { p256 } from '@noble/curves/nist.js'
import { hexToBytes } from '@noble/curves/utils.js'

/**
 * 验证 ECDSA-P256 签名
 * @param publicKeyHex 公钥 (未压缩格式 hex: 04 + x + y, 130 字符)
 * @param message 签名内容 "{db_name}:{timestamp}"
 * @param signatureHex 签名 (compact r||s 格式 hex, 128 字符)
 * @returns 是否有效
 */
export function verifySignature(publicKeyHex: string, message: string, signatureHex: string): boolean {
  try {
    const pubBytes = hexToBytes(publicKeyHex)
    const sigBytes = hexToBytes(signatureHex)
    const msgBytes = new TextEncoder().encode(message)
    return p256.verify(sigBytes, msgBytes, pubBytes)
  } catch {
    return false
  }
}

/**
 * 验证请求签名 (从 headers 提取)
 * @returns db_name 如果验证通过
 * @throws 403 如果验证失败
 */
export function verifyRequestSignature(event: any, publicKeyHex: string): string {
  const dbName = getHeader(event, 'x-db-name') || ''
  const timestamp = getHeader(event, 'x-timestamp') || ''
  const signature = getHeader(event, 'x-signature') || ''

  if (!dbName || !timestamp || !signature) {
    throw createError({ statusCode: 400, message: 'Missing x-db-name, x-timestamp, or x-signature headers' })
  }

  // 防重放: 时间戳超过 5 分钟拒绝
  const ts = parseInt(timestamp) * 1000 // 秒转毫秒
  const now = Date.now()
  if (isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
    throw createError({ statusCode: 403, message: 'Request expired' })
  }

  const message = `${dbName}:${timestamp}`
  if (!verifySignature(publicKeyHex, message, signature)) {
    throw createError({ statusCode: 403, message: 'Invalid signature' })
  }

  return dbName
}
