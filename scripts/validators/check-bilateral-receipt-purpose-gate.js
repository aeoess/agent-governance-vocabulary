#!/usr/bin/env node
// check-bilateral-receipt-purpose-gate.js
// Executable regression contract for the bilateral_receipt purpose gate (#81,
// shipped in #139): the obligation to declare a registered `purpose` is keyed to
// MATCH STRENGTH, not to the act of mapping.
//
// Usage: node scripts/validators/check-bilateral-receipt-purpose-gate.js [data-root]
// Exit 0 = all cases behaved as contracted; exit 1 = any deviation.
//
// TWO ROOTS, AND THE DISTINCTION IS THE WHOLE POINT.
//   DATA_ROOT  supplied argument, or this checkout. Source of cases.json and of
//              the vocabulary.yaml whose enum the cases are graded against.
//   SELF_ROOT  always this checker's own checkout. Source of the
//              validate-crosswalks.js that is executed, and of node_modules.
//
// NOT YET WIRED INTO CI, deliberately. This commit lands the checker and its
// cases and runs them in the ordinary `npm test` job, which uses the pull
// request's own copy of everything. The trusted-oracle invocation is a separate
// follow-up, because the trusted job checks out the BASE branch, and a commit
// that both introduces this file and invokes it from the base checkout would
// fail: the base does not contain it yet. The repository hit exactly that in
// 6d577d9 and solved it with a temporary existence guard, later removed in
// favour of failing loudly. Splitting the two avoids shipping a skip path that
// somebody then has to remember to delete.
//
// WHAT THE FOLLOW-UP WILL DO, and what this file is already built for: the
// trusted CI job checks out the base branch at `trusted/` and the pull request
// at `pr-data/`, then runs the BASE copy of this script against PR data.
//
// WHAT THAT DOES AND DOES NOT BUY, stated exactly, because the obvious sentence
// is too strong. It means the CODE doing the grading (this checker and the
// validator it calls) is the base branch's, so a pull request cannot weaken the
// gate by editing the validator or this file in the same commit that changes
// the case data. It does NOT make the gate hostile-PR proof: `pull_request`
// workflows run the workflow definition from the pull request, so a hostile
// change could edit .github/workflows/validate.yml and drop this step
// altogether. Closing that requires making the workflow itself authoritative
// from outside the repository, through a required org or enterprise ruleset
// workflow, which is a governance change and not something this file can claim.
// `pull_request_target` is not adopted here. It is not unusable in principle,
// but making the workflow definition base-owned that way needs its own threat
// model: the trigger runs with elevated permissions, so it is only safe if the
// executable code stays base-owned and pull request bytes are handled strictly
// as data. Switching triggers without proving that is how privilege escalation
// happens.
//
// An earlier version of this checker resolved the validator from
// the supplied data root, which inverted that property exactly: the base-owned
// checker would have executed the PR-OWNED validator, handing the pull request
// the one thing the job exists to withhold. It also could not have worked, since
// `npm ci` runs only in `trusted/` and a validator executed from `pr-data/` has
// no node_modules.
//
// EXPECTED FAILURES PIN A DIAGNOSTIC CLASS, NEVER A BARE FAIL.
// The first version of this pack counted an expected-FAIL case as correct
// whenever ANY error mentioned the fixture file. Under mutation, deleting the
// exact/structural purpose requirement while adding an unrelated always-firing
// rule produced two green checkmarks over a gate that had been regressed. A
// regression test that passes for the wrong reason converts absence of coverage
// into a green signal. Each expected-FAIL case therefore names the class of
// diagnostic the validator must emit, and must emit no unexpected extra error.
//
// THE CONTRACT LIVES HERE, NOT IN fixtures/. A manifest under fixtures/ would be
// editable by the same pull request this job gates. Same reasoning as
// check-handoff-decay-fixtures.js.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const SELF_ROOT = path.resolve(__dirname, '..', '..')
const DATA_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : SELF_ROOT

const VALIDATOR = path.join(SELF_ROOT, 'scripts', 'validate-crosswalks.js')
const CASES_PATH = path.join(DATA_ROOT, 'fixtures', 'bilateral-receipt-purpose-gate', 'cases.json')
const VOCAB_SRC = path.join(DATA_ROOT, 'vocabulary.yaml')

