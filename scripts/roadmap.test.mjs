import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { parseRoadmap, nextTask, setStatus, run } from './roadmap.mjs'

const block = (id, status = 'todo', needs = 'none', owner = 'agent') => `#### ${id}: مهمة عربية
\`status: ${status}\` \`owner: ${owner}\` \`needs: ${needs}\` \`size: S\`
- **Do:** Build it.
- **Done when:** Verified.
- **Verify:** Test.
`
const fixture = (...tasks) => `### Phase 0: Foundations\n${tasks.join('\n')}`
const logs = (id) =>
  `\n## Appendix G: Logs\n### Work log\n| Date | Task | Summary |\n| today | ${id} | reason |\n`

test('checks a valid task and all five status counters', () => {
  const source = fixture(block('T-0.01'))
  assert.deepEqual(parseRoadmap(source).errors, [])
  assert.equal(run(['check'], source).output, 'Roadmap valid: 1 tasks')
  assert.match(run(['status'], source).output, /Overall: todo=1 doing=0 done=0 blocked=0 skip=0/)
})

for (const fence of ['```', '~~~~'])
  test(`ignores fenced examples (${fence})`, () => {
    const source =
      fixture(block('T-0.01')) +
      `${fence}markdown\n### Phase 3: Example\n${block('T-0.99', 'invalid')}\n${fence}\n`
    assert.equal(parseRoadmap(source).tasks.length, 1)
    assert.deepEqual(parseRoadmap(source).errors, [])
  })

const invalidFixtures = [
  [fixture(block('T-0.01'), block('T-0.01')), /duplicate ID/],
  [fixture(block('T-0.01', 'wrong')), /invalid status/],
  [fixture(block('T-0.01', 'todo', 'none', 'robot')), /invalid owner/],
  [fixture(block('T-0.01')).replace('size: S', 'size: XL'), /invalid size/],
  [fixture(block('T-0.01', 'todo', 'T-0.99')), /unknown dependency/],
  [fixture(block('T-0.01', 'todo', 'T-0.01')), /cycle/],
  [fixture(block('T-0.01', 'todo', 'T-0.02'), block('T-0.02', 'todo', 'T-0.01')), /cycle/],
  [fixture(block('T-1.01')), /phase mismatch/],
  [fixture(block('T-0.1')), /malformed task heading/],
  [fixture(block('T-0.01')).replace('- **Verify:** Test.', ''), /missing Verify/],
  [fixture(block('T-0.01')).replace('- **Do:** Build it.', ''), /missing Do/],
  [fixture(block('T-0.01')).replace('- **Done when:** Verified.', ''), /missing Done when/],
  [fixture(block('T-0.01')).replace('\n`status:', '\ntext\n`status:'), /invalid metadata/],
  [fixture(block('T-0.01')).replace('needs: none', 'needs: T-0.1'), /invalid needs/],
]
for (const [source, expected] of invalidFixtures)
  test(`rejects ${expected}`, () => {
    assert.match(parseRoadmap(source).errors.join('\n'), expected)
    assert.throws(() => run(['check'], source), /Line \d+:/)
  })

test('metadata cannot be hidden in a fence or borrowed from the next task', () => {
  assert.ok(parseRoadmap(fixture('#### T-0.01: Empty\n', block('T-0.02'))).errors.length)
  const source = fixture(block('T-0.01'))
    .replace('`status:', '```\n`status:')
    .replace('- **Do:', '```\n- **Do:')
  assert.match(parseRoadmap(source).errors.join('\n'), /metadata/)
})

test('next sorts numerically, supports split IDs, and requires complete dependencies', () => {
  const source = fixture(
    block('T-0.03'),
    block('T-0.02b', 'todo', 'T-0.01'),
    block('T-0.01', 'skip'),
  )
  assert.equal(nextTask(source).id, 'T-0.02b')
  const multi =
    '### Phase 10: Later\n' + block('T-10.01') + '\n### Phase 2: Earlier\n' + block('T-2.02')
  assert.equal(nextTask(multi).id, 'T-2.02')
  const dependent = fixture(
    block('T-0.01', 'doing'),
    block('T-0.02', 'todo', 'T-0.01'),
    block('T-0.03', 'todo', 'none', 'human'),
  )
  assert.equal(nextTask(dependent), undefined)
  assert.match(run(['next'], dependent).output, /Waiting on human: T-0.03/)
  assert.match(run(['next'], dependent).output, /T-0.02 \(todo; needs: T-0.01\)/)
})

