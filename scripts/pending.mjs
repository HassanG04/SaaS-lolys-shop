const tasks = {
  'analytics:forecast': 'T-9.08',
}
const command = process.argv[2]
process.stderr.write(
  `${command ?? 'Command'} is not implemented; requires ${tasks[command] ?? 'a roadmap task'}.\n`,
)
process.exitCode = 1
