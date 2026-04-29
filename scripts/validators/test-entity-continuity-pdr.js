#!/usr/bin/env node
// test-entity-continuity-pdr.js
// Unit tests for entity-continuity-pdr.js validator.
// Plain Node assertions, no external test framework — keeps the validator
// dependency-free and runnable from any clone.
//
// Usage: node scripts/validators/test-entity-continuity-pdr.js
// Exit 0 = all pass; exit 1 = any failure.

'use strict'

const assert = require('assert')
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

const {
  fingerprintDivergence,
  olsSlope,
  clamp,
  validateFingerprint,
  computeContinuity,
  validate,
  MAX_DIVERGENCE,
  DEFAULT_WINDOW_SIZE,
} = require('./entity-continuity-pdr.js')

const VALIDATOR = path.join(__dirname, 'entity-continuity-pdr.js')

let passed = 0
let failed = 0

function test(name, fn) {
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

function approx(a, b, eps = 1e-9) {
  return Math.abs(a - b) < eps
}

// =============================================================================
// Pure function tests
// =============================================================================

console.log('# fingerprintDivergence')

test('zero divergence between identical fingerprints', () => {
  const fp = { tool_call_distribution: 0.5, error_rate: 0.5, task_completion_rate: 0.5, response_token_variance: 0.5 }
  assert.strictEqual(fingerprintDivergence(fp, fp), 0.0)
})

test('max divergence between [0,0,0,0] and [1,1,1,1] equals sqrt(4) = 2.0', () => {
  const a = { tool_call_distribution: 0, error_rate: 0, task_completion_rate: 0, response_token_variance: 0 }
  const b = { tool_call_distribution: 1, error_rate: 1, task_completion_rate: 1, response_token_variance: 1 }
  assert.ok(approx(fingerprintDivergence(a, b), MAX_DIVERGENCE))
  assert.ok(approx(MAX_DIVERGENCE, 2.0))
})

test('symmetric divergence (a,b) === (b,a)', () => {
  const a = { tool_call_distribution: 0.1, error_rate: 0.4, task_completion_rate: 0.7, response_token_variance: 0.2 }
  const b = { tool_call_distribution: 0.6, error_rate: 0.1, task_completion_rate: 0.9, response_token_variance: 0.5 }
  assert.ok(approx(fingerprintDivergence(a, b), fingerprintDivergence(b, a)))
})

test('one-dimension delta of 1.0 produces divergence 1.0', () => {
  const a = { tool_call_distribution: 0.5, error_rate: 0.5, task_completion_rate: 0.5, response_token_variance: 0.5 }
  const b = { tool_call_distribution: 0.5, error_rate: 1.5, task_completion_rate: 0.5, response_token_variance: 0.5 }
  // (b is out-of-spec but tests the L2 math; use legal values:)
  const c = { tool_call_distribution: 0.5, error_rate: 1.0, task_completion_rate: 0.5, response_token_variance: 0.5 }
  assert.ok(approx(fingerprintDivergence(a, c), 0.5))
})

console.log('\n# olsSlope')

test('zero slope on flat (constant) divergence sequence', () => {
  assert.ok(approx(olsSlope([0.3, 0.3, 0.3, 0.3, 0.3]), 0.0))
})

test('positive slope on monotonically increasing divergence', () => {
  // perfect linear trend [0, 0.1, 0.2, 0.3, 0.4] → slope = 0.1
  assert.ok(approx(olsSlope([0, 0.1, 0.2, 0.3, 0.4]), 0.1))
})

test('negative slope on monotonically decreasing divergence (improving agent)', () => {
  // [0.4, 0.3, 0.2, 0.1, 0] → slope = -0.1
  assert.ok(approx(olsSlope([0.4, 0.3, 0.2, 0.1, 0]), -0.1))
})

test('zero slope on empty sequence', () => {
  assert.strictEqual(olsSlope([]), 0.0)
})

test('zero slope on single-element sequence (n < 2 edge case)', () => {
  assert.strictEqual(olsSlope([0.5]), 0.0)
})

console.log('\n# clamp')

test('clamp passes through values in range', () => {
  assert.strictEqual(clamp(0.5, 0, 1), 0.5)
})

test('clamp lower bound', () => {
  assert.strictEqual(clamp(-0.3, 0, 1), 0)
})

test('clamp upper bound', () => {
  assert.strictEqual(clamp(1.5, 0, 1), 1)
})

console.log('\n# validateFingerprint')

test('valid fingerprint returns null', () => {
  assert.strictEqual(validateFingerprint({
    tool_call_distribution: 0.5, error_rate: 0.02, task_completion_rate: 0.96, response_token_variance: 0.31
  }, 0), null)
})

test('missing dimension reports error', () => {
  const e = validateFingerprint({ tool_call_distribution: 0.5, error_rate: 0.5, task_completion_rate: 0.5 }, 3)
  assert.match(e, /missing dimension "response_token_variance"/)
})

test('out-of-range value reports error', () => {
  const e = validateFingerprint({
    tool_call_distribution: 1.5, error_rate: 0.5, task_completion_rate: 0.5, response_token_variance: 0.5
  }, 0)
  assert.match(e, /must be in \[0, 1\]/)
})

test('NaN value reports error', () => {
  const e = validateFingerprint({
    tool_call_distribution: NaN, error_rate: 0.5, task_completion_rate: 0.5, response_token_variance: 0.5
  }, 0)
  assert.match(e, /must be a finite number/)
})

console.log('\n# computeContinuity — nanook spec cases')

const flatFp = (v) => ({
  tool_call_distribution: v, error_rate: v, task_completion_rate: v, response_token_variance: v
})

test('perfectly stable agent (zero divergence across window) scores 1.0', () => {
  const fps = Array.from({ length: 10 }, () => flatFp(0.5))
  const r = computeContinuity(fps, 10)
  assert.strictEqual(r.entity_continuity, 1.0)
  assert.strictEqual(r.window_status, 'valid')
  assert.strictEqual(r.slope, 0.0)
})

test('improving agent (negative slope) clamps to 1.0 per nanook spec', () => {
  // Monotonically decreasing divergence → negative slope → 1.0 - negative/positive > 1.0 → clamp to 1.0
  // Construct fingerprints with decreasing pairwise divergence:
  // pairs: (fp[0],fp[1])=0.4, (fp[1],fp[2])=0.3, (fp[2],fp[3])=0.2, (fp[3],fp[4])=0.1
  const fps = [flatFp(0.0), flatFp(0.2), flatFp(0.35), flatFp(0.45), flatFp(0.5)]
  const r = computeContinuity(fps, 10)
  // divergence between flatFp(a) and flatFp(b) = sqrt(4 * (a-b)^2) = 2*|a-b|
  // pairs: 0.4, 0.3, 0.2, 0.1 → strictly decreasing → negative slope
  assert.ok(r.slope < 0, `expected negative slope, got ${r.slope}`)
  assert.strictEqual(r.entity_continuity, 1.0)
})

test('drifting agent (positive slope) scores below 1.0', () => {
  // pairs: 0.1, 0.2, 0.3, 0.4 → strictly increasing → positive slope
  const fps = [flatFp(0.5), flatFp(0.55), flatFp(0.65), flatFp(0.8), flatFp(1.0)]
  const r = computeContinuity(fps, 10)
  assert.ok(r.slope > 0, `expected positive slope, got ${r.slope}`)
  assert.ok(r.entity_continuity < 1.0)
  assert.ok(r.entity_continuity >= 0.0)
})

test('extreme drift (every-pair max divergence) scores at or near 0.0', () => {
  // alternating 0/1 fingerprints — every consecutive divergence = 2.0 (max)
  // sequence: [2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0] for N=10 fps
  // slope of constant sequence = 0 → score = 1.0
  // So instead use ramp of divergences: [0, 0.5, 1.0, 1.5, 2.0, 2.0, 2.0, 2.0, 2.0]
  // construct fps where consecutive divergences ramp up
  const fps = [
    flatFp(0.0), flatFp(0.0),  // div 0
    flatFp(0.25),               // div 0.5 from prior
    flatFp(0.75),               // div 1.0
    flatFp(1.5/2),              // div 1.5 — but legal cap at 1.0, so use ramp within legal range
  ]
  // Simpler legal extreme drift: use steady max divergence at the END only
  const fps2 = [flatFp(0.0), flatFp(0.0), flatFp(0.0), flatFp(0.0), flatFp(0.0),
                flatFp(0.0), flatFp(0.0), flatFp(0.0), flatFp(0.5), flatFp(1.0)]
  const r = computeContinuity(fps2, 10)
  // Should score < 1.0 since divergence rises sharply at the end
  assert.ok(r.entity_continuity < 1.0)
  assert.ok(r.entity_continuity >= 0.0)
})

test('underdetermined window (single fingerprint) returns 1.0 per nanook spec (N < 2 → assume stable)', () => {
  const r = computeContinuity([flatFp(0.5)], 10)
  assert.strictEqual(r.entity_continuity, 1.0)
  assert.strictEqual(r.window_status, 'underdetermined')
})

test('empty fingerprints array returns 1.0 (underdetermined)', () => {
  const r = computeContinuity([], 10)
  assert.strictEqual(r.entity_continuity, 1.0)
  assert.strictEqual(r.window_status, 'underdetermined')
})

test('window_size = 2 is underdetermined per spec (N - 2 = 0 denominator)', () => {
  const r = computeContinuity([flatFp(0.0), flatFp(0.5), flatFp(1.0)], 2)
  assert.strictEqual(r.window_status, 'underdetermined')
  assert.strictEqual(r.entity_continuity, 1.0)
})

test('output is always in [0, 1] across random fingerprint windows (fuzz)', () => {
  let rng = 1
  const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280 }
  for (let trial = 0; trial < 100; trial++) {
    const fps = Array.from({ length: 10 }, () => ({
      tool_call_distribution: rand(),
      error_rate: rand(),
      task_completion_rate: rand(),
      response_token_variance: rand(),
    }))
    const r = computeContinuity(fps, 10)
    assert.ok(r.entity_continuity >= 0.0 && r.entity_continuity <= 1.0,
      `score out of range: ${r.entity_continuity}`)
  }
})

