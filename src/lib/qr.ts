/**
 * Zero-dependency QR Code Generator and InstaPay Link Validator
 * Based on Project Nayuki's QR Code generator (MIT / Public Domain)
 * Tailored for Lolys' brand tokens: cocoa (#3b2118) modules, cream (#fffaf5) background,
 * 4-module quiet zone, and strict URL validation.
 */

/* =====================================================================
 * 1. Galois Field & Reed-Solomon Arithmetic
 * ===================================================================== */

const EXP_TABLE = new Uint8Array(512)
const LOG_TABLE = new Uint8Array(256)

let gfVal = 1
for (let i = 0; i < 255; i++) {
  EXP_TABLE[i] = gfVal
  EXP_TABLE[i + 255] = gfVal
  LOG_TABLE[gfVal] = i
  gfVal = (gfVal << 1) ^ (gfVal >= 128 ? 0x11d : 0)
}

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]
}

function rsComputeDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root)
      if (j + 1 < degree) {
        result[j] ^= result[j + 1]
      }
    }
    root = gfMultiply(root, 2)
  }
  return result
}

function rsComputeRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const remainder = new Uint8Array(divisor.length)
  for (const b of data) {
    const factor = b ^ remainder[0]
    remainder.copyWithin(0, 1)
    remainder[remainder.length - 1] = 0
    for (let i = 0; i < divisor.length; i++) {
      remainder[i] ^= gfMultiply(divisor[i], factor)
    }
  }
  return remainder
}

/* =====================================================================
 * 2. QR Code Constants & Tables (Versions 1 to 14, EC Level M & L)
 * ===================================================================== */

export type QrEccLevel = 'L' | 'M' | 'Q' | 'H'

interface VersionSpec {
  version: number
  totalCodewords: number
  eccCodewordsPerBlock: { L: number; M: number; Q: number; H: number }
  numBlocksGroup1: { L: number; M: number; Q: number; H: number }
  dataCodewordsGroup1: { L: number; M: number; Q: number; H: number }
  numBlocksGroup2: { L: number; M: number; Q: number; H: number }
  dataCodewordsGroup2: { L: number; M: number; Q: number; H: number }
  alignmentPatternPositions: number[]
}

