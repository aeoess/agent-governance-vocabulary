#!/usr/bin/env node
// entity-continuity-pdr.js
//
// Validator for behavioral fingerprint divergence over a rolling session window,
// per the PDR (Provable Drift Reporter) specification documented at
// docs/descriptor-dimensions/entity-continuity-pdr.md (co-authored with @nanookclaw).
//
// This validator is COMPLEMENTARY to the structural continuity-analyzer fixture
// shipped in PR #42 (fixtures/interop-week-1/entity-continuity-continuity-analyzer.json).
//   - continuity-analyzer evaluates STRUCTURAL continuity (object / constraint /
//     temporal / authority / executor) at the gate boundary, qualitative pass/fail.
//   - PDR evaluates BEHAVIORAL continuity over a rolling session window,
//     quantitative scalar in [0.0, 1.0].
//
// Usage:
//   node scripts/validators/entity-continuity-pdr.js <input.json> [--verbose]
//
// Input JSON shape (one fingerprint window):
//   {
//     "window_size": 10,
//     "fingerprints": [
//       { "tool_call_distribution": 0.45, "error_rate": 0.02,
//         "task_completion_rate": 0.96, "response_token_variance": 0.31 },
//       ...
//     ]
//   }
//
// Output:
//   { "entity_continuity": <float in [0.0, 1.0]>,
//     "divergences": [<floats>],
//     "slope": <float>,
//     "max_possible_slope": <float>,
//     "n_sessions": <int>,
//     "window_status": "valid" | "underdetermined" }
//
// Exit codes:
//   0 = valid input, score computed
//   1 = invalid input (range violation, missing fields, malformed JSON)
//   2 = file I/O error

'use strict'

const fs = require('fs')

// -----------------------------------------------------------------------------
// Spec constants — keep in sync with docs/descriptor-dimensions/entity-continuity-pdr.md
// -----------------------------------------------------------------------------

const REQUIRED_DIMS = [
  'tool_call_distribution',
  'error_rate',
  'task_completion_rate',
  'response_token_variance',
]
const NUM_DIMS = REQUIRED_DIMS.length // 4
const MAX_DIVERGENCE = Math.sqrt(NUM_DIMS) // sqrt(4) = 2.0
const DEFAULT_WINDOW_SIZE = 10

// -----------------------------------------------------------------------------
// Pure functions (testable in isolation)
// -----------------------------------------------------------------------------

/**
 * L2 distance between two fingerprints across the four normalized dimensions.
 * Each dimension must be in [0, 1]; max possible distance is sqrt(4) = 2.0.
 */
function fingerprintDivergence(a, b) {
  let sumSq = 0
  for (const dim of REQUIRED_DIMS) {
    const delta = a[dim] - b[dim]
    sumSq += delta * delta
  }
  return Math.sqrt(sumSq)
}

/**
 * Ordinary Least Squares slope of the divergence sequence over its index.
 * Given divergences [d_1, d_2, ..., d_{N-1}] indexed by [0, 1, ..., N-2],
 * returns the OLS slope of d_i regressed on i.
 *
 * Formula: slope = sum((x - x_mean) * (y - y_mean)) / sum((x - x_mean)^2)
 *
 * Edge cases:
 *   - Fewer than 2 divergence points: returns 0 (no drift detectable)
 *   - All x values identical (impossible here since x = 0..N-2): would return 0
 */
function olsSlope(divergences) {
  const n = divergences.length
  if (n < 2) return 0.0

  let sumX = 0, sumY = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += divergences[i]
  }
  const meanX = sumX / n
  const meanY = sumY / n

  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    const dx = i - meanX
    num += dx * (divergences[i] - meanY)
    den += dx * dx
  }
  if (den === 0) return 0.0
  return num / den
}

/**
 * Clamp a value to [lo, hi].
 */
function clamp(x, lo, hi) {
  if (x < lo) return lo
  if (x > hi) return hi
  return x
}

/**
 * Validate a single fingerprint object — every required dimension present,
 * a finite number in [0, 1]. Returns null on success, error string on failure.
 */
function validateFingerprint(fp, idx) {
  if (typeof fp !== 'object' || fp === null) {
    return `fingerprint[${idx}]: must be an object`
  }
  for (const dim of REQUIRED_DIMS) {
    if (!(dim in fp)) {
      return `fingerprint[${idx}]: missing dimension "${dim}"`
    }
    const v = fp[dim]
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return `fingerprint[${idx}].${dim}: must be a finite number, got ${typeof v} (${v})`
    }
    if (v < 0 || v > 1) {
      return `fingerprint[${idx}].${dim}: must be in [0, 1], got ${v}`
    }
  }
  return null
}

