# Invariant Survival — Boundary-to-Boundary Continuity

> Co-authored with [@QueBallSharken](https://github.com/QueBallSharken) (Steven K. Hensley) from [BBIS](https://github.com/QueBallSharken/BBIS) (Boundary-to-Boundary Invariant Survival).
> Discussion: [aeoess/agent-governance-vocabulary#39](https://github.com/aeoess/agent-governance-vocabulary/issues/39).
> Scope: this artifact only, not BBIS itself. BBIS is QueBallSharken's framework; this document uses BBIS language and framing where it overlaps with the v0.1 `invariant_survival` descriptor.

This document is the long-form rationale for the `invariant_survival`
descriptor in `vocabulary.yaml`. The YAML carries the four enum values
and a one-line question. Everything that needs space to explain *why
the descriptor exists* and *what each value means in production* lives
here.

## The question being asked

The other descriptor dimensions in the vocabulary characterize what an
attestation *is*: whether it carries enforcement weight
(`enforcement_class`), where the verdict is anchored in time
(`validity_temporal`), where refusal authority lives
(`refusal_authority`), what level of replay is possible from the
recorded evidence (`replay_class`), and what class of action the
attestation governs (`governed_action_class`).

`invariant_survival` asks a different question: *how far does the
governing invariant survive toward the irreversible effect that
actually matters?*

The question is structural, not nominal. A system that authorizes an
action at the gate and produces a clean receipt may still leak: if the
gate's invariant is gone by the time the action commits, no receipt
can put it back. The descriptor exists because authorization receipts
and execution refusal capability are two different properties, and
governance vocabularies that conflate them produce false confidence
about systems that can no longer block what they earlier approved.

## The four values

The v0.1 enum is `["pre_action", "during_action", "post_action", "permanent"]`.

Each value describes how deep the invariant penetrates the path
between authorization and irreversibility. The values are ordered from
shallowest to deepest. They are not a quality ranking — a system may
correctly declare `pre_action` if the irreversible primitive happens
outside its claim scope. They are a coverage declaration.

### `pre_action`

The invariant is established and checked before the action begins, and
is no longer mechanically enforceable after the action starts. Once
execution begins, the system has no way to abort, invalidate, or
retroactively refuse the action.

This is the correct value for authorization-only systems: a receipt
issued at the gate, no live runtime enforcement after. It is honest
about what the system can do. The failure mode is using `pre_action`
as a description of the *system* when the claim scope actually extends
through execution; that misclassifies the coverage and overstates the
invariant's reach.

Most identity verification attestations are `pre_action`: the verifier
checks identity at admission, signs a receipt, and the issuer has no
further mechanical authority after the agent enters the system.

### `during_action`

The invariant survives into execution. Refusal capability is still
mechanically effective at one or more boundaries during the action,
not only at the entry gate. A multi-step action whose later steps can
still be aborted on invariant violation declares `during_action`.

The distinguishing property is *live refusal capability inside the
action*. A system that records intermediate states without being able
to stop them is not `during_action`; it is `pre_action` with extra
logging. In BBIS terms (per the canonical definition QueBallSharken
maintains): "if refusal exists in theory but cannot act in time, BBIS
is not satisfied for that boundary." The same test applies here. A
declaration of `during_action` claims live, in-time refusal at one or
more execution boundaries, not a written assertion that refusal could
have happened.

A delegation chain that re-evaluates scope at each sub-action against
the original delegation's invariant declares `during_action`. The
parent's invariant remains live across each child step; if a sub-step
exceeds the delegation, the invariant refuses.

### `post_action`

The invariant is recorded after the action completes. The recorded
evidence supports detection, dispute, audit, and later remediation,
but the invariant itself was no longer in a position to refuse before
the irreversible effect occurred.

Receipts, audit logs, and outcome attestations typically declare
`post_action`. The action was already irreversible by the time the
attestation was signed. The signature certifies what happened; it does
not certify that what happened was governed in flight.

This is the most common value across the vocabulary's settlement and
attestation primitives, and the value most often misread. A
`post_action` attestation is real evidence and a real input to
downstream policy. It is not, by itself, evidence that the system
could have refused the action. Consumers reasoning about whether a
governance failure is detectable versus *preventable* should read
`post_action` as "detectable, not preventable in isolation." A system
combining `post_action` evidence with separate live-runtime refusal
elsewhere may still satisfy the stronger property; the vocabulary
expresses that combination by declaring multiple signals at different
`invariant_survival` levels rather than collapsing them.

### `permanent`

The invariant survives all the way to the true irreversible primitive
for the claimed scope. Refusal capability remains live at the boundary
that actually makes the mutation binding. The governing basis cannot
be silently dropped by an intermediate boundary; if it would be
dropped, the system refuses before the irreversible effect.

`permanent` is the BBIS-satisfying value as defined in the canonical
framing: the same governing invariant remains live, binding, and
refusal-capable across every mutation-capable boundary in the claimed
path until the true irreversible primitive. Three properties have to
hold simultaneously for the declaration to be honest:

1. The system has identified the true irreversible primitive for the
   claimed scope, not an earlier convenient gate. (Misidentifying the
   primitive is a failure of the claim.)
2. Live refusal capability persists at the last pre-mutation boundary,
   not only at earlier ones.
3. Each mutation-capable boundary between the gate and the primitive
   either re-evaluates the invariant or is bound by an explicitly
   governed succession that preserves it.

The strictness is intentional. `permanent` is a stronger claim than
`during_action` — `during_action` covers some execution boundaries;
`permanent` covers all of them up to the irreversible effect. A system
that loses refusal capability at any boundary along the path declares
`during_action` instead.

## Composition with other descriptors

`invariant_survival` is one of five descriptor dimensions; it does not
operate in isolation. The combinations that matter most for downstream
consumers:

**`invariant_survival` × `refusal_authority`.** A system declaring
`permanent` invariant survival but `refusal_authority: consumer_policy`
is making a coherent but limited claim: the invariant survives to the
irreversible primitive, but the actual decision to refuse lives in the
consumer, not in the issuer or verifier. The invariant remained
live; whether it was acted on is the consumer's choice. This is
common for advisory-class signals: `enforcement_class: advisory`,
`invariant_survival: permanent`, `refusal_authority: consumer_policy`
— the issuer keeps the invariant alive all the way through but does
not force the gate.

A binding-class system claims more. `enforcement_class: binding` plus
`invariant_survival: permanent` plus `refusal_authority: issuer` or
`shared` describes a system that not only keeps the invariant alive,
but holds the refusal authority itself.

**`invariant_survival` × `validity_temporal`.** `at_issuance` paired
with `invariant_survival: pre_action` is the cleanest authorization
shape: the invariant is established once and not re-evaluated.
`continuously` paired with `during_action` or `permanent` claims live
re-evaluation at each boundary; the invariant is not a snapshot but
a running condition. The vocabulary does not currently forbid
combinations like `at_issuance` paired with `invariant_survival:
permanent`, but consumers should treat that combination as a request
for closer reading: it asserts that an issuance-time check is somehow
binding through to irreversibility, which only works if the
intervening boundaries can be shown to be governed by succession from
the original.

**`invariant_survival` × `replay_class`.** A system declaring
`permanent` invariant survival has stronger replay obligations: a
verifier should be able to replay the invariant evaluation at each
boundary along the path, not only at the gate. `replay_class:
full_replay` plus `invariant_survival: permanent` is the most
verifiable combination. `replay_class: fingerprint_only` plus
`permanent` requires the system to demonstrate that the fingerprint
captures enough state to reconstruct the invariant evaluation at each
intermediate boundary; a fingerprint that captures only the gate's
output cannot witness `permanent` survival.

## Worked examples from current crosswalks

The values in production today, taken from the merged `crosswalk/`
files:

- **APS** declares `invariant_survival: post_action` for its
  `decision_lineage` entries. The APS gateway records each delegation
  decision in a content-addressable receipt chain; the receipt is
  evidence after the decision. APS's runtime refusal lives elsewhere
  (in the gateway itself), and the relevant signal in that case
  declares `during_action`.
- **SAR** declares `invariant_survival: post_action` for its
  upgraded settlement receipts. The receipt binds the counterparty
  inside the signed bytes; it does not, by itself, claim that SAR's
  scoring authority remained live through the irreversible
  settlement. That property is asserted separately by the system
  composing SAR receipts.
- **AgentLair** declares `invariant_survival: post_action` for its
  peer_review receipts. The reviewing agent's verdict is a
  post-completion attestation; refusal-of-completion authority sits
  upstream in the delegating agent's pre-action authorization, not in
  the review.
- **MolTrust** declares `invariant_survival: post_action` for its
  trust packets. The packet is a recorded composite verdict; live
  refusal at the point-of-action sits with the consumer reading the
  verdict, not with MolTrust as the issuer.

No production crosswalk currently declares `invariant_survival:
permanent`. The vocabulary treats this as a real and expected gap:
strong BBIS conformance is not common in deployed systems, and
truthful crosswalks reflect that. A future system claiming `permanent`
will be reviewed against the three-property check above (true
primitive identification, last-pre-mutation refusal, governed
succession across boundaries). The descriptor exists so the claim can
be made when it is honest, not so the claim is rewarded by default.

## What `invariant_survival` is NOT

- **It is not a quality grade.** A correctly-declared `pre_action`
  attestation can be more useful in a given consumer policy than an
  incorrectly-declared `permanent` one. The descriptor declares
  coverage, not virtue.
- **It is not a replacement for `replay_class`.** Whether the
  invariant survived is a different question from whether a verifier
  can independently replay the evaluation. The two compose; they do
  not substitute.
- **It is not a complete BBIS conformance statement.** BBIS as
  QueBallSharken defines it requires explicit identification of three
  distinct boundaries (local refusal, system-wide refusal, true
  irreversible mutation authority) and a per-action trace at each.
  The single `invariant_survival` enum value summarizes that
  conformance into one of four positions; it does not carry the
  full per-action trace. Systems claiming strong BBIS conformance
  should reference the BBIS three-boundary refinement separately and
  link their per-action trace artifact.
- **It is not a permanent commitment to the v0.1 enum.** The four
  values are a deliberately coarse partition. v0.2 may split
  `during_action` into "single boundary" versus "all execution
  boundaries" if production systems surface a meaningful difference,
  or split `permanent` to separate "permanent within claim scope"
  from "permanent across all boundaries." The vocabulary catches up
  to the work, not the other way around.

## Open questions for v0.2

Three questions the WG should answer before tightening:

1. Does the four-value enum need to grow? Specifically, should
   `during_action` split between "single execution boundary" and "all
   execution boundaries up to the primitive minus one"? Production
   feedback from systems that re-evaluate at some-but-not-all
   boundaries will determine this.
2. Should `permanent` declarations be required to carry an explicit
   identifier of the true irreversible primitive (e.g.
   `irreversible_primitive_ref: <identifier>`), so the claim can be
   mechanically checked? Today the identifier is documented in prose;
   v0.2 may make it a structured field.
3. Should the descriptor accept a per-boundary array (e.g.
   `invariant_survival_path: [pre_action, during_action, permanent]`)
   for systems that genuinely span multiple coverage levels along
   the same path, rather than collapsing the path to its weakest or
   strongest segment?

Until then, the four enum values above are the v0.1 surface. BBIS as a
framework is QueBallSharken's; this descriptor is the vocabulary's
way of expressing one property BBIS articulates more strictly. The
vocabulary deliberately admits weaker claims (`pre_action`,
`during_action`, `post_action`) so that honest declarations can be
made by systems that do not aspire to full BBIS conformance, while
reserving `permanent` for systems that do.