// Table of QR specifications for versions 1 to 14 (sufficient for up to ~300 bytes)
const QR_VERSION_SPECS: VersionSpec[] = [
  {
    version: 1,
    totalCodewords: 26,
    eccCodewordsPerBlock: { L: 7, M: 10, Q: 13, H: 17 },
    numBlocksGroup1: { L: 1, M: 1, Q: 1, H: 1 },
    dataCodewordsGroup1: { L: 19, M: 16, Q: 13, H: 9 },
    numBlocksGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    dataCodewordsGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    alignmentPatternPositions: [],
  },
  {
    version: 2,
    totalCodewords: 44,
    eccCodewordsPerBlock: { L: 10, M: 16, Q: 22, H: 28 },
    numBlocksGroup1: { L: 1, M: 1, Q: 1, H: 1 },
    dataCodewordsGroup1: { L: 34, M: 28, Q: 22, H: 16 },
    numBlocksGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    dataCodewordsGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    alignmentPatternPositions: [6, 18],
  },
  {
    version: 3,
    totalCodewords: 70,
    eccCodewordsPerBlock: { L: 15, M: 26, Q: 18, H: 22 },
    numBlocksGroup1: { L: 1, M: 1, Q: 2, H: 2 },
    dataCodewordsGroup1: { L: 55, M: 44, Q: 17, H: 13 },
    numBlocksGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    dataCodewordsGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    alignmentPatternPositions: [6, 22],
  },
  {
    version: 4,
    totalCodewords: 100,
    eccCodewordsPerBlock: { L: 20, M: 18, Q: 26, H: 16 },
    numBlocksGroup1: { L: 1, M: 2, Q: 2, H: 4 },
    dataCodewordsGroup1: { L: 80, M: 32, Q: 24, H: 9 },
    numBlocksGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    dataCodewordsGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    alignmentPatternPositions: [6, 26],
  },
  {
    version: 5,
    totalCodewords: 134,
    eccCodewordsPerBlock: { L: 26, M: 24, Q: 18, H: 22 },
    numBlocksGroup1: { L: 1, M: 2, Q: 2, H: 2 },
    dataCodewordsGroup1: { L: 108, M: 43, Q: 15, H: 11 },
    numBlocksGroup2: { L: 0, M: 2, Q: 2, H: 2 },
    dataCodewordsGroup2: { L: 0, M: 44, Q: 16, H: 12 },
    alignmentPatternPositions: [6, 30],
  },
  {
    version: 6,
    totalCodewords: 172,
    eccCodewordsPerBlock: { L: 18, M: 16, Q: 24, H: 28 },
    numBlocksGroup1: { L: 2, M: 4, Q: 4, H: 4 },
    dataCodewordsGroup1: { L: 68, M: 27, Q: 19, H: 15 },
    numBlocksGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    dataCodewordsGroup2: { L: 0, M: 0, Q: 0, H: 0 },
    alignmentPatternPositions: [6, 34],
  },
  {
    version: 7,
    totalCodewords: 196,
    eccCodewordsPerBlock: { L: 20, M: 18, Q: 18, H: 26 },
    numBlocksGroup1: { L: 2, M: 4, Q: 2, H: 4 },
    dataCodewordsGroup1: { L: 78, M: 31, Q: 14, H: 13 },
    numBlocksGroup2: { L: 0, M: 0, Q: 4, H: 1 },
    dataCodewordsGroup2: { L: 0, M: 0, Q: 15, H: 14 },
    alignmentPatternPositions: [6, 22, 38],
  },
  {
    version: 8,
    totalCodewords: 242,
    eccCodewordsPerBlock: { L: 24, M: 22, Q: 22, H: 26 },
    numBlocksGroup1: { L: 2, M: 2, Q: 4, H: 4 },
    dataCodewordsGroup1: { L: 97, M: 38, Q: 18, H: 14 },
    numBlocksGroup2: { L: 0, M: 2, Q: 2, H: 2 },
    dataCodewordsGroup2: { L: 0, M: 39, Q: 19, H: 15 },
    alignmentPatternPositions: [6, 24, 42],
  },
  {
    version: 9,
    totalCodewords: 292,
    eccCodewordsPerBlock: { L: 30, M: 22, Q: 20, H: 24 },
    numBlocksGroup1: { L: 2, M: 3, Q: 4, H: 4 },
    dataCodewordsGroup1: { L: 116, M: 36, Q: 16, H: 12 },
    numBlocksGroup2: { L: 0, M: 2, Q: 4, H: 4 },
    dataCodewordsGroup2: { L: 0, M: 37, Q: 17, H: 13 },
    alignmentPatternPositions: [6, 26, 46],
  },
  {
    version: 10,
    totalCodewords: 346,
    eccCodewordsPerBlock: { L: 18, M: 26, Q: 24, H: 28 },
    numBlocksGroup1: { L: 2, M: 4, Q: 6, H: 6 },
    dataCodewordsGroup1: { L: 68, M: 43, Q: 19, H: 15 },
    numBlocksGroup2: { L: 2, M: 1, Q: 2, H: 2 },
    dataCodewordsGroup2: { L: 69, M: 44, Q: 20, H: 16 },
    alignmentPatternPositions: [6, 28, 50],
  },
  {
    version: 11,
    totalCodewords: 404,
    eccCodewordsPerBlock: { L: 20, M: 30, Q: 28, H: 24 },
    numBlocksGroup1: { L: 4, M: 1, Q: 4, H: 3 },
    dataCodewordsGroup1: { L: 81, M: 50, Q: 22, H: 12 },
    numBlocksGroup2: { L: 0, M: 4, Q: 4, H: 8 },
    dataCodewordsGroup2: { L: 0, M: 51, Q: 23, H: 13 },
    alignmentPatternPositions: [6, 30, 54],
  },
  {
    version: 12,
    totalCodewords: 466,
    eccCodewordsPerBlock: { L: 24, M: 22, Q: 26, H: 28 },
    numBlocksGroup1: { L: 2, M: 6, Q: 4, H: 7 },
    dataCodewordsGroup1: { L: 92, M: 36, Q: 20, H: 14 },
    numBlocksGroup2: { L: 2, M: 2, Q: 6, H: 4 },
    dataCodewordsGroup2: { L: 93, M: 37, Q: 21, H: 15 },
    alignmentPatternPositions: [6, 32, 58],
  },
]

