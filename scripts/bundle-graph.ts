import { isAbsolute, relative } from 'node:path'
import { normalizePath, type Plugin } from 'vite'

// Capture module attribution before minification makes admin code unrecognizable.
export function bundleGraph(): Plugin {
  let root = ''
  return {
    name: 'lolys-bundle-graph',
    apply: 'build',
    configResolved(config) {
      root = config.root
    },
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const chunks = Object.values(bundle)
          .filter((item) => item.type === 'chunk')
          .map((chunk) => ({
            fileName: chunk.fileName,
            isEntry: chunk.isEntry,
            imports: chunk.imports,
            dynamicImports: chunk.dynamicImports,
            modules: Object.entries(chunk.modules)
              .filter(([id, module]) => isAbsolute(id) && module.renderedLength > 0)
              .map(([id]) => normalizePath(relative(root, id.split('?')[0])))
              .filter((id) => !id.startsWith('../') && !isAbsolute(id)),
          }))
        this.emitFile({
          type: 'asset',
          fileName: '.vite/bundle-graph.json',
          source: JSON.stringify({ version: 1, chunks }),
        })
      },
    },
  }
}