/**
 * Compute the entity_continuity PDR score from a window of fingerprints.
 *
 * Returns:
 *   {
 *     entity_continuity: <float in [0, 1]>,
 *     divergences: <number[]>,
 *     slope: <number>,
 *     max_possible_slope: <number>,
 *     n_sessions: <int>,
 *     window_status: "valid" | "underdetermined"
 *   }
 */
function computeContinuity(fingerprints, windowSize) {
  const N = (typeof windowSize === 'number' && windowSize >= 2)
    ? windowSize
    : DEFAULT_WINDOW_SIZE

  // Per spec: N < 2 means undefined window — assume stable (return 1.0).
  // Also covers the case of fewer than 2 fingerprints (cannot compute any divergence).
  if (fingerprints.length < 2) {
    return {
      entity_continuity: 1.0,
      divergences: [],
      slope: 0.0,
      max_possible_slope: 0.0,
      n_sessions: fingerprints.length,
      window_status: 'underdetermined',
    }
  }

  // Compute consecutive divergences d_i = ||fp_{i+1} - fp_i||_2 for i in [0, N-2].
  const divergences = []
  for (let i = 0; i < fingerprints.length - 1; i++) {
    divergences.push(fingerprintDivergence(fingerprints[i], fingerprints[i + 1]))
  }

  // OLS slope of divergences indexed by their position.
  const slope = olsSlope(divergences)

  // max_possible_slope = MAX_DIVERGENCE / (N - 2), per nanook's spec.
  // For N = 2 the denominator is 0 — divergence sequence has 1 element, slope is
  // undefined under linear-regression semantics (we return 0 from olsSlope), and
  // the score is 1.0 (no drift detectable from a single point).
  const denom = N - 2
  if (denom <= 0) {
    return {
      entity_continuity: 1.0,
      divergences,
      slope: 0.0,
      max_possible_slope: 0.0,
      n_sessions: fingerprints.length,
      window_status: 'underdetermined',
    }
  }

  const maxPossibleSlope = MAX_DIVERGENCE / denom
  const score = clamp(1.0 - slope / maxPossibleSlope, 0.0, 1.0)

  return {
    entity_continuity: score,
    divergences,
    slope,
    max_possible_slope: maxPossibleSlope,
    n_sessions: fingerprints.length,
    window_status: 'valid',
  }
}

/**
 * Top-level validator — accepts the full input shape and returns either a
 * computed score or a list of errors.
 */
function validate(input) {
  const errors = []

  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: ['input: must be a JSON object'] }
  }

  // window_size is optional, defaults to 10
  let windowSize = DEFAULT_WINDOW_SIZE
  if ('window_size' in input) {
    const w = input.window_size
    if (typeof w !== 'number' || !Number.isInteger(w) || w < 2) {
      errors.push(`window_size: must be an integer >= 2, got ${w}`)
    } else {
      windowSize = w
    }
  }

  if (!Array.isArray(input.fingerprints)) {
    errors.push('fingerprints: must be an array')
    return { ok: false, errors }
  }

  for (let i = 0; i < input.fingerprints.length; i++) {
    const e = validateFingerprint(input.fingerprints[i], i)
    if (e) errors.push(e)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, result: computeContinuity(input.fingerprints, windowSize) }
}

// -----------------------------------------------------------------------------
// CLI entry point
// -----------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose')
  const fileArg = args.find((a) => !a.startsWith('--'))

  if (!fileArg) {
    console.error('Usage: node scripts/validators/entity-continuity-pdr.js <input.json> [--verbose]')
    process.exit(2)
  }

  let raw
  try {
    raw = fs.readFileSync(fileArg, 'utf8')
  } catch (e) {
    console.error(`I/O error: ${e.message}`)
    process.exit(2)
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    console.error(`JSON parse error: ${e.message}`)
    process.exit(1)
  }

  const out = validate(parsed)
  if (!out.ok) {
    console.error('Validation errors:')
    for (const err of out.errors) console.error(`  - ${err}`)
    process.exit(1)
  }

  if (verbose) {
    console.log(JSON.stringify(out.result, null, 2))
  } else {
    console.log(JSON.stringify({ entity_continuity: out.result.entity_continuity }))
  }
  process.exit(0)
}

// Export pure functions for unit testing (e.g. from scripts/validators/test-entity-continuity-pdr.js)
module.exports = {
  fingerprintDivergence,
  olsSlope,
  clamp,
  validateFingerprint,
  computeContinuity,
  validate,
  REQUIRED_DIMS,
  MAX_DIVERGENCE,
  DEFAULT_WINDOW_SIZE,
}

if (require.main === module) {
  main()
}
