import crypto from 'node:crypto'

/**
 * Standard RFC 6238 TOTP code generator for Supabase Auth MFA in E2E tests.
 * Decodes base32 secret and computes HMAC-SHA1 6-digit one-time password.
 */
export function generateTotp(secretBase32: string, timeStepSeconds = 30): string {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (let i = 0; i < secretBase32.length; i++) {
    const val = base32chars.indexOf(secretBase32.charAt(i).toUpperCase())
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2))
  }
  const key = Buffer.from(bytes)
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / timeStepSeconds)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return (codeInt % 1000000).toString().padStart(6, '0')
}