// Diagnostic classes, matched against the validator's own message text. Each
// pattern is anchored on wording the shipped validator emits for exactly one
// condition, so two different defects cannot satisfy the same class.
const DIAGNOSTICS = {
  MISSING_PURPOSE: /requires a `purpose` declaring the registered value\(s\)/,
  UNREGISTERED_PURPOSE: /not in registered bilateral_receipt purposes/,
  NO_MAPPING_WITH_PURPOSE: /must not declare a `purpose`/,
}

// Cases that MUST be present, and the FULL semantic input each must carry.
//
// Pinning only id -> expected outcome is not enough, and that was a real hole:
// the case DATA is supplied by the pull request, so a case could keep its id
// and its PASS expectation while its `match` changed from false_analog to
// partial, or case 11 could stop being an array case. The base-owned checker
// would still have called the contract satisfied while testing something else
// entirely, which defeats the reason the contract lives in base-owned code.
//
// So each entry pins match, purpose and the expected outcome exactly. A pull
// request may add cases; it cannot silently repurpose a required one.
const REQUIRED_CASES = {
  '01-exact-with-purpose':        { match: 'exact',        purpose: 'delegation_revocation',  expect: 'PASS' },
  '02-structural-with-purpose':   { match: 'structural',   purpose: 'delegation_revocation',  expect: 'PASS' },
  '03-partial-without-purpose':   { match: 'partial',      purpose: null,                     expect: 'PASS' },
  '04-partial-with-purpose':      { match: 'partial',      purpose: 'delegation_revocation',  expect: 'PASS' },
  '05-exact-no-purpose':          { match: 'exact',        purpose: null,                     expect: 'FAIL', diagnostic: 'MISSING_PURPOSE' },
  '06-structural-no-purpose':     { match: 'structural',   purpose: null,                     expect: 'FAIL', diagnostic: 'MISSING_PURPOSE' },
  '07-no-mapping-without-purpose':{ match: 'no_mapping',   purpose: null,                     expect: 'PASS' },
  '08-no-mapping-with-purpose':   { match: 'no_mapping',   purpose: 'delegation_revocation',  expect: 'FAIL', diagnostic: 'NO_MAPPING_WITH_PURPOSE' },
  '09-exact-unregistered-purpose':{ match: 'exact',        purpose: 'not_a_registered_purpose', expect: 'FAIL', diagnostic: 'UNREGISTERED_PURPOSE' },
  // The branch the pack's prose claimed and never tested. Pinned to the
  // canonical token: if a future edit swaps it for the deprecated alias or for
  // `partial`, this case stops testing what it exists to test.
  '10-false-analog-no-purpose':   { match: 'false_analog', purpose: null,                     expect: 'PASS' },
  '11-exact-purpose-array-valid': { match: 'exact',        purpose: ['delegation_revocation', 'covenant_binding'], expect: 'PASS' },
  '12-exact-purpose-array-mixed': { match: 'exact',        purpose: ['delegation_revocation', 'not_a_registered_purpose'], expect: 'FAIL', diagnostic: 'UNREGISTERED_PURPOSE' },
}

// Structural equality for the pinned fields. Arrays compare element by element
// and in order, so an array case cannot become a scalar one, or reorder into a
// different assertion, without failing.
function samePurpose(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  const na = (a === undefined) ? null : a
  const nb = (b === undefined) ? null : b
  return na === nb
}

function show(v) { return Array.isArray(v) ? `[${v.join(', ')}]` : String(v) }

let passed = 0
let failed = 0
function ok(name) { console.log(`  ✓ ${name}`); passed++ }
function bad(name, detail) { console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); failed++ }

function yamlScalar(v) {
  if (Array.isArray(v)) return `[${v.map(x => JSON.stringify(x)).join(', ')}]`
  return JSON.stringify(v)
}

// Render one case as a minimal standard-format crosswalk.
function caseDoc(c) {
  const purposeLine = (c.purpose === null || c.purpose === undefined)
    ? ''
    : `\n    purpose: ${yamlScalar(c.purpose)}`
  return `system: purpose-gate-case-${c.id}
version: "0.0.1"
source: "https://example.invalid/purpose-gate-fixture"
signal_types:
  bilateral_receipt:
    canonical: bilateral_receipt
    internal: "fixture row"
    match: ${c.match}${purposeLine}
    notes: |
      Generated from fixtures/bilateral-receipt-purpose-gate/cases.json by
      scripts/validators/check-bilateral-receipt-purpose-gate.js. Not authored
      content; do not copy into crosswalk/.
`
}

