#!/usr/bin/env node
// test-partial-lacks.js - acceptance cases for the `lacks` field (#254).
//
// Each case writes one temporary crosswalk into crosswalk/, runs the real
// validator, and reads its exit code and output, so a case cannot pass by
// agreeing with a copy of the validator's logic.
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const CROSSWALK_DIR = path.join(ROOT, 'crosswalk')
const VALIDATOR = path.join(ROOT, 'scripts', 'validate-crosswalks.js')
const TMP = path.join(CROSSWALK_DIR, 'zz-partial-lacks-tmp.yaml')

let passed = 0
let failed = 0

function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); failed++ }
}

// The filename must not begin with an underscore, because those files are
// the repository's negative fixtures and the validator expects them to fail.
function runWith(yamlText) {
  fs.writeFileSync(TMP, yamlText, 'utf8')
  try {
    const out = execFileSync('node', [VALIDATOR], { encoding: 'utf8', cwd: ROOT })
    return { exit: 0, out }
  } catch (e) {
    return { exit: e.status === undefined ? 1 : e.status, out: `${e.stdout || ''}${e.stderr || ''}` }
  } finally {
    fs.unlinkSync(TMP)
  }
}

function doc(match, lacksLine, notes = true) {
  const notesBlock = notes ? `
    notes: |
      Temporary fixture for the lacks cases. A consumer that requires a signed
      attestation must not substitute this record. Written and deleted by
      scripts/validators/test-partial-lacks.js.` : ''
  return `system: test-partial-lacks
version: "0.0.1"
source: "https://example.invalid/spec"
signal_types:
  governance_attestation:
    canonical: governance_attestation
    internal: "unsigned sealed receipt"
    match: ${match}${lacksLine ? `\n    ${lacksLine}` : ''}${notesBlock}
`
}

const own = out => out.split('\n').filter(l => l.includes('zz-partial-lacks-tmp.yaml'))
const hasErr = (r, text) => own(r.out).some(l => l.startsWith('ERROR') && l.includes(text))
const clean = r => r.exit === 0 && !own(r.out).some(l => l.startsWith('ERROR'))

console.log('lacks on partial mappings (#254)')

let r = runWith(doc('partial', 'lacks: [signature]'))
check('1. partial with lacks and notes passes', clean(r), own(r.out).join(' | '))

r = runWith(doc('partial', null))
check('2. partial without lacks still passes (the field is optional)', clean(r), own(r.out).join(' | '))

for (const m of ['exact', 'structural', 'false_analog', 'no_mapping']) {
  r = runWith(doc(m, 'lacks: [signature]'))
  check(`3. lacks with match ${m} is an error`, r.exit !== 0 && hasErr(r, 'allowed only with match "partial"'), own(r.out).join(' | '))
}

r = runWith(doc('partial', 'lacks: []'))
check('4. an empty lacks list is an error', r.exit !== 0 && hasErr(r, 'non-empty list'), own(r.out).join(' | '))

r = runWith(doc('partial', 'lacks: signature'))
check('5. lacks given as a string, not a list, is an error', r.exit !== 0 && hasErr(r, 'non-empty list'), own(r.out).join(' | '))

r = runWith(doc('partial', 'lacks: ["  "]'))
check('6. a blank property name is an error', r.exit !== 0 && hasErr(r, 'non-empty list'), own(r.out).join(' | '))

r = runWith(doc('partial', 'lacks: [signature]', false))
check('7. lacks without notes or divergence is an error', r.exit !== 0 && hasErr(r, 'needs notes'), own(r.out).join(' | '))

r = runWith(`system: test-partial-lacks
version: "0.0.1"
source: "https://example.invalid/spec"
signal_types:
  governance_attestation:
    canonical: governance_attestation
    internal: "unsigned sealed receipt"
    match: partial
    lacks: [signature]
    notes: "   "
`)
check('8. blank notes do not satisfy the explanation rule', r.exit !== 0 && hasErr(r, 'needs notes'), own(r.out).join(' | '))

r = runWith(`system: test-partial-lacks
version: "0.0.1"
source: "https://example.invalid/spec"
signal_types:
  governance_attestation:
    canonical: governance_attestation
    internal: "unsigned sealed receipt"
    match: partial
    lacks: [signature]
    divergences: []
`)
check('9. an empty divergences list does not satisfy the explanation rule', r.exit !== 0 && hasErr(r, 'needs notes'), own(r.out).join(' | '))

function alt(match, lacks) {
  return `system: test-partial-lacks
mappings:
  - canonical: governance_attestation
    internal: "unsigned sealed receipt"
    match: ${match}
    lacks: ${lacks}
    notes: "A consumer that requires a signed attestation must not substitute this record."
`
}
r = runWith(alt('partial', '[signature]'))
check('10. an alternative-format partial row with lacks passes', clean(r), own(r.out).join(' | '))
r = runWith(alt('exact', '[signature]'))
check('11. an alternative-format exact row with lacks is an error', r.exit !== 0 && hasErr(r, 'allowed only with match "partial"'), own(r.out).join(' | '))
r = runWith(alt('partial', '[]'))
check('12. an alternative-format row with an empty lacks list is an error', r.exit !== 0 && hasErr(r, 'non-empty list'), own(r.out).join(' | '))

r = runWith(doc('partial', 'lacks: ["sig|nature"]'))
check('13. a property name with a table-breaking character is an error', r.exit !== 0 && hasErr(r, 'non-empty list'), own(r.out).join(' | '))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