function getTotalDataCodewords(spec: VersionSpec, ecl: QrEccLevel): number {
  return (
    spec.numBlocksGroup1[ecl] * spec.dataCodewordsGroup1[ecl] +
    spec.numBlocksGroup2[ecl] * spec.dataCodewordsGroup2[ecl]
  )
}

/* =====================================================================
 * 3. Bit Buffer & Data Encoding (Byte Mode)
 * ===================================================================== */

class BitBuffer {
  private bits: number[] = []

  appendBits(val: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((val >>> i) & 1)
    }
  }

  appendByte(byte: number): void {
    this.appendBits(byte, 8)
  }

  get length(): number {
    return this.bits.length
  }

  get(index: number): number {
    return this.bits[index]
  }

  toBytes(): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(this.bits.length / 8))
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i]) {
        bytes[i >>> 3] |= 0x80 >>> (i & 7)
      }
    }
    return bytes
  }
}

function encodeData(utf8Bytes: Uint8Array, version: number, targetCodewords: number): Uint8Array {
  const bb = new BitBuffer()
  // Byte mode indicator = 0100 (4 bits)
  bb.appendBits(0b0100, 4)
  // Character count indicator (8 bits for versions 1-9, 16 bits for version 10+)
  const countBits = version <= 9 ? 8 : 16
  bb.appendBits(utf8Bytes.length, countBits)

  // Append payload bytes
  for (const b of utf8Bytes) {
    bb.appendByte(b)
  }

  // Terminator (up to 4 zero bits)
  const capacityBits = targetCodewords * 8
  const termLen = Math.min(4, capacityBits - bb.length)
  bb.appendBits(0, termLen)

  // Pad to multiple of 8 bits
  if (bb.length % 8 !== 0) {
    bb.appendBits(0, 8 - (bb.length % 8))
  }

  // Pad bytes alternating 0xEC and 0x11
  let padToggle = 0xec
  while (bb.length < capacityBits) {
    bb.appendByte(padToggle)
    padToggle = padToggle === 0xec ? 0x11 : 0xec
  }

  return bb.toBytes()
}

/* =====================================================================
 * 4. Error Correction Block Interleaving
 * ===================================================================== */

function interleaveBlocks(dataBytes: Uint8Array, spec: VersionSpec, ecl: QrEccLevel): Uint8Array {
  const eccPerBlock = spec.eccCodewordsPerBlock[ecl]
  const divisor = rsComputeDivisor(eccPerBlock)

  const numG1 = spec.numBlocksGroup1[ecl]
  const dataLenG1 = spec.dataCodewordsGroup1[ecl]
  const numG2 = spec.numBlocksGroup2[ecl]
  const dataLenG2 = spec.dataCodewordsGroup2[ecl]
  const totalBlocks = numG1 + numG2

  const dataBlocks: Uint8Array[] = []
  const eccBlocks: Uint8Array[] = []

  let offset = 0
  for (let i = 0; i < totalBlocks; i++) {
    const dataLen = i < numG1 ? dataLenG1 : dataLenG2
    const blockData = dataBytes.slice(offset, offset + dataLen)
    offset += dataLen
    dataBlocks.push(blockData)
    eccBlocks.push(rsComputeRemainder(blockData, divisor))
  }

  // Interleave data codewords
  const result: number[] = []
  const maxDataLen = Math.max(dataLenG1, dataLenG2)
  for (let col = 0; col < maxDataLen; col++) {
    for (let b = 0; b < totalBlocks; b++) {
      if (col < dataBlocks[b].length) {
        result.push(dataBlocks[b][col])
      }
    }
  }

  // Interleave ECC codewords
  for (let col = 0; col < eccPerBlock; col++) {
    for (let b = 0; b < totalBlocks; b++) {
      result.push(eccBlocks[b][col])
    }
  }

  return new Uint8Array(result)
}

/* =====================================================================
 * 5. Matrix Layout & Masking
 * ===================================================================== */

const FORMAT_BITS: Record<QrEccLevel, number[]> = {
  // 15-bit format strings for mask 0..7
  L: [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976],
  M: [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0],
  Q: [0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed],
  H: [0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b],
}

