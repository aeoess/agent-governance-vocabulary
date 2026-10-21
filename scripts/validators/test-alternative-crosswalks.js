'use strict'
// Isolated alternative-format cases: no changes to production crosswalks.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process'), yaml = require('js-yaml')
const root = path.resolve(__dirname, '../..')
const cases = [
  ['valid mapping', 'logpose.yaml', d => {}, true],
  ['invalid mapping enum', 'logpose.yaml', d => { d.mappings[0].match = 'invented' }, false],
  ['missing mapping canonical', 'logpose.yaml', d => { delete d.mappings[0].canonical }, false],
  ['mapping wrong container', 'logpose.yaml', d => { d.mappings = {bad: 'shape'} }, false],
  ['valid A2A', 'a2a.yaml', d => {}, true],
  ['wrong A2A canonical value', 'a2a.yaml', d => { d.signals.peer_review.a2a_canonical_value = 'wallet_state' }, false],
  ['A2A issuer missing', 'a2a.yaml', d => { delete d.issuer }, false],
  ['A2A signals wrong container', 'a2a.yaml', d => { d.signals = [] }, false],
  ['valid SATP', 'satp/behavioral-trust.yaml', d => {}, true],
  ['SATP vocabulary_ref missing', 'satp/behavioral-trust.yaml', d => { delete d.vocabulary_ref }, false],
  ['SATP field_mappings wrong container', 'satp/behavioral-trust.yaml', d => { d.field_mappings = [] }, false],
  ['empty SATP field path', 'satp/behavioral-trust.yaml', d => { d.field_mappings.canonical_score_field = '' }, false],
]
let passed = 0
for (const [name, filename, mutate, valid] of cases) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alternative-crosswalk-'))
  try {
    const target = path.join(temp, 'crosswalk', filename)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(root, 'vocabulary.yaml'), path.join(temp, 'vocabulary.yaml'))
    const doc = yaml.load(fs.readFileSync(path.join(root, 'crosswalk', filename), 'utf8'))
    mutate(doc)
    fs.writeFileSync(target, yaml.dump(doc))
    const result = cp.spawnSync(process.execPath, [path.join(root, 'scripts/validate-crosswalks.js'), temp], { encoding: 'utf8', timeout: 20000 })
    const ok = valid ? result.status === 0 && result.stdout.includes('0 warning(s)') : result.status === 1 && result.stdout.includes('ERROR  crosswalk/')
    if (!ok) { console.error(`FAIL ${name}: exit=${result.status}\n${(result.stdout + result.stderr).slice(-900)}`); process.exitCode = 1 }
    else { console.log(`PASS ${name}`); passed++ }
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
}
console.log(`alternative structural cases: ${passed}/${cases.length}`)
