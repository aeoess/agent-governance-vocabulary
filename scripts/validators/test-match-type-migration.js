#!/usr/bin/env node
// test-match-type-migration.js - executable acceptance criteria for issue #153.
//
// Each case below is one of the seven criteria written into the issue, run
// against the real validator by writing a temporary crosswalk into crosswalk/
// and reading the validator's own exit code and output. Nothing here restates
// the validator's logic, so a case cannot pass by agreeing with a copy of the
// implementation.
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const CROSSWALK_DIR = path.join(ROOT, 'crosswalk')
const VALIDATOR = path.join(ROOT, 'scripts', 'validate-crosswalks.js')

let passed = 0
let failed = 0

function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); failed++ }
}

// Run the real validator with one temporary crosswalk present.
// The filename must NOT begin with an underscore: files matching that pattern
// are the repository's NEGATIVE fixtures, which the validator asserts must
// fail. Using one here inverts every result, because a well-formed document
// then trips "expected to FAIL validation but produced 0 errors".
function runWith(yamlText) {
  const file = path.join(CROSSWALK_DIR, 'zz-match-migration-tmp.yaml')
  fs.writeFileSync(file, yamlText, 'utf8')
  try {
    const out = execFileSync('node', [VALIDATOR], { encoding: 'utf8', cwd: ROOT })
    return { exit: 0, out }
  } catch (e) {
    return { exit: e.status === undefined ? 1 : e.status, out: `${e.stdout || ''}${e.stderr || ''}` }
  } finally {
    fs.unlinkSync(file)
  }
}

// A minimal standard-format crosswalk. `match` is substituted per case.
// governance_attestation is used for the plain match cases because it carries
// no purpose obligation; bilateral_receipt is used for the gate cases.
function doc(match, { canonical = 'governance_attestation', purpose = null } = {}) {
  const purposeLine = purpose === null ? '' : `\n    purpose: ${purpose}`
  return `system: test-match-migration
version: "0.0.1"
source: "https://example.invalid/spec"
signal_types:
  ${canonical}:
    canonical: ${canonical}
    internal: "test row"
    match: ${match}${purposeLine}
    notes: |
      Temporary fixture for the issue #153 acceptance criteria. Written and
      deleted by scripts/validators/test-match-type-migration.js.
`
}

const LEGACY = 'non_equivalent_similar_label'
const CANON = 'false_analog'

console.log('\n# issue #153 acceptance criteria: match-type migration\n')

// 1. Canonical token accepted, and silent about deprecation.
{
  const r = runWith(doc(CANON))
  check('1. `false_analog` is accepted', r.exit === 0, `exit ${r.exit}`)
  check('1. `false_analog` raises no deprecation warning',
    !/deprecated spelling/.test(r.out))
}

// 2. Legacy token accepted, warned, and normalized.
{
  const r = runWith(doc(LEGACY))
  check('2. legacy alias is accepted (does not fail the build)', r.exit === 0, `exit ${r.exit}`)
  // The warning must quote the RAW spelling as authored and the CANONICAL one
  // as the replacement. Asserting only the canonical half passes even when
  // preservation of the raw token has been removed, because the message then
  // degenerates into naming false_analog as its own predecessor.
  check('2. the warning quotes the authored spelling AND the canonical one',
    new RegExp(`match "${LEGACY}" is a deprecated spelling of "${CANON}"`).test(r.out),
    r.out.split('\n').filter(l => /deprecated spelling/.test(l)).join(' | ') || '(no deprecation line)')
  check('2. legacy alias is NOT reported as an unknown enum member',
    !/not in crosswalk_match_types/.test(r.out))
}

// 2b. The alias must NOT be a member of the canonical enum. Two live spellings
//     for one concept is the drift the ruling exists to prevent, and an alias
//     promoted to a real member would satisfy every other case here silently.
{
  const r = runWith(doc(CANON))
  const line = (r.out.match(/^ {2}match types:.*$/m) || [''])[0]
  check('2b. the validator reports the canonical token as a match type',
    line.includes(CANON), line)
  check('2b. the validator does NOT report the alias as a match type',
    line.length > 0 && !line.includes(LEGACY), line)
  const vocabText = fs.readFileSync(path.join(ROOT, 'vocabulary.yaml'), 'utf8')
  const block = vocabText.split('crosswalk_match_types:')[1] || ''
  const enumBlock = block.split(/^\S/m)[0]
  check('2b. crosswalk_match_types contains no alias member',
    !enumBlock.includes(LEGACY), 'alias appears inside the canonical enum block')
}