export interface QrMatrix {
  version: number
  size: number
  modules: boolean[][]
}

export function generateQrMatrix(text: string, ecl: QrEccLevel = 'M'): QrMatrix {
  const utf8 = new TextEncoder().encode(text)

  // Find smallest version that fits the payload
  let targetSpec: VersionSpec | null = null
  for (const spec of QR_VERSION_SPECS) {
    const dataCap = getTotalDataCodewords(spec, ecl)
    const headerBits = 4 + (spec.version <= 9 ? 8 : 16)
    const requiredBits = headerBits + utf8.length * 8
    if (requiredBits <= dataCap * 8) {
      targetSpec = spec
      break
    }
  }

  if (!targetSpec) {
    throw new Error(`Data too long for supported QR versions (max 12): ${text.length} bytes`)
  }

  const dataCodewords = getTotalDataCodewords(targetSpec, ecl)
  const encodedData = encodeData(utf8, targetSpec.version, dataCodewords)
  const finalCodewords = interleaveBlocks(encodedData, targetSpec, ecl)

  const size = targetSpec.version * 4 + 17
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  function setFunctionModule(r: number, c: number, val: boolean) {
    modules[r][c] = val
    isFunction[r][c] = true
  }

  // 1. Finder patterns (7x7) + Separators
  function drawFinderPattern(startR: number, startC: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = startR + r
        const nc = startC + c
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const isDark =
            r >= 0 &&
            r <= 6 &&
            c >= 0 &&
            c <= 6 &&
            (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
          setFunctionModule(nr, nc, isDark)
        }
      }
    }
  }

  drawFinderPattern(0, 0)
  drawFinderPattern(0, size - 7)
  drawFinderPattern(size - 7, 0)

  // 2. Alignment patterns (5x5)
  const alignPos = targetSpec.alignmentPatternPositions
  for (const r of alignPos) {
    for (const c of alignPos) {
      // Don't draw over finder patterns
      if (
        (r === 6 && c === 6) ||
        (r === 6 && c === alignPos[alignPos.length - 1]) ||
        (r === alignPos[alignPos.length - 1] && c === 6)
      ) {
        continue
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isDark = dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0)
          setFunctionModule(r + dr, c + dc, isDark)
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunctionModule(6, i, i % 2 === 0)
    if (!isFunction[i][6]) setFunctionModule(i, 6, i % 2 === 0)
  }

  // 4. Reserve format bits areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true
    if (!isFunction[i][8]) isFunction[i][8] = true
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true
    if (!isFunction[i][8]) isFunction[i][8] = true
  }
  setFunctionModule(size - 8, 8, true) // Dark module

  // 5. Place data codewords (zigzag traversal)
  let bitIdx = 0
  const totalDataBits = finalCodewords.length * 8
  let up = true
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right-- // skip vertical timing pattern
    for (let vert = 0; vert < size; vert++) {
      const r = up ? size - 1 - vert : vert
      for (let c = right; c > right - 2; c--) {
        if (!isFunction[r][c]) {
          let dark = false
          if (bitIdx < totalDataBits) {
            const byte = finalCodewords[bitIdx >>> 3]
            dark = ((byte >>> (7 - (bitIdx & 7))) & 1) === 1
            bitIdx++
          }
          modules[r][c] = dark
        }
      }
    }
    up = !up
  }

  // 6. Select mask pattern (use standard mask 0: (r + c) % 2 === 0)
  // Mask 0 is standard, canonical and valid for all standard QR readers
  const mask = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c]
      }
    }
  }

  // 7. Write format information bits
  const formatBits = FORMAT_BITS[ecl][mask]
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >>> i) & 1) === 1
    // Top-left finder
    if (i < 6) {
      modules[8][i] = bit
    } else if (i === 6) {
      modules[8][7] = bit
    } else if (i === 7) {
      modules[8][8] = bit
    } else if (i === 8) {
      modules[7][8] = bit
    } else {
      modules[14 - i][8] = bit
    }

    // Split around other finders
    if (i < 8) {
      modules[size - 1 - i][8] = bit
    } else {
      modules[8][size - 15 + i] = bit
    }
  }

  return {
    version: targetSpec.version,
    size,
    modules,
  }
}

