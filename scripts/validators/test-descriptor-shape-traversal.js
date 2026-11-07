#!/usr/bin/env node
// test-descriptor-shape-traversal.js — executable acceptance criteria for #145.
//
// #145 was not a wrong-answer bug. The validator reported PASS while never
// reading a third of the corpus: validateDescriptors assumed the nested
// per-signal shape and used `typeof dimBlock !== 'object'` as a skip guard,
// which matches every entry of a flat block. Nothing failed when the traversal
// stopped early, which is why the gap survived from v0.1.
//
// So the property under test is not "the validator rejects a bad value." It is
// "the validator READ the value at all." Each case below plants a known
// out-of-enum value in one shape and asserts the validator both fails AND names
// that value on that path. A case cannot pass by the validator failing for some
// unrelated reason.
//
// Written in the style of test-match-type-migration.js: a temporary crosswalk
// is written into crosswalk/, the real validator is executed, and its own exit
// code and stdout are the assertions. Nothing here restates validator logic, so
// no case can pass by agreeing with a copy of the implementation.
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const CROSSWALK_DIR = path.join(ROOT, 'crosswalk')
const VALIDATOR = path.join(ROOT, 'scripts', 'validate-crosswalks.js')

// A value that is not in the refusal_authority enum and is not whitelisted in
// scripts/legacy-descriptor-overrides.yaml for this temporary file. If this
// ever becomes canonical, these cases must be updated rather than deleted.
const BAD = 'zz_not_a_real_refusal_authority'

let passed = 0
let failed = 0

function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); failed++ }
}

