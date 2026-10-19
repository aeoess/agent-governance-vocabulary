'use strict'
// Issue #107 — isolated input-mutation tests; never edits production crosswalks.
const fs = require('fs')
const os = require('os')
const path = require('path')
const cp = require('child_process')
const yaml = require('js-yaml')
const root = path.resolve(__dirname, '../..')
const source = yaml.load(fs.readFileSync(path.join(root, 'crosswalk/aps-acta.yaml'), 'utf8'))
const cases = [
  ['baseline', () => {}, true],
  ['missing source', d => { delete d.source_system }, false],
  ['same system', d => { d.target_system = d.source_system }, false],
  ['wrong normative status', d => { d.normative_status = 'normative' }, false],
  ['no concurrence', d => { delete d.concurrence }, false],
  ['pending source concurrence', d => { d.concurrence.aps_side.status = 'pending' }, false],
  ['pending target concurrence', d => { d.concurrence.acta_side.status = 'pending' }, false],
  ['missing boundary', d => { delete d.composition_boundary }, false],
  ['empty boundary', d => { d.composition_boundary = {} }, false],
  ['missing mappings', d => { delete d.mappings }, false],
  ['unknown match type', d => { d.mappings[0].match_type = 'unreviewed_new_type' }, false],
  ['nonobject mapping', d => { d.mappings[0] = null }, false],
]
let passed = 0
for (const [name, modify, acceptable] of cases) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pairwise-107-'))
  try {
    fs.mkdirSync(path.join(temp, 'crosswalk'))
    fs.copyFileSync(path.join(root, 'vocabulary.yaml'), path.join(temp, 'vocabulary.yaml'))
    const data = JSON.parse(JSON.stringify(source))
    modify(data)
    fs.writeFileSync(path.join(temp, 'crosswalk/aps-acta.yaml'), yaml.dump(data))
    const run = cp.spawnSync(process.execPath, [path.join(root, 'scripts/validate-crosswalks.js'), temp], { encoding: 'utf8', timeout: 20000 })
    const ok = acceptable ? run.status === 0 : run.status === 1 && run.stdout.includes('ERROR  crosswalk/aps-acta.yaml:')
    if (!ok) { console.error(`FAIL ${name}: exit=${run.status}\n${(run.stdout + run.stderr).slice(-1200)}`); process.exitCode = 1 }
    else { console.log(`PASS ${name}`); passed++ }
  } finally { fs.rmSync(temp, {recursive: true, force: true}) }
}
console.log(`pairwise_composition negative/positive cases: ${passed}/${cases.length}`)
