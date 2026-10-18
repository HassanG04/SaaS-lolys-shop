const COMMON_BLOCKLIST = new Set([
  '12345678910',
  '1234567890',
  '0123456789',
  'password123',
  'password1234',
  'admin12345',
  'welcome1234',
  'lolys12345',
  'qwertyuiop',
  'asdfghjkl1',
])

function isSequentialNumeric(str: string): boolean {
  let asc = 0
  let desc = 0
  for (let i = 1; i < str.length; i++) {
    const prev = str.charCodeAt(i - 1)
    const curr = str.charCodeAt(i)
    if (curr >= 48 && curr <= 57 && prev >= 48 && prev <= 57) {
      if (curr === prev + 1) asc++
      else asc = 0
      if (curr === prev - 1) desc++
      else desc = 0
      if (asc >= 4 || desc >= 4) return true
    } else {
      asc = 0
      desc = 0
    }
  }
  return false
}

function isRepeatedChar(str: string): boolean {
  return /^(.)\1{4,}$/.test(str)
}

function isKeyboardWalk(str: string): boolean {
  const walks = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
  const lower = str.toLowerCase()
  for (const walk of walks) {
    for (let i = 0; i <= walk.length - 5; i++) {
      const slice = walk.slice(i, i + 5)
      if (lower.includes(slice)) return true
    }
  }
  return false
}

export function validatePasswordStrength(password: string): { valid: boolean; code?: string } {
  if (password.length < 10) {
    return { valid: false, code: 'AUTH-008' }
  }
  const lower = password.toLowerCase().trim()
  if (
    COMMON_BLOCKLIST.has(lower) ||
    isRepeatedChar(password) ||
    isSequentialNumeric(password) ||
    isKeyboardWalk(password)
  ) {
    return { valid: false, code: 'AUTH-008' }
  }
  return { valid: true }
}

export function generateSecurePassword(length = 20): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*-_+='
  const max = 256 - (256 % chars.length)
  const result: string[] = []
  const buf = new Uint8Array(length * 2)
  while (result.length < length) {
    crypto.getRandomValues(buf)
    for (let i = 0; i < buf.length && result.length < length; i++) {
      const byte = buf[i]
      if (byte !== undefined && byte < max) {
        result.push(chars[byte % chars.length] ?? '')
      }
    }
  }
  return result.join('')
}
