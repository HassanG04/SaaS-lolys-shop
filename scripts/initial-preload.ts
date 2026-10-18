import type { Plugin } from 'vite'

// Start only dependencies already counted in the initial bundle. Lazy routes,
// including the protected admin workspace, must stay behind dynamic imports.
export function initialPreload(): Plugin {
  let base = '/'
  return {
    name: 'lolys-initial-preload',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_, { bundle, chunk }) {
        if (!bundle || !chunk) return
        const seen = new Set([chunk.fileName])
        const pending = [...chunk.imports]
        const tags = []
        while (pending.length) {
          const file = pending.pop()
          if (!file || seen.has(file)) continue
          seen.add(file)
          const dependency = bundle[file]
          if (dependency?.type !== 'chunk') continue
          tags.push({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: '', href: `${base}${file}` },
            injectTo: 'head' as const,
          })
          pending.push(...dependency.imports)
        }
        return tags
      },
    },
  }
}
