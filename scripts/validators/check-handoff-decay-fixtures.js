#!/usr/bin/env node
// check-handoff-decay-fixtures.js
// Recomputes the numeric claims in fixtures/identity-continuity/*.json from the
// model each fixture declares, and fails if a stated value drifts from what the
// model produces.
//
// Why: validate-crosswalks.js checks that every fixture carries a `scope`
// block, but nothing checks the numbers inside. A fixture pack whose arithmetic
// silently stops matching its own stated formula is worse than no fixture pack,
// because downstream implementers calibrate against it.
//
// The models (declared per fixture in `expected.model`):
//   static_decay_then_rebuild
//     trust_after_handoff = trust_score * decay_factor
//   passive_time_decay_then_staged_rebuild
//     lambda               = ln(2) / model.half_life_days
//     trust_after_handoff  = trust_score * exp(-lambda * delta_t_days)
//     accrual is reduced through model.reduced_accrual_until_step, then base
//   no_decay
//     trust unchanged, no trajectory claimed
//   All rebuilding models:
//     trust_{n+1} = trust_n + accrual_rate(n) * (1 - trust_n)   [score = 1.0]
//
// No expected value is duplicated in this script: decay factors, accrual rates,
// half-life, thresholds and step values are all read from the fixture. What the
// script does own is the *contract* — which fixtures must exist and which
// fields and claims each must carry (see FIXTURE_CONTRACT). That contract lives
// here rather than in fixtures/ on purpose: the trusted-oracle job runs the base
// branch's copy of this script, so a PR cannot weaken the contract in the same
// commit that changes the numbers it governs. A manifest under fixtures/ would
// be editable by the PR it gates; a bare assertion count would let a required
// claim be swapped for a different one at the same count.
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
const FIXTURE_SUBDIR = 'fixtures/identity-continuity'
const FIXTURE_DIR = path.join(ROOT, FIXTURE_SUBDIR)

// Fixture values are published rounded to 4 decimal places, so a recomputed
// value may differ from the stated one by at most half an ulp at that scale.
const TOLERANCE = 5e-5

// ---------------------------------------------------------------------------
// Data-root containment (matches the rule landed in validate-crosswalks.js at
// 4bdf4dc). Git delivers symbolic links as ordinary tree entries and readFileSync
// follows them. In the trusted job the PR checkout and the base checkout are
// siblings, so without this check a PR could replace a fixture with a symlink
// into the clean base tree and the oracle would certify bytes that are not the
// bytes being merged. Rule: every file read as data must be a regular file that
// resolves inside the data root.
//
// Anchored at the data root, not the fixture directory: anchoring at the fixture
// directory still passes the variant where the fixture directory *itself* is a
// symlink pointing out of the tree.
// ---------------------------------------------------------------------------
let ROOT_REAL
try {
  ROOT_REAL = fs.realpathSync(ROOT)
} catch (e) {
  console.log(`FAIL: cannot resolve data root ${ROOT}: ${e.message}`)
  process.exit(1)
}

function containmentError(file) {
  let st
  try {
    st = fs.lstatSync(file)
  } catch (e) {
    return `cannot stat: ${e.message}`
  }
  if (st.isSymbolicLink()) {
    return 'symbolic link; data files must be regular files inside the data root'
  }
  let real
  try {
    real = fs.realpathSync(file)
  } catch (e) {
    return `cannot resolve: ${e.message}`
  }
  if (real !== ROOT_REAL && !real.startsWith(ROOT_REAL + path.sep)) {
    return 'resolves outside the data root'
  }
  return null
}

