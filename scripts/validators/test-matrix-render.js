#!/usr/bin/env node
// test-matrix-render.js — the matrix is a build output, so these cases check
// the generator itself rather than a committed file. Each case builds a small
// repository tree in a temporary directory and runs the real generator on it.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const GEN = path.join(ROOT, 'scripts', 'generate-crosswalk-matrix.js')
const gen = require(GEN)

let passed = 0
let failed = 0
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  ok   ${name}`) }
  else { failed++; console.log(`  FAIL ${name}${detail ? ': ' + detail : ''}`) }
}

// A temporary tree with the real vocabulary and the given crosswalk files.
function tree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'matrix-render-'))
  fs.copyFileSync(path.join(ROOT, 'vocabulary.yaml'), path.join(dir, 'vocabulary.yaml'))
  fs.mkdirSync(path.join(dir, 'crosswalk'))
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, 'crosswalk', name), text, 'utf8')
  return dir
}

function run(args) {
  try {
    return { exit: 0, out: execFileSync('node', [GEN, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (e) {
    return { exit: e.status === undefined ? 1 : e.status, out: `${e.stdout || ''}${e.stderr || ''}` }
  }
}

const GOOD = [
  'system:',
  '  name: Example',
  'signal_types:',
  '  governance_attestation:',
  '    canonical: governance_attestation',
  '    match: partial',
  '',
].join('\n')

// 1. The repository renders and its output contract holds.
{
  const r = run(['--check'])
  check('1. --check passes on the repository', r.exit === 0, r.out)
}

// 2. A crosswalk that does not parse fails the build instead of being listed
//    as an alternative-format crosswalk.
{
  const dir = tree({ 'good.yaml': GOOD, 'broken.yaml': 'signal_types:\n  governance_attestation: [unclosed\n' })
  const r = run(['--check', '--root', dir])
  check('2. a malformed crosswalk fails --check', r.exit === 1, r.out)
  check('2. the failure names the file', /crosswalk\/broken\.yaml/.test(r.out), r.out)
  const s = run(['--site', path.join(dir, 'site'), '--root', dir])
  check('2. a malformed crosswalk fails the site build', s.exit === 1, s.out)
  check('2. no page is written when the build fails', !fs.existsSync(path.join(dir, 'site', 'index.html')))
}

// 3. An empty crosswalk fails too.
{
  const dir = tree({ 'good.yaml': GOOD, 'empty.yaml': '' })
  const r = run(['--check', '--root', dir])
  check('3. an empty crosswalk fails --check', r.exit === 1 && /crosswalk\/empty\.yaml/.test(r.out), r.out)
}

// 4. A valid crosswalk without signal_types is listed, not failed.
{
  const dir = tree({ 'good.yaml': GOOD, 'alt.yaml': 'system:\n  name: Alt\nmappings: []\n' })
  const r = run(['--stdout', '--root', dir])
  check('4. an alternative-format crosswalk does not fail the build', r.exit === 0, r.out)
  check('4. it is listed under alternative-format crosswalks',
    /Alternative-format crosswalks[\s\S]*crosswalk\/alt\.yaml/.test(r.out), r.out)
}

// 5. A renderer that skips alias normalization is caught by the output
//    contract. This is the mutation the in-memory check exists for.
{
  const legacy = gen.legacySpellingsFromVocab(ROOT)
  check('5. the vocabulary declares at least one deprecated spelling', legacy.length > 0)
  const dir = tree({ 'old.yaml': GOOD.replace('match: partial', `match: ${legacy[0]}`) })
  const bad = gen.buildModel(gen.loadInputs(dir, { normalize: false }))
  const md = gen.renderMarkdown(bad)
  const problems = gen.checkOutput(bad, md, gen.renderHtml(bad), legacy)
  check('5. an unnormalized render is rejected', problems.some(p => p.includes(legacy[0])), problems.join('; '))
  const good = gen.buildModel(gen.loadInputs(dir))
  const ok = gen.checkOutput(good, gen.renderMarkdown(good), gen.renderHtml(good), legacy)
  check('5. the normalized render passes', ok.length === 0, ok.join('; '))
}

// 6. The site build writes the page and the Markdown with the source commit.
{
  const dir = tree({ 'good.yaml': GOOD })
  const sha = '0123456789abcdef0123456789abcdef01234567'
  const r = run(['--site', path.join(dir, 'site'), '--root', dir, '--source-sha', sha])
  const html = r.exit === 0 ? fs.readFileSync(path.join(dir, 'site', 'index.html'), 'utf8') : ''
  const md = r.exit === 0 ? fs.readFileSync(path.join(dir, 'site', 'crosswalk-matrix.md'), 'utf8') : ''
  check('6. the site build succeeds', r.exit === 0, r.out)
  check('6. the page states the source commit', html.includes(`/commit/${sha}`) && html.includes(`content="${sha}"`))
  check('6. the Markdown states the source commit', md.includes(sha))
  check('6. the page is a complete HTML document', html.startsWith('<!doctype html>') && html.trimEnd().endsWith('</html>'))
}

// 7. Text from crosswalk data is escaped in the page.
{
  const dir = tree({ 'good.yaml': GOOD.replace('match: partial', 'match: "<img src=x onerror=alert(1)>"') })
  const html = gen.renderHtml(gen.buildModel(gen.loadInputs(dir)))
  check('7. markup in a match value is escaped', !html.includes('<img') && html.includes('&lt;img'))
}

// 8. Markup in a crosswalk file name (it becomes the system label and the
//    link target) is escaped in the page too.
{
  const name = '<svg onload=alert(1)>.yaml'
  const dir = tree({ [name]: GOOD })
  const html = gen.renderHtml(gen.buildModel(gen.loadInputs(dir)), { sourceSha: '0123456789abcdef0123456789abcdef01234567' })
  check('8. markup in a file name is escaped', !html.includes('<svg') && html.includes('&lt;svg'))
}

// 9. A missing option value or two output modes fail before writing anything.
{
  const r = run(['--site'])
  check('9. --site without a value fails', r.exit === 1 && /requires a value/.test(r.out), r.out)
  const m = run(['--check', '--stdout'])
  check('9. two output modes fail', m.exit === 1 && /only one output mode/.test(m.out), m.out)
}

// 10. A pipe in a file name stays inside one Markdown cell, and the table
//     check catches a row with an extra column.
{
  const dir = tree({ 'a|b.yaml': GOOD, 'c\\|d.yaml': GOOD, 'good.yaml': GOOD })
  const md = gen.renderMarkdown(gen.buildModel(gen.loadInputs(dir)))
  check('10. a pipe in a file name keeps the table aligned', gen.markdownTableProblems(md).length === 0 && md.includes('A&#124;b'), gen.markdownTableProblems(md).join('; '))
  check('10. a backslash before the pipe cannot undo the escape', md.includes('C\\&#124;d'), md.split('\n').filter(l => l.includes('C')).join(' / '))
  check('10. an unescaped pipe is caught', gen.markdownTableProblems('| a | b |\n| - | - |\n| x | y | z |').length === 1)
}

// 11. The committed pointer cannot turn back into a matrix.
{
  const stale = tree({ 'good.yaml': GOOD })
  fs.mkdirSync(path.join(stale, 'docs', 'generated'), { recursive: true })
  fs.writeFileSync(path.join(stale, 'docs', 'generated', 'crosswalk-matrix.md'),
    fs.readFileSync(path.join(ROOT, 'docs', 'generated', 'crosswalk-matrix.md'), 'utf8') + '\n| System | x |\n| ------ | - |\n| A | ✅ |\n', 'utf8')
  const r = run(['--check', '--root', stale])
  check('11. a pointer carrying a table fails --check', r.exit === 1 && /contains a Markdown table/.test(r.out), r.out)
  fs.writeFileSync(path.join(stale, 'docs', 'generated', 'crosswalk-matrix.md'), '# Crosswalk Matrix\n', 'utf8')
  const u = run(['--check', '--root', stale])
  check('11. a pointer without the link fails --check', u.exit === 1 && /no longer links/.test(u.out), u.out)
  check('11. the repository pointer passes', gen.checkPointer(ROOT).length === 0, gen.checkPointer(ROOT).join('; '))
}

// 12. The coverage note does not turn a bounded search into an absence claim.
{
  const model = gen.buildModel(gen.loadInputs(ROOT))
  const md = gen.renderMarkdown(model)
  const html = gen.renderHtml(model)
  check('12. no absence claim in the coverage note', !/does not provide/.test(md) && !/does not provide/.test(html) && md.includes('not necessarily a capability the system lacks'))
}

console.log(`${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