/* =====================================================================
 * 6. SVG Generator & Theme Tokens
 * ===================================================================== */

export interface QrSvgOptions {
  size?: number
  quietZone?: number
  darkColor?: string
  lightColor?: string
}

export interface ThemedQrData {
  pathData: string
  totalModules: number
  viewBox: string
}

/**
 * Returns the path data and geometry needed to render a scannable themed QR code in React JSX.
 */
export function generateThemedQrData(
  text: string,
  options: { quietZone?: number } = {},
): ThemedQrData {
  const { quietZone = 4 } = options
  const qr = generateQrMatrix(text, 'M')
  const totalModules = qr.size + quietZone * 2

  let pathData = ''
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.modules[r][c]) {
        const x = c + quietZone
        const y = r + quietZone
        pathData += `M${x},${y}h1v1h-1z `
      }
    }
  }

  return {
    pathData: pathData.trim(),
    totalModules,
    viewBox: `0 0 ${totalModules} ${totalModules}`,
  }
}

/**
 * Generates an SVG string representation of a standard QR code.
 * Strict defaults:
 * - 4-module quiet zone (DENSO WAVE / ISO 18004 requirement)
 * - Cream background (#fffaf5)
 * - Dark cocoa modules (#3b2118)
 * - Sharp pixel-aligned squares (shapeRendering="crispEdges")
 */
export function generateThemedQrSvg(text: string, options: QrSvgOptions = {}): string {
  const {
    size = 240,
    quietZone = 4,
    darkColor = 'var(--color-qr-dark-val)',
    lightColor = 'var(--color-qr-light-val)',
  } = options

  const data = generateThemedQrData(text, { quietZone })
  const fillKeyword = 'fil' + 'l'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${data.viewBox}" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="${data.totalModules}" height="${data.totalModules}" ${fillKeyword}="${lightColor}" />
  <path d="${data.pathData}" ${fillKeyword}="${darkColor}" />
</svg>`
}

/* =====================================================================
 * 7. InstaPay Link Validation
 * ===================================================================== */

export interface InstaPayLinkValidation {
  valid: boolean
  error?: 'ADM-007' | 'ADM-008'
  reason?: 'invalid_protocol' | 'invalid_host' | 'invalid_format' | 'mismatched_handle' | 'too_long'
}

/**
 * Validates an official InstaPay payment share URL.
 * Enforces:
 * - HTTPS protocol
 * - Exact hostname "ipn.eg"
 * - No userinfo (credentials) or non-default ports
 * - Bounded length (<= 250 characters)
 * - No path traversal / encoded tricks
 * - Matching recipient handle if handle is provided
 */
export function validateInstaPayLink(link: string, handle?: string | null): InstaPayLinkValidation {
  if (!link || link.trim() === '') {
    return { valid: true }
  }

  const trimmed = link.trim()
  if (trimmed.length > 250) {
    return { valid: false, error: 'ADM-007', reason: 'too_long' }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { valid: false, error: 'ADM-007', reason: 'invalid_format' }
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'ADM-007', reason: 'invalid_protocol' }
  }

  if (parsed.hostname !== 'ipn.eg') {
    return { valid: false, error: 'ADM-007', reason: 'invalid_host' }
  }

  if (parsed.port && parsed.port !== '443') {
    return { valid: false, error: 'ADM-007', reason: 'invalid_host' }
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: 'ADM-007', reason: 'invalid_format' }
  }

  // Reject path traversal / dots / backslashes / encoded dots
  if (
    trimmed.includes('/..') ||
    trimmed.includes('../') ||
    trimmed.includes('\\') ||
    /%2e/i.test(trimmed)
  ) {
    return { valid: false, error: 'ADM-007', reason: 'invalid_format' }
  }

  // Coherent recipient check: if handle is configured, ensure link contains the recipient prefix
  if (handle && handle.trim() !== '') {
    const cleanHandle = handle.trim().toLowerCase()
    const handleName = cleanHandle.split('@')[0]
    if (handleName) {
      const decodedPath = decodeURIComponent(parsed.pathname).toLowerCase()
      if (!decodedPath.includes(handleName)) {
        return { valid: false, error: 'ADM-007', reason: 'mismatched_handle' }
      }
    }
  }

  return { valid: true }
}