// ---------------------------------------------------------------------------
// The contract. Base-owned: what the published corpus must contain for a green
// run to mean anything. Adding a fixture means adding an entry here; weakening
// an entry takes a change to this file, which the trusted job runs from base.
// ---------------------------------------------------------------------------
const FIXTURE_CONTRACT = {
  '01-graceful-handoff.json': {
    fixture_id: 'identity-continuity/01-graceful-handoff',
    model: { id: 'static_decay_then_rebuild', version: '1.0.0' },
    inputs: ['trust_score', 'accrual_rate'],
    numbers: ['decay_factor', 'trust_after_handoff'],
    steps: ['step_0_post_handoff', 'step_1', 'step_2', 'step_3', 'step_5', 'step_7', 'step_11'],
    thresholds: ['receipts_to_reach_0.90', 'receipts_to_reach_0.95'],
  },
  '02-ungraceful-termination.json': {
    fixture_id: 'identity-continuity/02-ungraceful-termination',
    model: { id: 'static_decay_then_rebuild', version: '1.0.0' },
    inputs: ['trust_score', 'accrual_rate'],
    numbers: ['decay_factor', 'trust_after_handoff'],
    steps: ['step_0_post_handoff', 'step_1', 'step_3', 'step_5', 'step_8', 'step_10', 'step_13'],
    thresholds: ['receipts_to_reach_0.85', 'receipts_to_reach_0.90'],
  },
  '03-fork-detection.json': {
    fixture_id: 'identity-continuity/03-fork-detection',
    model: { id: 'no_decay', version: '1.0.0' },
    inputs: ['trust_score'],
    numbers: ['trust_after_handoff'],
    steps: [],
    thresholds: [],
  },
  '04-stale-reestablishment.json': {
    fixture_id: 'identity-continuity/04-stale-reestablishment',
    model: { id: 'passive_time_decay_then_staged_rebuild', version: '1.0.0' },
    inputs: ['trust_score', 'accrual_rate'],
    numbers: ['delta_t_days', 'decay_factor_effective', 'trust_after_handoff', 'accrual_rate_post_stale', 'lambda_per_day'],
    steps: ['step_0_post_handoff', 'step_1', 'step_3', 'step_5_freshness_restored', 'step_8', 'step_10', 'step_13'],
    thresholds: ['receipts_to_reach_0.85', 'receipts_to_reach_0.90'],
  },
  '05-impersonation.json': {
    fixture_id: 'identity-continuity/05-impersonation',
    model: { id: 'no_decay', version: '1.0.0' },
    inputs: ['trust_score'],
    numbers: ['trust_after_handoff'],
    steps: [],
    thresholds: [],
  },
}

const KNOWN_MODELS = new Set([
  'static_decay_then_rebuild',
  'passive_time_decay_then_staged_rebuild',
  'no_decay',
])

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

function fail(name, message) {
  failed++
  console.log(`  ✗ ${name}`)
  console.log(`    ${message}`)
}

