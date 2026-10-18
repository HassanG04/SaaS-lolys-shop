/**
 * Bilingual Profanity and Curse Word Detector & Masker
 * Normalizes Arabic diacritics, character variants, and repeated characters
 * to detect vulgarities and protect the community.
 */

// Normalized English profanity roots
const ENGLISH_PROFANITIES = [
  'fuck',
  'fucking',
  'fucker',
  'shit',
  'shitty',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'cunt',
  'pussy',
  'whore',
  'slut',
  'faggot',
  'nigger',
  'cock',
  'motherfucker',
]

// Arabic vulgar roots (normalized without diacritics, normalized alef, taa marbuta)
const ARABIC_PROFANITIES = [
  'شرموط',
  'شرموطه',
  'منيوك',
  'كس',
  'طيز',
  'خول',
  'عرص',
  'زب',
  'قحب',
  'قحبه',
  'نيك',
  'عاهر',
  'عاهره',
  'ديوث',
  'سافل',
  'حقير',
  'ابن الكلب',
  'يلعن',
  'لعنة',
]

/**
 * Normalizes Arabic text for robust pattern matching
 */
export function normalizeArabicText(text: string): string {
  if (!text) return ''
  let res = text.toLowerCase()

  // Remove Arabic diacritics / tashkeel (fatha, damma, kasra, sukun, shadda, tanween)
  res = res.replace(/[\u064B-\u065F\u0670]/g, '')

  // Normalize Alef variants (إ, أ, آ -> ا)
  res = res.replace(/[إأآا]/g, 'ا')

  // Normalize Yaa variants (ى -> ي)
  res = res.replace(/[ىي]/g, 'ي')

  // Normalize Taa Marbuta (ة -> ه)
  res = res.replace(/[ةه]/g, 'ه')

  // Remove non-word characters except Arabic and Latin
  res = res.replace(/[^\w\s\u0600-\u06FF]/g, ' ')

  // Collapse 2+ duplicate adjacent characters (e.g., كككككس -> كس, fuuuuck -> fuck)
  res = res.replace(/(.)\1+/g, '$1')

  // Collapse whitespace
  return res.replace(/\s+/g, ' ').trim()
}

/**
 * Checks if a string contains any English or Arabic curse words
 */
export function containsProfanity(text: string): boolean {
  if (!text || !text.trim()) return false

  const normalized = normalizeArabicText(text)
  const lowerRaw = text.toLowerCase()

  // English word boundary checks
  for (const word of ENGLISH_PROFANITIES) {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    if (regex.test(lowerRaw) || regex.test(normalized)) {
      return true
    }
  }

  // Arabic keyword checks on normalized string
  for (const word of ARABIC_PROFANITIES) {
    const normWord = normalizeArabicText(word)
    if (normalized.includes(normWord)) {
      return true
    }
  }

  return false
}

/**
 * Replaces any detected curse words with '***' to clean the text
 */
export function cleanProfanity(text: string): string {
  if (!text) return ''
  let cleaned = text

  for (const word of ENGLISH_PROFANITIES) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    cleaned = cleaned.replace(regex, '***')
  }

  for (const word of ARABIC_PROFANITIES) {
    const regex = new RegExp(word, 'gi')
    cleaned = cleaned.replace(regex, '***')
  }

  return cleaned
}

/**
 * Returns a list of detected profanity words in the text for user feedback
 */
export function findProfanities(text: string): string[] {
  if (!text || !text.trim()) return []

  const detected: string[] = []
  const normalized = normalizeArabicText(text)
  const lowerRaw = text.toLowerCase()

  for (const word of ENGLISH_PROFANITIES) {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    if (regex.test(lowerRaw) || regex.test(normalized)) {
      detected.push(word)
    }
  }

  for (const word of ARABIC_PROFANITIES) {
    const normWord = normalizeArabicText(word)
    if (normalized.includes(normWord) && !detected.includes(word)) {
      detected.push(word)
    }
  }

  return detected
}