// Run the real validator with one temporary crosswalk present.
// The filename must NOT begin with an underscore: those are the repository's
// negative fixtures, which the validator asserts must fail, inverting results.
function runWith(yamlText) {
  const file = path.join(CROSSWALK_DIR, 'zz-descriptor-shape-tmp.yaml')
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

const FIXTURE_NAME = 'zz-descriptor-shape-tmp.yaml'

// Assert on a diagnostic line belonging to THIS fixture. Matching bare
// substrings against whole-run output lets an unrelated file's line satisfy the
// assertion — scripts/legacy-descriptor-overrides.yaml makes the validator
// print `descriptor_dimensions.refusal_authority` for crosswalk/nobulex.yaml on
// every run, which silently satisfied the flat-path check even on a validator
// that never read the fixture.
function fixtureLines(out) {
  return out.split('\n').filter(l => l.includes(FIXTURE_NAME))
}
function fixtureLineHas(out, needle) {
  return fixtureLines(out).some(l => l.includes(needle))
}

const HEAD = `system:
  name: zz-descriptor-shape-tmp
  repo: "https://example.invalid/repo"
version: "0.0.1"
source: "https://example.invalid/spec"
signal_types:
  governance_attestation:
    canonical: governance_attestation
    internal: "test row"
    match: exact
    notes: |
      Temporary fixture for the issue #145 acceptance criteria. Written and
      deleted by scripts/validators/test-descriptor-shape-traversal.js.
`

// Flat: { dimension: value } at the top level. This is the shape that was
// skipped entirely before #145 — thirteen production files use it.
const FLAT = `${HEAD}descriptor_dimensions:
  refusal_authority: ${BAD}
`

// Nested: { signal_key: { dimension: value } }. This shape was already walked;
// the case exists so a future change cannot fix flat by breaking nested.
const NESTED = `${HEAD}descriptor_dimensions:
  governance_attestation:
    refusal_authority: ${BAD}
`

// Mixed: both in one block. Per the #145 discussion this is its own error
// rather than a guess, because validating half of it under either reading
// reproduces the original defect.
const MIXED = `${HEAD}descriptor_dimensions:
  refusal_authority: ${BAD}
  governance_attestation:
    refusal_authority: issuer
`

// Nested with a sibling prose annotation. `*_notes` keys are scalars and must
// not make an annotated nested block classify as mixed.
const NESTED_WITH_NOTES = `${HEAD}descriptor_dimensions:
  governance_attestation:
    refusal_authority: ${BAD}
  refusal_authority_notes: |
    Prose annotation sitting beside a per-signal block.
`

// A clean flat block. Guards against the opposite failure: a traversal fix that
// lights up the corpus by rejecting values that are in fact canonical.
const FLAT_CLEAN = `${HEAD}descriptor_dimensions:
  refusal_authority: issuer
`

console.log('\nIssue #145 — descriptor_dimensions shape traversal\n')

// 1. Flat block is read. The regression that started this.
{
  const r = runWith(FLAT)
  check('flat shape: validator exits non-zero', r.exit !== 0, `exit=${r.exit}`)
  check('flat shape: the planted value is named on this fixture\'s own line',
    fixtureLineHas(r.out, BAD),
    'validator failed but never named the value against this fixture — it may have failed for an unrelated reason')
  check('flat shape: reported at the flat dotted path',
    fixtureLineHas(r.out, 'descriptor_dimensions.refusal_authority'),
    'path not reported as descriptor_dimensions.refusal_authority on this fixture')
}

// 2. Nested block still read.
{
  const r = runWith(NESTED)
  check('nested shape: validator exits non-zero', r.exit !== 0, `exit=${r.exit}`)
  check('nested shape: the planted value is named on this fixture\'s own line',
    fixtureLineHas(r.out, BAD))
  check('nested shape: reported at the per-signal dotted path',
    fixtureLineHas(r.out, 'descriptor_dimensions.governance_attestation.refusal_authority'))
}

// 3. Mixed block is an error in its own right.
{
  const r = runWith(MIXED)
  check('mixed shape: validator exits non-zero', r.exit !== 0, `exit=${r.exit}`)
  check('mixed shape: reported as a mixed-shape error rather than guessed at',
    fixtureLineHas(r.out, 'mixed shape'),
    'no mixed-shape diagnostic; the block may have been silently validated under one reading')
}

// 4. A prose annotation does not reclassify a nested block.
{
  const r = runWith(NESTED_WITH_NOTES)
  check('nested + *_notes: not misreported as mixed',
    !fixtureLineHas(r.out, 'mixed shape'),
    'a _notes scalar made an annotated nested block classify as mixed')
  check('nested + *_notes: the planted value is still read', fixtureLineHas(r.out, BAD))
}

// 5. Clean flat block passes. The fix must not light up the corpus.
{
  const r = runWith(FLAT_CLEAN)
  check('clean flat shape: validator exits 0', r.exit === 0, `exit=${r.exit}`)
  check('clean flat shape: no diagnostic naming this fixture\'s descriptor block',
    !fixtureLineHas(r.out, 'descriptor_dimensions'),
    'a canonical value in a flat block was rejected')
}

// 6. An unknown dimension name is reported, not skipped. A misspelling such as
// `replay_clas` used to pass with no diagnostic because nothing read it.
{
  const r = runWith(`${HEAD}descriptor_dimensions:
  replay_clas: decision_replay
`)
  check('unknown dimension: reported on this fixture\'s own line',
    fixtureLineHas(r.out, 'descriptor_dimensions.replay_clas'),
    'an unknown dimension name passed with no diagnostic')
  check('unknown dimension: validator exits non-zero', r.exit !== 0, `exit=${r.exit}`)
  check('unknown dimension: reported as an error, not a warning',
    fixtureLines(r.out).some(l => l.includes('replay_clas') && !/^\s*WARN/.test(l)),
    'the unknown dimension was reported only as a warning')
}

// 7. Note keys are prose and stay silent, in both shapes.
{
  const nested = runWith(`${HEAD}descriptor_dimensions:
  governance_attestation:
    refusal_authority: issuer
    note_refusal: |
      Prose beside a value.
    notes: |
      More prose.
`)
  check('note keys, nested: validator exits 0', nested.exit === 0, `exit=${nested.exit}`)
  check('note keys, nested: no diagnostic naming this fixture\'s descriptor block',
    !fixtureLineHas(nested.out, 'descriptor_dimensions'),
    'a note_* or notes key was reported as an unknown dimension')
  const flat = runWith(`${HEAD}descriptor_dimensions:
  refusal_authority: issuer
  note_refusal: Prose beside a value.
`)
  check('note keys, flat: validator exits 0', flat.exit === 0, `exit=${flat.exit}`)
  check('note keys, flat: no diagnostic naming this fixture\'s descriptor block',
    !fixtureLineHas(flat.out, 'descriptor_dimensions'),
    'a note_* key in a flat block was reported as an unknown dimension')
}

// 8. A misspelled dimension inside a per-signal block is reported at its full
// nested path, so a later traversal change cannot drop nested blocks silently.
{
  const r = runWith(`${HEAD}descriptor_dimensions:
  governance_attestation:
    replay_clas: decision_replay
`)
  check('nested unknown dimension: validator exits non-zero', r.exit !== 0, `exit=${r.exit}`)
  check('nested unknown dimension: reported at the full nested path',
    fixtureLineHas(r.out, 'descriptor_dimensions.governance_attestation.replay_clas'))
}

// 9. Accepted prose shapes: bare `note`, and the short-form `<dimension>_notes`
// that merged crosswalks use (replay_notes for replay_class).
{
  const r = runWith(`${HEAD}descriptor_dimensions:
  replay_class: decision_replay
  note: Prose.
  replay_notes: Prose about replay.
  replay_class_notes: More prose.
`)
  check('accepted prose shapes: validator exits 0', r.exit === 0, `exit=${r.exit}`)
  check('accepted prose shapes: no diagnostic naming this fixture\'s descriptor block',
    !fixtureLineHas(r.out, 'descriptor_dimensions'))
}

// 10. Prose keys that hide a mistake are errors.
const rejects = [
  ['a note holding a list', `  notes:\n    - a\n    - b\n`, 'descriptor_dimensions.notes'],
  ['a note holding an object', `  note_enforcement:\n    rule: strict\n`, 'descriptor_dimensions.note_enforcement'],
  ['a _notes key whose prefix is no dimension', `  replay_clas_notes: Prose.\n`, 'descriptor_dimensions.replay_clas_notes'],
  ['a note holding a descriptor value', `  replay_class_notes: decision_replay\n`, 'descriptor_dimensions.replay_class_notes'],
  ['a numeric descriptor value', `  replay_class: 3\n`, 'descriptor_dimensions.replay_class'],
  ['an object descriptor value', `  replay_class:\n    level: decision_replay\n`, 'descriptor_dimensions.replay_class'],
  ['a list holding a non-string value', `  governed_action_class:\n    - write\n    - 7\n`, 'descriptor_dimensions.governed_action_class'],
]
for (const [name, body, where] of rejects) {
  const r = runWith(`${HEAD}descriptor_dimensions:\n${body}`)
  check(`${name}: validator exits non-zero`, r.exit !== 0, `exit=${r.exit}`)
  check(`${name}: reported at ${where}`, fixtureLineHas(r.out, where))
}

// 11. Prose keys beside per-signal blocks: accepted when they are prose, and
// checked like any other note rather than skipped by the nested walk.
{
  const ok = runWith(`${HEAD}descriptor_dimensions:
  governance_attestation:
    refusal_authority: issuer
  notes: Prose beside the per-signal blocks.
`)
  check('top-level prose beside nested blocks: validator exits 0', ok.exit === 0, `exit=${ok.exit}`)
  check('top-level prose beside nested blocks: not reported as mixed shape', !fixtureLineHas(ok.out, 'mixed shape'))
  const bad = runWith(`${HEAD}descriptor_dimensions:
  governance_attestation:
    refusal_authority: issuer
  refusal_authority_notes: issuer
`)
  check('top-level note holding a value beside nested blocks: validator exits non-zero', bad.exit !== 0, `exit=${bad.exit}`)
  check('top-level note holding a value beside nested blocks: reported at its path',
    fixtureLineHas(bad.out, 'descriptor_dimensions.refusal_authority_notes'))
}

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