// 2c. ONE ALIAS AUTHORITY, and it is vocabulary.yaml. The implementation holds
//     no semantic table, so there is no second map to drift from. What is
//     asserted instead is that the declared map is well formed and that the
//     module refuses to normalize without being given it.
{
  const yaml = require('js-yaml')
  const mt = require(path.join(ROOT, 'scripts', 'match-types.js'))
  const vocab = yaml.load(fs.readFileSync(path.join(ROOT, 'vocabulary.yaml'), 'utf8'))

  check('2c. the implementation exports no hardcoded alias table',
    !('MATCH_ALIASES' in mt),
    'a second table would make this a mirrored invariant, not one authority')

  const declared = mt.aliasesFromVocab(vocab)
  check('2c. vocabulary declares the alias map', Object.keys(declared).length > 0)
  check(`2c. the declared alias resolves ${LEGACY} to ${CANON}`,
    declared[LEGACY] === CANON, JSON.stringify(declared))

  // Normalizing without the map must fail loudly rather than fall back.
  let threw = false
  try { mt.normalizeMatch(LEGACY) } catch { threw = true }
  check('2c. normalizeMatch refuses to run without the declared map', threw)
  threw = false
  try { mt.normalizeDoc({ signal_types: {} }) } catch { threw = true }
  check('2c. normalizeDoc refuses to run without the declared map', threw)

  // Structural validation of the declaration itself.
  const canonTypes = { exact: {}, structural: {}, partial: {}, false_analog: {}, no_mapping: {} }
  const rejects = [
    ['an alias pointing at itself', { false_analog: 'false_analog' }],
    ['an alias whose target is not canonical', { old_name: 'not_a_match_type' }],
    ['an alias key that is also a canonical member', { partial: 'false_analog' }],
    ['a non-string target', { old_name: 42 }],
    ['a non-mapping declaration', ['not', 'a', 'map']],
  ]
  for (const [label, bad] of rejects) {
    let rejected = false
    try {
      mt.aliasesFromVocab({ crosswalk_match_types: canonTypes, crosswalk_match_type_aliases: bad })
    } catch { rejected = true }
    check(`2c. the declaration rejects ${label}`, rejected)
  }
  // Absent map is legal: it means the deprecation is over.
  let ok2 = false
  try { ok2 = Object.keys(mt.aliasesFromVocab({ crosswalk_match_types: canonTypes })).length === 0 } catch { ok2 = false }
  check('2c. an absent alias map is legal and yields no aliases', ok2)
}

// 3. An unknown sixth token still fails. Normalization must not swallow it.
{
  const r = runWith(doc('nearly_equivalent'))
  check('3. an unknown sixth token still fails the build', r.exit !== 0, `exit ${r.exit}`)
  check('3. it fails as an enum violation',
    /match "nearly_equivalent" not in crosswalk_match_types/.test(r.out))
}

// 4. The bilateral_receipt purpose gate behaves identically under both
//    spellings. This is the criterion that would break if any semantic
//    consumer read the raw token instead of the normalized one.
{
  const canonNoPurpose = runWith(doc(CANON, { canonical: 'bilateral_receipt' }))
  const legacyNoPurpose = runWith(doc(LEGACY, { canonical: 'bilateral_receipt' }))
  check('4. gate: canonical token may omit `purpose`', canonNoPurpose.exit === 0,
    `exit ${canonNoPurpose.exit}`)
  check('4. gate: alias behaves identically to canonical when purpose is omitted',
    canonNoPurpose.exit === legacyNoPurpose.exit)

  const canonBadPurpose = runWith(doc(CANON, { canonical: 'bilateral_receipt', purpose: 'not_a_registered_purpose' }))
  const legacyBadPurpose = runWith(doc(LEGACY, { canonical: 'bilateral_receipt', purpose: 'not_a_registered_purpose' }))
  check('4. gate: an unregistered purpose is rejected under the canonical token',
    canonBadPurpose.exit !== 0, `exit ${canonBadPurpose.exit}`)
  check('4. gate: alias behaves identically to canonical on an unregistered purpose',
    canonBadPurpose.exit === legacyBadPurpose.exit)
}

// 5. Generated and public output never emits the deprecated spelling.
{
  const matrix = path.join(ROOT, 'docs', 'generated', 'crosswalk-matrix.md')
  const text = fs.existsSync(matrix) ? fs.readFileSync(matrix, 'utf8') : ''
  check('5. the generated matrix does not contain the deprecated spelling',
    text.length > 0 && !text.includes(LEGACY))
  check('5. the generated matrix names the canonical token', text.includes(CANON))
}

// 6 and 7. The deprecated spelling survives in authored surfaces only where it
// documents the alias. Anywhere else it is migration debt that was missed.
{
  const allowed = new Set([
    'vocabulary.yaml',                              // the alias declaration block
    path.join('scripts', 'match-types.js'),         // the alias implementation
    path.join('scripts', 'validators', 'test-match-type-migration.js'), // this file
  ])
  const offenders = []
  const skipDirs = new Set(['.git', 'node_modules'])
  ;(function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      if (skipDirs.has(name)) continue
      const full = path.join(dir, name)
      const st = fs.statSync(full)
      if (st.isDirectory()) { walk(full); continue }
      if (!/\.(ya?ml|md|js|json)$/.test(name)) continue
      let text
      try { text = fs.readFileSync(full, 'utf8') } catch { continue }
      if (!text.includes(LEGACY)) continue
      const rel = path.relative(ROOT, full)
      if (!allowed.has(rel)) offenders.push(rel)
    }
  })(ROOT)
  check('6/7. deprecated spelling remains only in alias documentation and tests',
    offenders.length === 0, offenders.length ? `still present in: ${offenders.join(', ')}` : '')
}

console.log(`\n---\n${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
