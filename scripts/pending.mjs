const tasks = {
  'test:e2e': 'T-4.07',
  'check:sql': 'T-1.22',
  'analytics:install': 'T-9.02',
  'analytics:test': 'T-9.02',
  'analytics:forecast': 'T-9.08',
}
const command = process.argv[2]
process.stderr.write(
  `${command ?? 'Command'} is not implemented; requires ${tasks[command] ?? 'a roadmap task'}.\n`,
)
process.exitCode = 1