// Both sides must be finite. Guarding only `expected` let a missing input make
// `actual` NaN, and `Math.abs(NaN) > TOLERANCE` is false — so an absent field
// read as a silent pass.
function near(actual, expected, label) {
  if (!Number.isFinite(expected)) {
    throw new Error(`${label}: fixture value is not a finite number (got ${JSON.stringify(expected)})`)
  }
  if (!Number.isFinite(actual)) {
    throw new Error(`${label}: model computed a non-finite value (${actual}) — an input the model consumes is missing or non-numeric`)
  }
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

// Verify the fixture carries every field the contract requires, and that the
// declared model matches. Returns an error string, or null when the fixture
// satisfies its contract.
function contractError(fx, spec) {
  if (fx.fixture_id !== spec.fixture_id) {
    return `fixture_id is ${JSON.stringify(fx.fixture_id)}, contract requires ${JSON.stringify(spec.fixture_id)}`
  }
  const exp = fx.expected
  if (!exp || typeof exp !== 'object') return 'no `expected` block'

  const model = exp.model
  if (!model || typeof model !== 'object') {
    return 'no `expected.model` block declaring the model this fixture is computed under'
  }
  if (!KNOWN_MODELS.has(model.id)) {
    return `declares model id ${JSON.stringify(model.id)}, which this checker does not know how to recompute`
  }
  if (model.id !== spec.model.id) {
    return `declares model ${JSON.stringify(model.id)}, contract requires ${JSON.stringify(spec.model.id)}`
  }
  if (model.version !== spec.model.version) {
    return `declares model version ${JSON.stringify(model.version)}, contract requires ${JSON.stringify(spec.model.version)}`
  }

  const input = fx.input_state
  if (!input || typeof input !== 'object') return 'no `input_state` block'
  for (const key of spec.inputs) {
    if (!Number.isFinite(input[key])) {
      return `input_state.${key} is missing or not a finite number`
    }
  }
  for (const key of spec.numbers) {
    if (!Number.isFinite(exp[key])) {
      return `expected.${key} is missing or not a finite number`
    }
  }

  if (spec.model.id === 'passive_time_decay_then_staged_rebuild') {
    if (!Number.isFinite(model.half_life_days) || model.half_life_days <= 0) {
      return 'expected.model.half_life_days is missing or not a positive number'
    }
    if (!Number.isInteger(model.reduced_accrual_until_step) || model.reduced_accrual_until_step < 0) {
      return 'expected.model.reduced_accrual_until_step is missing or not a non-negative integer'
    }
  }

  const traj = exp.rebuild_trajectory
  if (spec.steps.length === 0) {
    if (traj !== null && traj !== undefined) {
      return 'contract claims no rebuild trajectory, but one is present'
    }
    return null
  }
  if (!traj || typeof traj !== 'object') {
    return 'contract requires a rebuild_trajectory, but none is present'
  }
  for (const key of spec.steps) {
    if (!Number.isFinite(traj[key])) {
      return `rebuild_trajectory.${key} is missing or not a finite number`
    }
  }
  for (const key of spec.thresholds) {
    if (!Number.isInteger(traj[key])) {
      return `rebuild_trajectory.${key} is missing or not an integer`
    }
  }
  return null
}

// Accrual is piecewise when a fixture models reduced accrual during staleness:
// `expected.accrual_rate_post_stale` applies through the step declared in
// `expected.model.reduced_accrual_until_step`, after which the relationship's
// base accrual_rate resumes. Both the rate and the boundary come from the
// fixture itself.
function accrualSchedule(fx) {
  const base = fx.input_state.accrual_rate
  const reduced = fx.expected.accrual_rate_post_stale
  if (!Number.isFinite(reduced)) return () => base
  const boundary = fx.expected.model.reduced_accrual_until_step
  // Step n is produced by the n-th accrual; accruals 1..boundary are reduced.
  return (n) => (n <= boundary ? reduced : base)
}

function run() {
  const dirContainment = containmentError(FIXTURE_DIR)
  if (dirContainment) {
    fail(`${FIXTURE_SUBDIR}/`, dirContainment)
    return
  }
  let stat
  try {
    stat = fs.statSync(FIXTURE_DIR)
  } catch (e) {
    fail(`${FIXTURE_SUBDIR}/`, `fixture directory is missing: ${e.message}`)
    return
  }
  if (!stat.isDirectory()) {
    fail(`${FIXTURE_SUBDIR}/`, 'fixture path is not a directory')
    return
  }

  // A fixture the contract does not name cannot be recomputed by this copy of
  // the checker, and in the trusted job this copy is the BASE branch's. That is
  // unavoidable — base cannot know a model it has not merged yet — but it must
  // not be silent, or a PR could add a sixth fixture with unchecked arithmetic
  // and the trusted log would still read as full coverage. Reported, not failed:
  // failing here would make adding any new fixture impossible, since the base
  // contract necessarily lags the PR that introduces one.
  let present = []
  try {
    present = fs
      .readdirSync(FIXTURE_DIR, { withFileTypes: true })
      .filter((e) => !e.isSymbolicLink() && e.isFile() && e.name.endsWith('.json'))
      .map((e) => e.name)
  } catch (e) {
    fail(`${FIXTURE_SUBDIR}/`, `cannot read fixture directory: ${e.message}`)
    return
  }
  const uncontracted = present.filter((f) => !(f in FIXTURE_CONTRACT)).sort()
  if (uncontracted.length > 0) {
    console.log(
      `\nNOTICE: ${uncontracted.length} fixture(s) present but not named in this checker's contract, ` +
        `so their arithmetic is NOT certified by this run:`
    )
    for (const f of uncontracted) console.log(`  - ${path.join(FIXTURE_SUBDIR, f)}`)
    console.log(
      '  Adding a fixture requires adding its contract entry to this file. When this ' +
        'checker runs as the trusted oracle it is the base branch\'s copy, so a fixture ' +
        'added by the PR under test is expected to appear here until the contract change merges.'
    )
  }

  for (const [file, spec] of Object.entries(FIXTURE_CONTRACT)) {
    const rel = path.join(FIXTURE_SUBDIR, file)
    const full = path.join(FIXTURE_DIR, file)
    console.log(`\n# ${rel}`)

    const contained = containmentError(full)
    if (contained) {
      fail(rel, contained)
      continue
    }
    if (!fs.statSync(full).isFile()) {
      fail(rel, 'not a regular file')
      continue
    }

    let fx
    try {
      fx = JSON.parse(fs.readFileSync(full, 'utf8'))
    } catch (e) {
      fail(rel, `cannot parse: ${e.message}`)
      continue
    }

    const contractIssue = contractError(fx, spec)
    if (contractIssue) {
      fail(`${rel} satisfies the base-owned fixture contract`, contractIssue)
      continue
    }
    passed++
    console.log(`  ✓ satisfies the base-owned fixture contract`)

    const exp = fx.expected
    const trustBefore = fx.input_state.trust_score
    const modelId = exp.model.id

    // No decay applied: trust must be untouched and no trajectory claimed. This
    // is the property that makes a frozen or rejected handoff distinguishable
    // from an unmodelled one.
    if (modelId === 'no_decay') {
      check('no decay applied → trust unchanged, no trajectory', () => {
        near(trustBefore, exp.trust_after_handoff, 'trust_after_handoff')
        if (exp.rebuild_trajectory !== null && exp.rebuild_trajectory !== undefined) {
          throw new Error('model is no_decay but a rebuild_trajectory is claimed')
        }
      })
      continue
    }

    // Decay step. The factor is stated directly for the static model, and
    // recomputed from the declared half-life for the passive-time model.
    let decay
    if (modelId === 'static_decay_then_rebuild') {
      decay = exp.decay_factor
      check(`trust_after_handoff = ${trustBefore} * ${decay}`, () => {
        near(trustBefore * decay, exp.trust_after_handoff, 'trust_after_handoff')
      })
    } else {
      const halfLife = exp.model.half_life_days
      const lambda = Math.LN2 / halfLife
      decay = exp.decay_factor_effective
      check(`exp(-ln(2)/${halfLife} * ${exp.delta_t_days}) matches decay_factor_effective`, () => {
        near(Math.exp(-lambda * exp.delta_t_days), decay, 'decay_factor_effective')
        // The published lambda is a rounded display value, so it is checked at
        // display precision rather than used to drive the math. Driving the
        // decay from the rounded 0.0231 would compute 0.500074, which misses
        // the stated 0.5 by more than TOLERANCE — the declarable parameter is
        // the half-life, not the rounded lambda.
        near(Math.round(lambda * 1e4) / 1e4, exp.lambda_per_day, 'lambda_per_day')
      })
      check(`trust_after_handoff = ${trustBefore} * ${decay}`, () => {
        near(trustBefore * decay, exp.trust_after_handoff, 'trust_after_handoff')
      })
    }

    const traj = exp.rebuild_trajectory
    const accrualAt = accrualSchedule(fx)

    // Walk the contract's steps and thresholds against the running
    // recomputation. Only contract-required keys are checked, so a fixture
    // cannot satisfy the run by carrying extra keys in place of required ones.
    const stated = spec.steps.map((key) => [key, stepIndex(key), traj[key]])
    const thresholds = spec.thresholds.map((key) => {
      const m = /^receipts_to_reach_([\d.]+)$/.exec(key)
      return [key, Number(m[1]), traj[key]]
    })

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
