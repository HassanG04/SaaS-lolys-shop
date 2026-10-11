const tasks = {
  'test:e2e': 'T-4.07',
  'db:start': 'T-1.01',
  'db:stop': 'T-1.01',
  'db:reset': 'T-1.01',
  'db:test': 'T-1.04',
  'db:types': 'T-1.03',
  'db:test:concurrency': 'T-1.08',
  'check:secrets': 'T-0.09',
  'check:bundle': 'T-0.09',
  'check:i18n': 'T-2.03',
  'check:migrations': 'T-1.09',
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
