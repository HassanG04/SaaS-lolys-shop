import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const statuses = ['todo', 'doing', 'done', 'blocked', 'skip']
const idPattern = /^T-(\d+)\.(\d{2})([a-z]?)$/
const complete = (task) => ['done', 'skip'].includes(task?.status)

export function parseRoadmap(source) {
  const lines = source.split(/\r?\n/)
  const visible = []
  let fence
  for (const line of lines) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (fence) {
      visible.push('')
      if (
        marker &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      )
        fence = undefined
    } else if (marker) {
      fence = marker[1]
      visible.push('')
    } else visible.push(line)
  }
  const tasks = []
  const errors = []
  let phase
  let offset = 0
  let active
  let appendixStart = -1
  for (let i = 0; i < lines.length; i++) {
    const line = visible[i]
    if (/^#{1,4} /.test(line) && active) {
      active.end = offset
      active.endLine = i
      active = undefined
    }
    const phaseMatch = line.match(/^### Phase (\d+):/)
    if (/^#{1,2} /.test(line)) phase = undefined
    if (phaseMatch) phase = Number(phaseMatch[1])
    if (/^## Appendix G:/.test(line)) appendixStart = i
    if (/^#### T-/.test(line)) {
      const match = line.match(/^#### (T-\d+\.\d{2}[a-z]?): (.+)$/)
      if (!match) errors.push(`Line ${i + 1}: malformed task heading`)
      else {
        const id = match[1]
        const metadataLine = lines.findIndex((text, j) => j > i && text.trim())
        const metadata = visible[metadataLine] ?? ''
        const parts = [...metadata.matchAll(/`(status|owner|needs|size):\s*([^`]+)`/g)]
        const fields = Object.fromEntries(parts.map((part) => [part[1], part[2].trim()]))
        if (
          parts.length !== 4 ||
          Object.keys(fields).length !== 4 ||
          metadata.replace(/`(status|owner|needs|size):\s*[^`]+`/g, '').trim()
        )
          errors.push(`Line ${i + 1}: invalid metadata`)
        if (!statuses.includes(fields.status)) errors.push(`Line ${i + 1}: invalid status`)
        if (!['agent', 'human'].includes(fields.owner)) errors.push(`Line ${i + 1}: invalid owner`)
        if (!['S', 'M', 'L'].includes(fields.size)) errors.push(`Line ${i + 1}: invalid size`)
        if (Number(id.match(idPattern)[1]) !== phase) errors.push(`Line ${i + 1}: phase mismatch`)
        const needs =
          fields.needs === 'none' ? [] : (fields.needs ?? '').split(',').map((need) => need.trim())
        if (needs.some((need) => !idPattern.test(need)) || new Set(needs).size !== needs.length)
          errors.push(`Line ${i + 1}: invalid needs`)
        active = {
          id,
          title: match[2],
          ...fields,
          needs,
          phase,
          line: i + 1,
          metadataLine,
          start: offset,
          end: source.length,
          endLine: lines.length,
        }
        tasks.push(active)
      }
    }
    offset +=
      lines[i].length +
      (source.slice(offset + lines[i].length, offset + lines[i].length + 2) === '\r\n' ? 2 : 1)
  }
  const byId = new Map()
  for (const task of tasks) {
    task.block = source.slice(task.start, task.end)
    if (byId.has(task.id)) errors.push(`Line ${task.line}: duplicate ID ${task.id}`)
    byId.set(task.id, task)
    const body = visible.slice(task.metadataLine + 1, task.endLine).join('\n')
    for (const field of ['Do', 'Done when', 'Verify'])
      if (!body.includes(`- **${field}:**`)) errors.push(`Line ${task.line}: missing ${field}`)
    if (task.metadataLine < task.line || task.metadataLine >= task.endLine)
      errors.push(`Line ${task.line}: missing metadata line`)
    for (const need of task.needs)
      if (!tasks.some((other) => other.id === need))
        errors.push(`Line ${task.line}: unknown dependency ${need}`)
  }
  const visiting = new Set()
  const visited = new Set()
  function visit(task) {
    if (visiting.has(task.id)) {
      errors.push(`Line ${task.line}: dependency cycle at ${task.id}`)
      return
    }
    if (visited.has(task.id)) return
    visiting.add(task.id)
    for (const need of task.needs) if (byId.has(need)) visit(byId.get(need))
    visiting.delete(task.id)
    visited.add(task.id)
  }
  tasks.forEach(visit)
  if (!tasks.length) errors.push('Line 1: no tasks found')
  const logged = new Set()
  const approvedSkips = new Set()
  if (appendixStart >= 0) {
    for (const line of visible.slice(appendixStart + 1)) {
      if (/^#{1,2} /.test(line)) break
      if (line.startsWith('|')) {
        const cells = line.split('|').map((cell) => cell.trim())
        for (const cell of cells)
          for (const id of cell.match(/\bT-\d+\.\d{2}[a-z]?\b/g) ?? []) logged.add(id)
        if (cells.includes('Owner') && cells.some((cell) => cell.startsWith('Approved skip: '))) {
          for (const cell of cells) if (idPattern.test(cell)) approvedSkips.add(cell)
        }
      }
    }
  }
  return { tasks, errors, byId, logged, approvedSkips }
}

function validated(source) {
  const model = parseRoadmap(source)
  if (model.errors.length) throw new Error(model.errors.join('\n'))
  return model
}

export function nextTask(source) {
  const { tasks, byId } = validated(source)
  return [...tasks]
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
    .find(
      (task) =>
        task.status === 'todo' &&
        task.owner === 'agent' &&
        task.needs.every((id) => complete(byId.get(id))),
    )
}

export function setStatus(source, id, status) {
  const { byId, logged, approvedSkips } = validated(source)
  if (!statuses.includes(status)) throw new Error(`Invalid status: ${status}`)
  const task = byId.get(id)
  if (!task) throw new Error(`Unknown task: ${id}`)
  if (status === 'done' && !task.needs.every((need) => complete(byId.get(need))))
    throw new Error(`${id}: unfinished dependencies`)
  if (status === 'blocked' && !logged.has(id))
    throw new Error(`${id}: add an Appendix G log row before blocking`)
  if (status === 'skip' && !approvedSkips.has(id))
    throw new Error(`${id}: requires an Owner row with Approved skip: reason in Appendix G`)
  const lines = source.split(/(?<=\n)/)
  lines[task.metadataLine] = lines[task.metadataLine].replace(
    /`status:\s*[^`]+`/,
    `\`status: ${status}\``,
  )
  return lines.join('')
}

export function run(args, source) {
  const { tasks, byId } = validated(source)
  const [command = 'status', id, status] = args
  if ((command === 'set' && args.length !== 3) || (command !== 'set' && args.length > 1))
    throw new Error('Unexpected arguments')
  if (command === 'check') return { output: `Roadmap valid: ${tasks.length} tasks` }
  if (command === 'set')
    return { source: setStatus(source, id, status), output: `${id}: ${status}` }
  if (command === 'next') {
    const task = nextTask(source)
    if (task) return { output: task.block.trimEnd() }
    const human = tasks.filter((t) => t.owner === 'human' && !complete(t)).map((t) => t.id)
    const waiting = tasks
      .filter((t) => t.owner === 'agent' && !complete(t))
      .map(
        (t) =>
          `${t.id} (${t.status}; needs: ${t.needs.filter((need) => !complete(byId.get(need))).join(', ') || 'none'})`,
      )
    return {
      output: `No runnable agent tasks.\nWaiting on human: ${human.join(', ') || 'none'}\nUnfinished agent tasks: ${waiting.join('; ') || 'none'}`,
    }
  }
  if (command === 'status') {
    const counts = (items) =>
      statuses
        .map((status) => `${status}=${items.filter((task) => task.status === status).length}`)
        .join(' ')
    const phases = [...new Set(tasks.map((task) => task.phase))].sort((a, b) => a - b)
    return {
      output: [
        ...phases.map(
          (phase) => `Phase ${phase}: ${counts(tasks.filter((task) => task.phase === phase))}`,
        ),
        `Overall: ${counts(tasks)}`,
      ].join('\n'),
    }
  }
  throw new Error('Usage: roadmap.mjs status|next|check|set <id> <status>')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const path = resolve('roadmap.md')
    const result = run(process.argv.slice(2), readFileSync(path, 'utf8'))
    if (result.source !== undefined) writeFileSync(path, result.source)
    process.stdout.write(`${result.output}\n`)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Roadmap command failed'}\n`)
    process.exitCode = 1
  }
}
