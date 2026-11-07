#!/usr/bin/env node
// test-matrix-coverage.js — regression test for the crosswalk matrix coverage
// counts. A system whose entry for a signal is false_analog or no_mapping has
// documented that it does NOT provide that signal, so it must count as
// addressed and never as mapped. Before this test the generator counted any
// entry as "mapped", so a crosswalk that only added no_mapping rows raised the
// "Systems mapped" and "Top-3 most-mapped" figures.
'use strict'

const { coverageCounts, POSITIVE_MATCHES } = require('../generate-crosswalk-matrix')

let passed = 0
let failed = 0
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  ok   ${name}`) }
  else { failed++; console.log(`  FAIL ${name}${detail ? ': ' + detail : ''}`) }
}

const signals = ['a', 'b', 'c']
const systems = [
  { cells: { a: { match: 'exact' }, b: { match: 'no_mapping' }, c: { match: 'false_analog' } } },
  { cells: { a: { match: 'partial' }, b: { match: 'structural' } } },
  { cells: { a: { match: '__ungraded__' }, c: { match: 'no_mapping' } } },
  { cells: {} },
]
const cov = coverageCounts(systems, signals)

check('exact, partial and ungraded count as mapped', cov.a.mapped === 3, JSON.stringify(cov.a))
check('every present entry counts as addressed', cov.a.addressed === 3, JSON.stringify(cov.a))
check('no_mapping is addressed but not mapped', cov.b.mapped === 1 && cov.b.addressed === 2, JSON.stringify(cov.b))
check('false_analog and no_mapping alone give zero mapped', cov.c.mapped === 0 && cov.c.addressed === 2, JSON.stringify(cov.c))
check('a system with no entry adds nothing', Object.values(cov).every(v => v.addressed <= 3))
check('negative match types are not in the positive set',
  !POSITIVE_MATCHES.has('no_mapping') && !POSITIVE_MATCHES.has('false_analog'))
check('the three positive match types are in the positive set',
  ['exact', 'structural', 'partial'].every(m => POSITIVE_MATCHES.has(m)))

console.log(`${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
