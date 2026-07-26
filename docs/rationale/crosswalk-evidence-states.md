# Rationale: `crosswalk_evidence_states`

Status: proposed. Review by 2026-11-30.

## The problem

A crosswalk entry recorded `match`, which says how closely the target primitive corresponds. It had
no way to say whether the emitting artifact actually carries the value.

That left three different situations sharing one representation. A value the artifact emits, a
value a consumer computes from fields the artifact emits, and a value the artifact only points at
all appeared as an ordinary mapping. A reader could not tell them apart, and the contributor had no
honest option: recording a computed value as a plain mapping reads as stronger than the system
being described, and recording it as `no_mapping` understates a value the consumer can genuinely
obtain.

This is the failure the registry already rejects elsewhere. A verifier that reports
could-not-verify as valid has removed the distinction its reader most needs.

## Why a separate axis rather than more match types

`match` and `evidence` answer independent questions, and all combinations occur. A mapping can be
`exact` in shape while the artifact never carries the value. A `partial` mapping can be emitted
directly. Folding carriage into `match` would overload a term whose job is semantic correspondence,
and it would make `partial` mean two unrelated things at once.

## The motivating case, which is our own

`crosswalk/aeoess-aps.yaml` recorded `passport_grade` as `match: exact` with
`aps_field: passport.grade`, and stated that the grade is embedded in the signed passport envelope.

Neither is accurate. No passport type in the emitting SDK declares a `grade` field, and an emitted
passport carries none. The grade is computed by `computePassportGrade(evidence, options)` from an
issuance evidence record. The entry described a field that does not exist.

The first correction this axis produces is therefore a demotion of the registry maintainer's own
entry, not a promotion of it. That is the intended direction. An axis that only ever made other
people's mappings look weaker would be worth distrusting.

## Why `status: proposed`

The axis is introduced from one implementation. The registry's own rule is that a
single-implementation term lands as `proposed` with a `review_by` and a `promotion_trigger`, never
as settled. Applying a weaker bar to the registry's own schema than to a contributor's term would
be the self-grounding exemption `CONTRIBUTING.md` already forbids.

Promotion trigger: two or more crosswalks from independently maintained systems declare an evidence
state, and at least one declares something other than `emitted`.

## Known incompleteness

Three states are almost certainly not the final set. `referenced` was added before merge precisely
because the first fixture exposed the gap: a revocation status resolved against issuer state is
neither emitted nor computable. Conditional emission, where a field appears only under some
profiles, and issuer-recomputed values, where the issuer performs the derivation and then asserts
the result, are both plausible future states.

The set is therefore additive by construction. Consumers must treat an unknown evidence value as
unspecified rather than failing, so a later state cannot break an existing reader.

## What this does not do

It does not verify that a declared `emitted` path resolves to a real field. The validator checks
that the companion fields are present and non-empty, which is a structural check, not evidence
verification. A contributor can declare `emitted` and cite a path that does not carry the value.
That claim is falsifiable by opening the published fixture required by the independent-implementation
bar, and catching it is a reviewer obligation rather than a CI guarantee.

It does not reinterpret any merged crosswalk. Absent means unspecified, and unspecified never
upgrades.
