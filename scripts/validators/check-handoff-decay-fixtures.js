#!/usr/bin/env node
// check-handoff-decay-fixtures.js
// Recomputes the numeric claims in fixtures/identity-continuity/*.json from the
// closed-form model those fixtures declare, and fails if a stated value drifts
// from what the model produces.
//
// Why: validate-crosswalks.js checks that every fixture carries a `scope`
// block, but nothing checks the numbers inside. A fixture pack whose arithmetic
// silently stops matching its own stated formula is worse than no fixture pack,
// because downstream implementers calibrate against it.
//
// The model (declared in each fixture's expected.rebuild_trajectory.note):
//   trust_after_handoff = trust_score * decay_factor
//   trust_{n+1}         = trust_n + accrual_rate * (1 - trust_n)   [score = 1.0]
//
// Everything below is derived from fixture fields — no expected values are
// duplicated in this script. Fixtures whose decay is frozen or not evaluated
// (no numeric `decay_factor` / `decay_factor_effective`) are checked for the
// complementary property: trust is unchanged and no trajectory is claimed.
//
// Plain Node assertions, no external test framework — consistent with
// test-entity-continuity-pdr.js.
//
// Usage: node scripts/validators/check-handoff-decay-fixtures.js [data-root]
// Exit 0 = all pass; exit 1 = any failure.
//
// Like validate-crosswalks.js, an optional data-root lets a trusted copy of
// this script run against another checkout's fixture tree, so the PR being
// checked cannot also supply the checker.

'use strict'

const fs = require('fs')
const path = require('path')

const targetArg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null
const ROOT = targetArg ? path.resolve(targetArg) : path.resolve(__dirname, '../..')
const FIXTURE_DIR = path.join(ROOT, 'fixtures/identity-continuity')

// Fixture values are published rounded to 4 decimal places, so a recomputed
// value may differ from the stated one by at most half an ulp at that scale.
const TOLERANCE = 5e-5

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${name}`)
    console.log(`    ${e.message}`)
  }
}

function near(actual, expected, label) {
  if (typeof expected !== 'number') throw new Error(`${label}: fixture value is not a number`)
  if (Math.abs(actual - expected) > TOLERANCE) {
    throw new Error(`${label}: fixture says ${expected}, model computes ${actual.toFixed(6)}`)
  }
}

// Step keys are `step_<n>` with an optional descriptive suffix, e.g.
// `step_0_post_handoff` or `step_5_freshness_restored`.
function stepIndex(key) {
  const m = /^step_(\d+)/.exec(key)
  return m ? Number(m[1]) : null
}

// Accrual is piecewise when a fixture models reduced accrual during staleness:
// `expected.accrual_rate_post_stale` applies up to and including the step keyed
// `..._freshness_restored`, after which the relationship's base accrual_rate
// resumes. Both the rate and the boundary come from the fixture itself.
function accrualSchedule(fixture) {
  const base = fixture.input_state.accrual_rate
  const reduced = fixture.expected.accrual_rate_post_stale
  if (typeof reduced !== 'number') return () => base

  const traj = fixture.expected.rebuild_trajectory || {}
  const boundaryKey = Object.keys(traj).find((k) => /^step_\d+.*freshness_restored/.test(k))
  if (!boundaryKey) {
    throw new Error('accrual_rate_post_stale declared but no step_N_freshness_restored key marks where it ends')
  }
  const boundary = stepIndex(boundaryKey)
  // Step n is produced by the n-th accrual; accruals 1..boundary are reduced.
  return (n) => (n <= boundary ? reduced : base)
}

function run() {
  if (!fs.existsSync(FIXTURE_DIR)) {
    console.log(`no fixtures at ${path.relative(ROOT, FIXTURE_DIR)} — nothing to check`)
    return
  }
  const files = fs
    .readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()

  for (const file of files) {
    const rel = path.join('fixtures/identity-continuity', file)
    const fx = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8'))
    const exp = fx.expected || {}
    const trustBefore = fx.input_state.trust_score
    console.log(`\n# ${rel}`)

    // A fixture states its decay factor either directly (`decay_factor`) or,
    // when the factor is derived from a time-decay model, as
    // `decay_factor_effective`. Both mean the same thing to the trust math.
    const decay =
      typeof exp.decay_factor === 'number' ? exp.decay_factor : exp.decay_factor_effective

    // 4a. Fixtures with no decay applied: trust must be untouched and no
    // trajectory claimed. This is the property that makes a frozen or rejected
    // handoff distinguishable from an unmodelled one.
    if (typeof decay !== 'number') {
      check('no decay applied → trust unchanged, no trajectory', () => {
        near(trustBefore, exp.trust_after_handoff, 'trust_after_handoff')
        if (exp.rebuild_trajectory !== null && exp.rebuild_trajectory !== undefined) {
          throw new Error('decay is null but a rebuild_trajectory is claimed')
        }
      })
      continue
    }

    // 4b. Decay step.
    check(`trust_after_handoff = ${trustBefore} * ${decay}`, () => {
      near(trustBefore * decay, exp.trust_after_handoff, "trust_after_handoff")
    })

    // Fixture 04 states its decay factor analytically as well as numerically;
    // verify the closed form matches the factor the trust math actually uses.
    if (typeof exp.lambda_per_day === 'number' && typeof exp.delta_t_days === 'number') {
      check('exp(-lambda * delta_t) matches decay_factor_effective', () => {
        const analytic = Math.exp(-(Math.LN2 / 30) * exp.delta_t_days)
        near(analytic, decay, "decay_factor_effective")
        // The published lambda is the rounded display value; confirm it rounds
        // from ln(2)/30 as the fixture's own note claims.
        near(Math.round((Math.LN2 / 30) * 1e4) / 1e4, exp.lambda_per_day, 'lambda_per_day')
      })
    }

    const traj = exp.rebuild_trajectory
    if (!traj) continue

    const accrualAt = accrualSchedule(fx)

    // Walk the trajectory once, checking every stated step against the running
    // recomputation and every receipts_to_reach_X threshold against first
    // crossing.
    const stated = []
    const thresholds = []
    for (const [key, value] of Object.entries(traj)) {
      const n = stepIndex(key)
      if (n !== null) stated.push([key, n, value])
      const t = /^receipts_to_reach_([\d.]+)$/.exec(key)
      if (t) thresholds.push([key, Number(t[1]), value])
    }

    const maxStep = Math.max(...stated.map(([, n]) => n), ...thresholds.map(([, , v]) => v))
    const series = [exp.trust_after_handoff]
    for (let n = 1; n <= maxStep; n++) {
      const prev = series[n - 1]
      series[n] = prev + accrualAt(n) * (1 - prev)
    }

    check(`${stated.length} trajectory steps recompute from the stated model`, () => {
      for (const [key, n, value] of stated) near(series[n], value, key)
    })

    for (const [key, target, claimed] of thresholds) {
      check(`${key} = first step reaching ${target}`, () => {
        const first = series.findIndex((v) => v >= target)
        if (first === -1) {
          throw new Error(`series never reaches ${target} within ${maxStep} steps`)
        }
        if (first !== claimed) {
          throw new Error(`fixture says ${claimed}, first crossing is at step ${first}`)
        }
      })
    }
  }
}

run()

console.log('\n---')
console.log(`${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
