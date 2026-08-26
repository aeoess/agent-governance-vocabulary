# governance-clause-counterexample

Non-normative fixtures for [#135](https://github.com/aeoess/agent-governance-vocabulary/issues/135).
They exercise one question: whether a verifier can construct one narrow finding from signed
evidence, that a recorded execution contradicted a specific machine-evaluable governance clause.

This directory introduces no vocabulary term. #36 is the source discussion and nutstrut declined
to coin one at this stage.

## The two fixtures

| File | Exercises | Expected |
|---|---|---|
| `01-spend-cap-contradiction.json` | successful construction: one verifying receipt, one uniquely selected governance version, one failed deterministic predicate | construction succeeds |
| `02-overlapping-governance-versions.json` | fail-closed version selection: two signed versions cover the stated timestamp | construction refuses |

## Construction rule

A counterexample is constructible only when all of these hold:

- receipt `R` independently verifies
- governance history `H` is pinned by digest
- each version in `H` carries a signed effective interval
- intervals use UTC instants and half-open semantics, `[effective_from, effective_until)`
- an absent `effective_until` means the version remains in force
- exactly one version `G` covers the timestamp stated by `R`
- cited clause `C` in `G` is machine-evaluable, or compiles deterministically to predicate `P`
- `P` fails against `R`

Half-open intervals are why the exactly-one rule is decidable. With closed intervals two adjacent
versions both cover the boundary instant, so every version boundary would fail construction.

## What a successful construction establishes

One claim: `R` contradicted `C` under `G`, selected using the timestamp stated by `R`.

Not drift, not recurrence, not significance, not system-wide nonconformance. Those need evidence
across multiple records and a separate review process.

The stated-timestamp limit is essential. A valid signature identifies who asserted the timestamp
in `R`. Unless that time is independently anchored, it does not establish when the execution
occurred. Each fixture carries that boundary in `selection.boundary` rather than only here.

## Which timestamp selects the version

`/timestamps/paid_at`, recorded in each fixture as `selection.stated_timestamp_pointer`.

The clause under test is a spend cap, so the instant that matters is the instant the spend
occurred. The receipt also states `delivered_at`, `issued_at` and `verified_at`. A fixture that
tested a delivery clause would point at a different member, and would say so in the same field.
The pointer is explicit in the data so no reader has to infer it.

## Composition boundary

Constructing the counterexample in `01` does not invalidate identity, continuity or authority
artifacts elsewhere in the evidence bundle. Those remain valid for the claims they independently
establish. The positive fixture carries that statement in `composition_boundary`.

## Provenance of the material

The SAR-402 receipt and the spend-cap predicate input were supplied by @nutstrut on #135, comment
`5305777390`, 2026-08-16, and are reproduced here byte for byte. He limited that contribution to
the deterministic receipt and spend-cap inputs and left the governance-history representation,
signed version intervals, `G` selection, clause binding and fixture composition to #135. Those are
built here.

Every key in this directory is an ephemeral fixture key used nowhere else. The governance-history
key is derived from a published seed, recorded in `governance_history.signing_key`, so anyone can
regenerate it and re-sign the versions.

## Reproducing the checks

Receipt digest: remove the top-level `integrity` member, serialize the rest with recursive key
ordering, compact separators and UTF-8, then SHA-256. `receipt.verification.preimage_hex` holds
those exact bytes. The Ed25519 signature is over the raw 32-byte digest.

Governance history digest: SHA-256 over the canonical JSON of the `versions` array as written,
signatures included. Each version signature is over the SHA-256 of that version object with its
own `signature` member removed.

## What these fixtures are not

Not a vocabulary term. Not a conformance requirement on any specification. They do not interpret
prose governance clauses and they do not establish trusted execution time.