test('next returns the full task including deeper headings, ends at headings 1–4', () => {
  for (const heading of ['# End', '## End', '### End', '#### End']) {
    const task = block('T-0.01') + '##### Detail\nMore detail.\n'
    const source = fixture(task) + heading + '\nnot part of task\n'
    assert.equal(run(['next'], source).output, task.trimEnd())
  }
})

for (const newline of ['\n', '\r\n'])
  test(`set preserves surrounding bytes with ${JSON.stringify(newline)}`, () => {
    const source = fixture(block('T-0.01', 'done'), block('T-0.02', 'todo', 'T-0.01')).replaceAll(
      '\n',
      newline,
    )
    const updated = setStatus(source, 'T-0.02', 'done')
    assert.equal(updated, source.replace('`status: todo`', '`status: done`'))
    assert.equal(setStatus(updated, 'T-0.02', 'done'), updated)
  })

test('set refuses incomplete dependencies, unknown IDs and statuses', () => {
  const source = fixture(block('T-0.01'), block('T-0.02', 'todo', 'T-0.01'))
  assert.throws(() => setStatus(source, 'T-0.02', 'done'), /unfinished dependencies/)
  assert.throws(() => setStatus(source, 'T-0.99', 'done'), /Unknown task/)
  assert.throws(() => setStatus(source, 'T-0.01', 'wrong'), /Invalid status/)
})

test('skip requires a logged owner decision, not a normal work-log mention', () => {
  const source = fixture(block('T-0.01'))
  assert.throws(() => setStatus(source + logs('T-0.01'), 'T-0.01', 'skip'), /Owner row/)
  assert.throws(
    () =>
      setStatus(
        source + logs('T-0.01b') + '| T-0.01b | Owner | Approved skip: deferred |\n',
        'T-0.01',
        'skip',
      ),
    /Owner row/,
  )
  const approved =
    source + logs('T-0.01') + '| today | T-0.01 | Owner | Approved skip: not needed |\n'
  assert.match(setStatus(approved, 'T-0.01', 'skip'), /status: skip/)
})

test('CLI rejects extra and missing arguments, including empty extras', () => {
  const source = fixture(block('T-0.01'))
  for (const args of [
    ['set', 'T-0.01'],
    ['set', 'T-0.01', 'done', ''],
    ['set', 'T-0.01', 'done', '', 'bad'],
    ['check', ''],
  ])
    assert.throws(() => run(args, source), /Unexpected arguments/)
})

test('blocked requires the exact ID in an unfenced Appendix G table row', () => {
  const source = fixture(block('T-0.01'))
  for (const suffix of [
    '',
    logs('T-0.01b'),
    '\n| today | T-0.01 | elsewhere |',
    '\n## Appendix G: Logs\nMention T-0.01 here.',
    '\n## Appendix G: Logs\n```\n| T-0.01 |\n```',
  ]) {
    assert.throws(() => setStatus(source + suffix, 'T-0.01', 'blocked'), /Appendix G/)
  }
  assert.match(setStatus(source + logs('T-0.01'), 'T-0.01', 'blocked'), /status: blocked/)
})

test('CLI failure does not change the file; no-runnable exits zero', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lolys-roadmap-'))
  const script = fileURLToPath(new URL('./roadmap.mjs', import.meta.url))
  const path = join(dir, 'roadmap.md')
  const source = fixture(block('T-0.01', 'done'), block('T-0.02', 'todo', 'T-0.01', 'human'))
  try {
    writeFileSync(path, source)
    const failed = spawnSync(process.execPath, [script, 'set', 'T-0.99', 'done'], {
      cwd: dir,
      encoding: 'utf8',
    })
    assert.equal(failed.status, 1)
    assert.equal(readFileSync(path, 'utf8'), source)
    const waiting = spawnSync(process.execPath, [script, 'next'], { cwd: dir, encoding: 'utf8' })
    assert.equal(waiting.status, 0)
    assert.match(waiting.stdout, /No runnable/)
  } finally {
    assert.equal(dirname(resolve(dir)), resolve(tmpdir()))
    assert.ok(basename(dir).startsWith('lolys-roadmap-'))
    rmSync(dir, { recursive: true, force: true })
  }
})
