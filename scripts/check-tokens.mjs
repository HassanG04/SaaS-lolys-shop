import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const tokenPath = 'src/styles/tokens.css'
const utility =
  /\b(bg|text|border(?:-[xysetbrl])?|divide|ring(?:-offset)?|outline|fill|stroke|accent|decoration|caret|rounded(?:-[setbrl]{1,2})?|(?:inset-)?shadow)-(\[[^\]]+\]|\([^)]+\)|[\w./-]+)/g
const property =
  '(?:color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|box-shadow|text-shadow|fill|stroke)'
const declaration = new RegExp(`(?<![\\w-])(${property})\\s*:\\s*([^;{}]+)`, 'gi')
const inline =
  /\b(color|backgroundColor|background|border(?:Block|Inline|Top|Right|Bottom|Left)?(?:Color|Radius)?|boxShadow|textShadow|outline(?:Color)?|fill|stroke)\s*[:=]\s*(?:['"]([^'"]+)['"]|(\d+(?:\.\d+)?))/g
const neutral = /^(?:transparent|currentColor|inherit|none|initial|unset)$/i

export function createChecker(tokens) {
  const variables = new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
  const theme = tokens.match(/@theme\s+inline\s*\{([^}]+)\}/)?.[1] ?? ''
  const names = (kind) =>
    new Set([...theme.matchAll(new RegExp(`--${kind}-([\\w-]+):`, 'g'))].map((m) => m[1]))
  const colors = names('color'),
    radii = names('radius'),
    shadows = names('shadow'),
    sizes = names('text')
  function variable(value) {
    return value.replace(/var\((--[\w-]+)\)/g, (match, name) => (variables.has(name) ? '' : match))
  }
  function validValue(prop, value) {
    if (neutral.test(value.trim())) return true
    // Semantic class maps (for example Toast's `color: 'text-success'`).
    if (/^text-/.test(value) && colors.has(value.slice(5))) return true
    const rest = variable(value)
      .replace(/!important/g, '')
      .trim()
    if (!rest) return true
    // Border/outline widths and styles are not color, radius or shadow values.
    if (/^(?:border(?!.*(?:color|radius))|outline$)/i.test(prop)) {
      return rest
        .split(/\s+/)
        .every((part) =>
          /^(?:0|\d+(?:\.\d+)?(?:px|rem)|solid|dashed|dotted|double|transparent|currentColor|none)$/i.test(
            part,
          ),
        )
    }
    return false
  }
  return (source, css = false) => {
    const failures = []
    if (!css) {
      for (const match of source.matchAll(/(?<![\w-])(?:rounded|shadow)(?=[\s'"`}]|$)/g))
        failures.push(match[0])
      for (const [match, kind, raw] of source.matchAll(utility)) {
        const value = raw.split('/')[0]
        const radius = kind.startsWith('rounded'),
          shadow = kind.endsWith('shadow')
        const allowed = radius ? radii : shadow ? shadows : colors
        const reference = value.match(/^\[(?:color:)?var\((--[\w-]+)\)\]$|^\((--[\w-]+)\)$/)
        if (reference && variables.has(reference[1] ?? reference[2])) continue
        if (allowed.has(value) || neutral.test(value) || value === 'current') continue
        if (kind === 'stroke' && value === 'width') continue // SVG attribute, not a utility.
        if (
          kind === 'text' &&
          (sizes.has(value) ||
            /^(?:start|end|center|justify|wrap|nowrap|balance|pretty|ellipsis|clip)$/.test(value))
        )
          continue
        if (
          /^(?:border|divide|ring|outline|stroke)/.test(kind) &&
          /^(?:\d+|solid|dashed|dotted|double|hidden|offset-\d+|[xysetbrl])$/.test(value)
        )
          continue
        if (kind === 'bg' && /^(?:cover|contain|center|clip-text|no-repeat)$/.test(value)) continue
        failures.push(match)
      }
    }
    const pattern = css ? declaration : inline
    for (const [match, prop, quoted, numeric] of source.matchAll(pattern)) {
      if (/^border-.*(?:width|style)$/.test(prop)) continue
      if (!validValue(prop, quoted ?? numeric)) failures.push(match)
    }
    return [...new Set(failures)]
  }
}

export async function checkTokens(root = process.cwd()) {
  const check = createChecker(await readFile(path.join(root, tokenPath), 'utf8'))
  const files = await readdir(path.join(root, 'src'), { recursive: true })
  const failures = []
  for (const file of files) {
    const relative = `src/${file.replaceAll(path.sep, '/')}`
    if (relative === tokenPath || !/\.(?:[jt]sx?|css|svg)$/.test(file)) continue
    const matches = check(await readFile(path.join(root, relative), 'utf8'), file.endsWith('.css'))
    if (matches.length) failures.push(`${relative}: ${matches.join(', ')}`)
  }
  return failures
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const failures = await checkTokens()
    if (failures.length) throw new Error(failures.join('\n'))
    console.log('[TOKENS] Source uses documented colors, radii and shadows.')
  } catch (error) {
    console.error(`[TOKENS] ${error.message}`)
    process.exitCode = 1
  }
}