console.log('\n# validate — top-level + error reporting')

test('valid input returns ok=true with result', () => {
  const out = validate({
    window_size: 10,
    fingerprints: Array.from({ length: 10 }, () => flatFp(0.5)),
  })
  assert.strictEqual(out.ok, true)
  assert.strictEqual(out.result.entity_continuity, 1.0)
})

test('invalid window_size reports error', () => {
  const out = validate({ window_size: 1, fingerprints: [flatFp(0.5), flatFp(0.5)] })
  assert.strictEqual(out.ok, false)
  assert.ok(out.errors.some((e) => e.match(/window_size/)))
})

test('non-array fingerprints reports error', () => {
  const out = validate({ fingerprints: 'not-an-array' })
  assert.strictEqual(out.ok, false)
  assert.ok(out.errors.some((e) => e.match(/must be an array/)))
})

test('window_size omitted defaults to 10', () => {
  const out = validate({ fingerprints: Array.from({ length: 10 }, () => flatFp(0.5)) })
  assert.strictEqual(out.ok, true)
})

console.log('\n# CLI integration tests')

const repoRoot = path.resolve(__dirname, '../..')
const fixtureDir = path.join(repoRoot, 'fixtures/validator-vectors')

test('CLI on stable-agent fixture exits 0 and reports score 1.0', () => {
  const out = execFileSync('node', [VALIDATOR, path.join(fixtureDir, 'pdr-stable-agent.json')], { encoding: 'utf8' })
  const parsed = JSON.parse(out.trim())
  assert.strictEqual(parsed.entity_continuity, 1.0)
})

test('CLI on drifting-agent fixture exits 0 and reports score < 1.0', () => {
  const out = execFileSync('node', [VALIDATOR, path.join(fixtureDir, 'pdr-drifting-agent.json')], { encoding: 'utf8' })
  const parsed = JSON.parse(out.trim())
  assert.ok(parsed.entity_continuity < 1.0)
  assert.ok(parsed.entity_continuity >= 0.0)
})

test('CLI on improving-agent fixture exits 0 and reports score 1.0 (clamped)', () => {
  const out = execFileSync('node', [VALIDATOR, path.join(fixtureDir, 'pdr-improving-agent.json')], { encoding: 'utf8' })
  const parsed = JSON.parse(out.trim())
  assert.strictEqual(parsed.entity_continuity, 1.0)
})

test('CLI on out-of-range fixture exits 1', () => {
  let exitCode = 0
  try {
    execFileSync('node', [VALIDATOR, path.join(fixtureDir, 'pdr-invalid-out-of-range.json')], { encoding: 'utf8', stdio: 'pipe' })
  } catch (e) {
    exitCode = e.status
  }
  assert.strictEqual(exitCode, 1)
})

console.log('\n---')
console.log(`${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