// Run the SELF_ROOT validator over a throwaway tree holding DATA_ROOT's
// vocabulary and exactly one rendered case.
function runCase(c, vocabText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purpose-gate-'))
  try {
    fs.mkdirSync(path.join(dir, 'crosswalk'))
    fs.writeFileSync(path.join(dir, 'vocabulary.yaml'), vocabText, 'utf8')
    fs.writeFileSync(path.join(dir, 'crosswalk', `case-${c.id}.yaml`), caseDoc(c), 'utf8')
    let out, exit
    try {
      out = execFileSync('node', [VALIDATOR, dir], { encoding: 'utf8', cwd: SELF_ROOT })
      exit = 0
    } catch (e) {
      out = `${e.stdout || ''}${e.stderr || ''}`
      exit = e.status === undefined ? 1 : e.status
    }
    const errorLines = out.split('\n').filter(l => l.startsWith('ERROR'))
    return { exit, out, errorLines }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
    }
}

function main() {
  console.log('\n# bilateral_receipt purpose gate: executable regression contract\n')
  console.log(`  data root: ${DATA_ROOT}`)
  console.log(`  checker and validator: ${SELF_ROOT}\n`)

  if (!fs.existsSync(CASES_PATH)) {
    console.log(`  ✗ cases.json not found at ${CASES_PATH}`)
    process.exit(1)
  }
  const doc = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'))
  const vocabText = fs.readFileSync(VOCAB_SRC, 'utf8')
  const byId = new Map((doc.cases || []).map(c => [c.id, c]))

  // Contract first: the required set must be present and must contract for the
  // outcome this file states, before any case is executed.
  for (const [id, want] of Object.entries(REQUIRED_CASES)) {
    const c = byId.get(id)
    if (!c) { bad(`contract: case ${id} is present`); continue }
    const problems = []
    if (c.match !== want.match) problems.push(`match is "${c.match}", contract requires "${want.match}"`)
    if (!samePurpose(c.purpose, want.purpose)) {
      problems.push(`purpose is ${show(c.purpose === undefined ? null : c.purpose)}, contract requires ${show(want.purpose)}`)
    }
    if (c.expect !== want.expect) problems.push(`expect is "${c.expect}", contract requires "${want.expect}"`)
    const wantDiag = want.diagnostic || null
    const gotDiag = c.diagnostic || null
    if (wantDiag !== gotDiag) problems.push(`diagnostic is ${gotDiag}, contract requires ${wantDiag}`)
    if (problems.length) bad(`contract: ${id}`, problems.join('\n      '))
    else ok(`contract: ${id} carries the pinned input and outcome`)
  }
  const extra = [...byId.keys()].filter(id => !(id in REQUIRED_CASES))
  if (extra.length) {
    console.log(`  note: ${extra.length} case(s) beyond the required set: ${extra.join(', ')}`)
  }

  // Then behaviour.
  for (const c of doc.cases || []) {
    const r = runCase(c, vocabText)
    if (c.expect === 'PASS') {
      if (r.exit === 0 && r.errorLines.length === 0) ok(`${c.id} -> PASS`)
      else bad(`${c.id} -> PASS`, r.errorLines.join('\n      ') || `exit ${r.exit}`)
      continue
    }
    const pattern = DIAGNOSTICS[c.diagnostic]
    if (!pattern) { bad(`${c.id} -> FAIL`, `unknown diagnostic class "${c.diagnostic}"`); continue }
    const matching = r.errorLines.filter(l => pattern.test(l))
    const unexpected = r.errorLines.filter(l => !pattern.test(l))
    if (r.exit === 0) {
      bad(`${c.id} -> FAIL:${c.diagnostic}`, 'validator accepted the document')
    } else if (matching.length === 0) {
      bad(`${c.id} -> FAIL:${c.diagnostic}`,
        `failed, but not for the contracted reason:\n      ${r.errorLines.join('\n      ')}`)
    } else if (unexpected.length > 0) {
      bad(`${c.id} -> FAIL:${c.diagnostic}`,
        `contracted diagnostic present, but unexpected additional error(s):\n      ${unexpected.join('\n      ')}`)
    } else {
      ok(`${c.id} -> FAIL:${c.diagnostic}`)
    }
  }

  console.log(`\n---\n${passed} passed, ${failed} failed\n`)
  process.exit(failed === 0 ? 0 : 1)
}

main()
