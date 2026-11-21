#!/usr/bin/env node
// test-record-profiles.js - acceptance cases for the proposed record_profiles
// list (#253, #256). Each case writes one temporary crosswalk into crosswalk/,
// runs the real validator, and reads its exit code and output, so a case
// cannot pass by agreeing with a copy of the validator's logic.
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const VALIDATOR = path.join(ROOT, 'scripts', 'validate-crosswalks.js')
const TMP = path.join(ROOT, 'crosswalk', 'zz-record-profiles-tmp.yaml')

let passed = 0
let failed = 0
function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); failed++ }
}

// Not an underscore name, because those are negative fixtures that must fail.
function runWith(yamlText) {
  fs.writeFileSync(TMP, yamlText, 'utf8')
  try {
    return { exit: 0, out: execFileSync('node', [VALIDATOR], { encoding: 'utf8', cwd: ROOT }) }
  } catch (e) {
    return { exit: e.status === undefined ? 1 : e.status, out: `${e.stdout || ''}${e.stderr || ''}` }
  } finally {
    fs.unlinkSync(TMP)
  }
}

function doc(extra) {
  return `system: test-record-profiles
version: "0.0.1"
source: "https://example.invalid/spec"
signal_types:
  governance_attestation:
    canonical: governance_attestation
    internal: "test row"
    match: no_mapping
    notes: "Temporary fixture written and deleted by test-record-profiles.js."
${extra}`
}

const own = r => r.out.split('\n').filter(l => l.includes('zz-record-profiles-tmp.yaml'))
const hasErr = (r, text) => own(r).some(l => l.startsWith('ERROR') && l.includes(text))
const hasWarn = (r, text) => own(r).some(l => l.startsWith('WARN') && l.includes(text))
const clean = r => r.exit === 0 && !own(r).some(l => l.startsWith('ERROR'))
const show = r => own(r).join(' | ') || r.out.split('\n').slice(-3).join(' | ')

console.log('record_profiles (#253, #256)')

let r = runWith(doc(`system_attributes:
  signature_capability: composite
  hash_family: sha-256
record_profiles:
  - record_type: slip
    signature_capability: classical
  - record_type: approval
    signature_capability: classical
`))
check('1. a summary with two record_type entries passes', clean(r), show(r))

r = runWith(doc(`system_attributes:
  canonicalization_profile: jcs-rfc-8785
record_profiles:
  - format_version: "1"
    canonicalization_profile: implementation-defined
`))
check('2. a format_version entry passes', clean(r), show(r))

r = runWith(doc(`system_attributes:
  signature_capability: classical
record_profiles: []
`))
check('3. an empty list passes (every record has the system values)', clean(r), show(r))

r = runWith(doc(`record_profiles:
  - record_type: slip
    signature_capability: classical
`))
check('4. entries without system_attributes pass', clean(r), show(r))

r = runWith(doc(`record_profiles:
  record_type: slip
`))
check('5. record_profiles that is not a list is an error', r.exit !== 0 && hasErr(r, 'must be a list'), show(r))

r = runWith(doc(`record_profiles:
  - signature_capability: classical
`))
check('6. an entry with no selector is an error', r.exit !== 0 && hasErr(r, 'exactly one of'), show(r))

r = runWith(doc(`record_profiles:
  - record_type: slip
    format_version: "1"
    signature_capability: classical
`))
check('7. an entry with two selectors is an error', r.exit !== 0 && hasErr(r, 'exactly one of'), show(r))

r = runWith(doc(`record_profiles:
  - record_type: slip
    signature_capability: classical
  - format_version: "1"
    signature_capability: composite
`))
check('8. mixing record_type and format_version entries is an error', r.exit !== 0 && hasErr(r, 'mix record_type and format_version'), show(r))

r = runWith(doc(`record_profiles:
  - record_type: slip
`))
check('9. an entry that sets no attribute is an error', r.exit !== 0 && hasErr(r, 'at least one system attribute'), show(r))

r = runWith(doc(`record_profiles:
  - record_type: slip
    signature_strength: classical
`))
check('10. an unknown attribute is an error', r.exit !== 0 && hasErr(r, 'not a system attribute'), show(r))

r = runWith(doc(`record_profiles:
  - record_type: slip
    constructor: classical
`))
check('11. an inherited property name is an error, not a crash', r.exit !== 0 && hasErr(r, 'not a system attribute') && !/TypeError/.test(r.out), show(r))

r = runWith(doc(`record_profiles:
  - record_type: slip
    signature_capability: quantum
`))
check('12. a value outside the attribute values is an error', r.exit !== 0 && hasErr(r, 'not in vocabulary'), show(r))

r = runWith(doc(`record_profiles:
  - record_type: slip
    signature_capability: classical
  - record_type: slip
    hash_family: sha-256
`))
check('13. a duplicate selector is an error', r.exit !== 0 && hasErr(r, 'duplicate record_type'), show(r))

r = runWith(doc(`record_profiles:
  - record_type: "  "
    signature_capability: classical
`))
check('14. a blank selector value is an error', r.exit !== 0 && hasErr(r, 'non-empty string'), show(r))

r = runWith(doc(`system_attributes:
  signature_capability: classical
record_profiles:
  - record_type: slip
    signature_capability: classical
`))
check('15. an entry equal to the system value is a warning, not an error', clean(r) && hasWarn(r, 'same value as system_attributes'), show(r))

r = runWith(`crosswalk_type: pairwise_composition
record_profiles:
  - signature_capability: classical
`)
check('16. a malformed list is caught in a special-format crosswalk too', r.exit !== 0 && hasErr(r, 'exactly one of'), show(r))

r = runWith(doc(`system_attributes: classical
record_profiles: []
`))
check('17. scalar system_attributes with record_profiles is an error', r.exit !== 0 && hasErr(r, 'must be a mapping when record_profiles'), show(r))

r = runWith(doc(`system_attributes:
  signature_capability: [classical, composite]
record_profiles: []
`))
check('18. a list value in system_attributes with record_profiles is an error', r.exit !== 0 && hasErr(r, 'must be one string value'), show(r))

r = runWith(doc(`system_attributes:
  constructor: classical
`))
check('19. system_attributes.constructor does not crash the validator', !/TypeError/.test(r.out) && own(r).length > 0, show(r))

r = runWith(`crosswalk_type: rfc_category_reverse
system_attributes:
  signature_capability: quantum
record_profiles: []
`)
check('20. bad defaults are caught in a reverse crosswalk with record_profiles', r.exit !== 0 && hasErr(r, 'must be one string value'), show(r))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
