import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const analyticsDir = path.join(rootDir, 'analytics')
const analyticsSrc = path.join(analyticsDir, 'src')

function findPythonCommand() {
  const candidates =
    process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python']

  for (const cmd of candidates) {
    const res = spawnSync(cmd, ['--version'], { encoding: 'utf-8' })
    if (res.status === 0) {
      return cmd
    }
  }
  throw new Error('Python executable not found in PATH. Please install Python 3.12+.')
}

const command = process.argv[2]
const pythonCmd = findPythonCommand()

if (command === 'install') {
  console.log(`[ANALYTICS] Installing analytics dependencies with ${pythonCmd}...`)
  const reqPath = path.join(analyticsDir, 'requirements-dev.txt')
  const res = spawnSync(pythonCmd, ['-m', 'pip', 'install', '-r', reqPath], {
    stdio: 'inherit',
    cwd: rootDir,
  })
  process.exitCode = res.status ?? 1
} else if (command === 'test') {
  console.log(`[ANALYTICS] Running analytics test suite using ${pythonCmd}...`)

  const env = {
    ...process.env,
    PYTHONPATH:
      analyticsSrc + (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : ''),
  }

  // 1. Run pytest (or fallback to unittest if pytest not yet installed)
  console.log('\n--- Running Unit & Property Tests ---')
  let testRes = spawnSync(pythonCmd, ['-m', 'pytest', path.join(analyticsDir, 'tests'), '-v'], {
    stdio: 'inherit',
    cwd: rootDir,
    env,
  })

  if (testRes.status !== 0 && testRes.error) {
    console.log('pytest not found, falling back to unittest...')
    testRes = spawnSync(
      pythonCmd,
      ['-m', 'unittest', 'discover', '-s', path.join(analyticsDir, 'tests'), '-p', 'test_*.py'],
      { stdio: 'inherit', cwd: rootDir, env },
    )
  }

  if (testRes.status !== 0) {
    console.error('[ANALYTICS] Tests failed!')
    process.exit(testRes.status ?? 1)
  }

  // 2. Run Ruff linter and formatting check
  console.log('\n--- Running Ruff Linter & Formatting Checks ---')
  const ruffCheck = spawnSync(pythonCmd, ['-m', 'ruff', 'check', 'analytics'], {
    stdio: 'inherit',
    cwd: rootDir,
    env,
  })
  if (ruffCheck.status !== 0) {
    console.error('[ANALYTICS] Ruff lint check failed!')
    process.exit(ruffCheck.status ?? 1)
  }

  const ruffFormat = spawnSync(pythonCmd, ['-m', 'ruff', 'format', '--check', 'analytics'], {
    stdio: 'inherit',
    cwd: rootDir,
    env,
  })
  if (ruffFormat.status !== 0) {
    console.error('[ANALYTICS] Ruff format check failed!')
    process.exit(ruffFormat.status ?? 1)
  }

  console.log('\n[ANALYTICS] All analytics tests, linting and formatting passed cleanly.')
  process.exitCode = 0
} else {
  console.error(`Unknown analytics command "${command}". Available: install, test`)
  process.exitCode = 1
}
