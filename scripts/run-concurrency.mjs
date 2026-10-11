import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const scriptPath = resolve(process.cwd(), 'supabase/tests/concurrency.sh')

let shell = 'bash'

if (process.platform === 'win32') {
  const gitSh = 'C:\\Program Files\\Git\\bin\\sh.exe'
  const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe'
  if (existsSync(gitSh)) {
    shell = gitSh
  } else if (existsSync(gitBash)) {
    shell = gitBash
  }
}

// Convert path to forward slashes for sh
const posixPath = scriptPath.replace(/\\/g, '/')

const result = spawnSync(shell, [posixPath], {
  stdio: 'inherit',
  shell: false,
})

process.exit(result.status ?? 1)
