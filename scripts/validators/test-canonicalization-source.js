#!/usr/bin/env node
// test-canonicalization-source.js - acceptance cases for canonicalization_source
// and the not-applicable profile (#253). Each case writes one temporary
// crosswalk, runs the real validator, and reads its exit code and output.
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const VALIDATOR = path.join(ROOT, 'scripts', 'validate-crosswalks.js')
const TMP = path.join(ROOT, 'crosswalk', 'zz-canonicalization-source-tmp.yaml')

let passed = 0
let failed = 0
function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); failed++ }
}

// Not an underscore name, because those are negative fixtures that must fail.
function runWith(attrs) {
  fs.writeFileSync(TMP, `system: test-canonicalization-source
version: "0.0.1"
source: "https://example.invalid/spec"
system_attributes:
${attrs}
signal_types:
  governance_attestation:
    canonical: governance_attestation
    internal: "test row"
    match: no_mapping
    notes: "Temporary fixture written and deleted by test-canonicalization-source.js."
`, 'utf8')
  try {
    return { exit: 0, out: execFileSync('node', [VALIDATOR], { encoding: 'utf8', cwd: ROOT }) }
  } catch (e) {
    return { exit: e.status === undefined ? 1 : e.status, out: `${e.stdout || ''}${e.stderr || ''}` }
  } finally {
    fs.unlinkSync(TMP)
  }
}
const own = r => r.out.split('\n').filter(l => l.includes('zz-canonicalization-source-tmp.yaml'))
const clean = r => r.exit === 0 && !own(r).some(l => l.startsWith('ERROR') || (l.startsWith('WARN') && l.includes('system_attributes.canonicalization')))

console.log('canonicalization_source and not-applicable (#253)')
for (const v of ['external-standard', 'project-specification', 'implementation']) {
  const r = runWith(`  canonicalization_profile: implementation-defined\n  canonicalization_source: ${v}`)
  check(`1. canonicalization_source ${v} is accepted`, clean(r), own(r).join(' | '))
}
let r = runWith('  canonicalization_profile: not-applicable')
check('2. canonicalization_profile not-applicable is accepted', clean(r), own(r).join(' | '))
r = runWith('  canonicalization_source: somewhere')
check('3. an unknown canonicalization_source is an error', r.exit !== 0 && own(r).some(l => l.startsWith('ERROR') && l.includes('canonicalization_source')), own(r).join(' | '))
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
