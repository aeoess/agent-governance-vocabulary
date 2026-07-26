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

## Why the worked example stays `exact` rather than `partial`

An objection raised in review: `exact` is defined as "Identical primitive, same signature
semantics," so a value the issuer never signs cannot be an exact match, and `passport_grade` should
be recorded as `partial` instead.

The canonical definition decides it. `passport_grade` is defined as "Composite trust grade from
agent passport issuance evidence." The canonical term itself describes a value derived from
issuance evidence, and `computePassportGrade(evidence, options)` produces exactly that. The
primitive is identical, so the match is exact.

What was false in the previous entry was carriage, not semantics: the claim that the value lived at
`passport.grade` inside the signed envelope. That is precisely the confusion this axis separates.

The test generalises. If a canonical definition describes a value as derived, an implementation
that derives it matches exactly and records `evidence: inferable`. If a canonical definition
requires the value to be carried or signed, an implementation that only computes it diverges on the
primitive itself and belongs in `partial` with the divergence stated. Read the canonical definition
first, then choose the match type, then record carriage separately.

Whether `exact` should be reworded to drop "signature semantics" is a separate question about the
match-type definitions and is deliberately not bundled here. It is noted for the `review_by` date.

## Coverage

The negative fixture at `crosswalk/_test-evidence-invalid.yaml` carries eight deliberate defects:
an unknown state, evidence paired with `no_mapping`, evidence declared without a `match`, missing
companions, empty companions on two different states, and a wrong type for `inferred_from`.
Disabling the evidence checks makes the suite fail with an explicit drift error rather than passing
quietly.

Positive coverage comes from production data rather than a fixture. `crosswalk/aeoess-aps.yaml`
now declares a real evidence state, so breaking the companion-requirement lookup makes a production
crosswalk fail validation.

The one thing still missing is an example from an independently maintained system. That cannot be
manufactured, and it is exactly what the promotion trigger requires before this axis stops being
`proposed`.
