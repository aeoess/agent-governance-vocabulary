# Entity Continuity — Behavioral Fingerprint Drift (PDR)

> Co-authored with [@nanookclaw](https://github.com/nanookclaw) (PDR — Provable Drift Reporter, UBC).
> Origin: [aeoess/agent-governance-vocabulary#36](https://github.com/aeoess/agent-governance-vocabulary/issues/36) — comment 4319031773 (Apr 22) defined the measurement, comment from Apr 25 21:34 UTC delivered the slope-computation spec used here.
> Scope: this artifact and the validator at `scripts/validators/entity-continuity-pdr.js`. PDR itself remains @nanookclaw's project.

This document is the long-form rationale for the PDR-style behavioral
fingerprint drift score for `entity_continuity`, and the specification the
validator at `scripts/validators/entity-continuity-pdr.js` implements.

## How this composes with the existing entity_continuity work

`entity_continuity` already has a structural dimension shipped in
`fixtures/interop-week-1/entity-continuity-continuity-analyzer.json` (PR #42,
@nutstrut's continuity-analyzer). That fixture evaluates *structural*
continuity at a gate boundary — same-object / same-constraint / same-temporal /
same-authority / same-executor flags, qualitative pass/fail.

PDR evaluates a different layer: *behavioral* continuity over a rolling
session window — a quantitative scalar in `[0.0, 1.0]` describing whether the
agent's externally observable behavior is drifting. The two compose; they do
not conflict.

| Layer | Fixture / Validator | Question |
|------|--------|----------|
| Structural | `continuity-analyzer` (PR #42) | At this gate, is the same governed thing still in place? |
| Behavioral | `entity-continuity-pdr.js` (this PR) | Across the last N sessions, is the agent's behavior diverging? |

Both can be present in a single end-to-end fixture, scoring the same
`entity_continuity` signal from two complementary angles.

## The measurement

A *session* is one complete agent run from initialization to termination,
including all tool calls and outputs within that run. At session end, the
agent (or the system observing the agent) records a *behavioral fingerprint*
— a 4-tuple of normalized observables:

| Dimension | Definition | Range |
|-----------|------------|-------|
| `tool_call_distribution` | Normalized Shannon entropy of the tool-call type distribution (entropy divided by `log2(num_unique_tool_types)`) | `[0, 1]` |
| `error_rate` | Fraction of tool calls or actions that produced an error | `[0, 1]` |
| `task_completion_rate` | Fraction of declared tasks the agent completed before termination | `[0, 1]` |
| `response_token_variance` | Normalized variance of response token counts within the session | `[0, 1]` |

Every dimension is normalized to `[0, 1]` *at the source* before this validator
sees it. Normalization is the responsibility of whoever produces the
fingerprint, not the validator. The validator rejects out-of-range values.

## The score

For consecutive sessions `i` and `i+1`, the *fingerprint divergence* is the
L2 distance across the four dimensions:

```
d_i = sqrt( (a.tool_call_distribution - b.tool_call_distribution)^2
          + (a.error_rate              - b.error_rate)^2
          + (a.task_completion_rate    - b.task_completion_rate)^2
          + (a.response_token_variance - b.response_token_variance)^2 )
```

Maximum possible divergence between two legal fingerprints is `sqrt(4) = 2.0`
(one fingerprint at all-zeros, the other at all-ones).

For a window of `N` sessions, the validator computes the divergence sequence
`[d_1, d_2, ..., d_{N-1}]` of length `N-1`, then takes the *ordinary
least-squares slope* of `d` regressed on its index `i ∈ [0, N-2]`:

```
slope = sum_i (i - i_mean) * (d_i - d_mean) / sum_i (i - i_mean)^2
```

The maximum possible slope under linear regression of a divergence sequence
that walks from `0` to the per-pair maximum `2.0` over `N-1` indices is:

```
max_possible_slope = 2.0 / (N - 2)
```

The score is then:

```
entity_continuity = clamp(1.0 - slope / max_possible_slope, 0.0, 1.0)
```

A perfectly stable agent (zero divergence across the window) scores `1.0`. An
agent whose pairwise divergence ramps up linearly toward the per-pair maximum
across the window approaches `0.0`. A *negative* slope (an agent whose
behavior is converging) clamps to `1.0` — improving agents are not penalized,
per @nanookclaw's spec.

## Edge cases

The validator handles three boundary conditions explicitly:

1. **Underdetermined window (`N < 2`).** Per @nanookclaw's spec: undefined
   window means assume stable. The validator returns `entity_continuity: 1.0`
   with `window_status: "underdetermined"`.

2. **Window size of exactly 2.** The denominator `N - 2` is zero, so the
   max-slope normalization is undefined. The validator treats this the same
   as the underdetermined case: returns `1.0`, marks the window
   `underdetermined`. Two sessions can produce a single divergence value,
   but a single divergence cannot exhibit a slope.

3. **Constant tool-call mix.** When an agent never varies its tool selection,
   the Shannon entropy stays constant across all sessions in the window and
   the `tool_call_distribution` dimension contributes zero to every pairwise
   divergence. This is correct behavior, not a bug — it means the validator
   reads an agent's behavioral persistence partly through dimensions other
   than its tool-call mix when that mix is genuinely steady.

## Worked examples

The four reference vectors at `fixtures/validator-vectors/pdr-*.json`
produce these scores when run through the validator:

| Vector | `entity_continuity` | Notes |
|--------|---------------------|-------|
| `pdr-stable-agent.json` | `1.0` | Every fingerprint identical; slope is `0.0`. |
| `pdr-drifting-agent.json` | `0.9212` | Pairwise divergence ramps from `0.026` to `0.168`; slope `0.0197`. Drift is small but linear. |
| `pdr-improving-agent.json` | `1.0` (clamped) | Pairwise divergence shrinks from `0.333` to `0.004`; slope `-0.0325`. Negative slope clamps to `1.0`. |
| `pdr-invalid-out-of-range.json` | (validator error) | Third fingerprint has `response_token_variance: 1.42`, out of range; validator exits with code `1` and a clear error message. |

All four vectors are exercised by the test suite at
`scripts/validators/test-entity-continuity-pdr.js`.

## What this score is NOT

- **It is not a comprehensive trust signal.** Behavioral persistence is one
  property; it does not by itself answer questions of intent, alignment, or
  policy compliance. A consistent malicious agent and a consistent benign
  agent both score `1.0`. PDR composes with `behavioral_trust`,
  `governance_attestation`, and `peer_review` to give a fuller picture; it
  does not replace any of them.
- **It does not distinguish agent drift from environment drift.** Per
  @nanookclaw's Apr 22 comment, the current measurement treats both as drift,
  which is conservative but honest. A future schema may want
  `entity_continuity_intrinsic` vs `entity_continuity_adjusted` to separate
  the two; this validator implements the conservative reading.
- **It is not a real-time signal.** The window is `N=10` consecutive sessions
  by default. Detecting drift requires a session history; the score on
  session 1 of any deployment is always `1.0` (underdetermined).
- **It does not identify the cause of drift.** A score of `0.6` says behavior
  is changing at roughly 40% of the maximum detectable rate; it does not say
  *why*. Investigation is the consumer's job.

## Implementation

- Validator: `scripts/validators/entity-continuity-pdr.js` (309 lines, no
  external dependencies — pure Node).
- Test suite: `scripts/validators/test-entity-continuity-pdr.js` (300 lines,
  32 tests).
- Reference vectors: `fixtures/validator-vectors/pdr-*.json` (4 files).
- CLI:
  ```bash
  node scripts/validators/entity-continuity-pdr.js fixtures/validator-vectors/pdr-stable-agent.json
  # → {"entity_continuity": 1.0}

  node scripts/validators/entity-continuity-pdr.js path/to/window.json --verbose
  # → full result with divergences, slope, max_possible_slope, n_sessions, window_status
  ```
- Run tests:
  ```bash
  node scripts/validators/test-entity-continuity-pdr.js
  # → 32 passed, 0 failed
  ```

## Open questions for v0.2

1. Should the schema expose both an *intrinsic* and *adjusted* score (per
   @nanookclaw's Apr 22 boundary caveat), with the adjustment carrying an
   environment-fingerprint of its own?
2. Should `window_size` be a per-deployment policy parameter rather than a
   per-call input, so consumers compare scores across deployments using the
   same window definition?
3. Should the four observed dimensions remain fixed at the canonical four, or
   should the schema admit a custom-dimensions extension (with the constraint
   that all dimensions normalize to `[0, 1]` and the L2 distance still
   provides a bounded comparison)? The fixed-four shape is simpler and
   already works; the extensible shape would let domain-specific deployments
   add observables (e.g. cost-per-task, p99 latency) that matter to them.

These belong in follow-on issues, not in this PR.
