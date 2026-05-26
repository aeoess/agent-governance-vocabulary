# Cognitive Attestation — Determinability and Faithful Reduction

> Builds on the **Target Determinability** framework by [@schchit](https://github.com/schchit) (Yuqiang Wang, JEP). [Target Determinability under Partial Causal Observation: A Faithful Reduction Framework](https://zenodo.org/records/19678205) remains @schchit's work; this document uses the determinability criterion to ground the `cognitive_attestation` descriptor in the agent-governance vocabulary.
> Origin: [aaif/project-proposals#14](https://github.com/aaif/project-proposals/issues/14) comments 2026-04-23 and 2026-04-24, where @schchit identified the structural resonance between the Cognitive Attestation envelope and the determinability criterion, and we agreed to land the bridging documentation at the vocabulary layer.
> APS-side foundation: [*Cognitive Attestation: Signing Interpretable Decompositions of Latent Model State in AI Agent Governance*](https://zenodo.org/records/19646276) ([SSRN](https://doi.org/10.2139/ssrn.6677441)).
> Scope: this document is an AEOESS vocabulary artifact and does not imply Target Determinability endorsement. The framework remains @schchit's; the descriptor specification is ours.

This document is the long-form rationale for the `cognitive_attestation`
descriptor dimension. It explains what makes a cognitive attestation *faithful*
under the determinability criterion, and what the descriptor commits to and
does not commit to.

## How this composes with the existing JEP crosswalk

The vocabulary already includes [`crosswalk/jep.yaml`](../../crosswalk/jep.yaml)
— the Judgment Event Protocol mapping contributed by @schchit on 2026-04-15.
JEP captures the *event-level* judgment record: who decided, when, against
what reference. That is the wire-format layer.

`cognitive_attestation` as a descriptor operates one level deeper. It is
about *what was attested* — the structural claim the signed envelope makes
about the agent's latent reasoning state at the moment of decision. The two
compose; they do not conflict.

| Layer | Artifact | Question |
|------|----------|----------|
| Event | JEP crosswalk + envelope | What event happened, signed by whom, against which reference? |
| Cognitive | `cognitive_attestation` descriptor | What property of the reasoning state does the envelope commit to? |

Both can be present in a single end-to-end fixture. A JEP envelope carries
the event; the `cognitive_attestation` descriptor on that envelope declares
the determinability class of the reasoning fingerprint inside it.

## The determinability criterion

From @schchit's framework, a target fact is *determinable* from an observation
if and only if it is constant on every observation equivalence class. That
is: for any two observations `o1` and `o2` that an observer cannot distinguish
under the chosen observation map, the target fact must take the same value.

Applied to cognitive attestation: the *target fact* is a property of the
agent's latent reasoning state at decision time (for example, "constraint C
was considered before action A was selected"). The *observation* is the
signed attestation envelope. The descriptor commits to a conditional claim:

> A signed `cognitive_attestation` envelope may make a protocol-level
> attestation claim determinable from canonical signed bytes, provided
> that the relevant configuration family F, observation function Ω, target
> function D, and faithfulness / reduction assumptions are specified.

In Target Determinability terms, determinability is always relative to
`(F, Ω, D)`. The core criterion is that `D` must be constant on each
`Ω`-equivalence class. Two envelopes in the same equivalence class (same
canonical-bytes hash) must imply the same target fact, or the attestation
is not faithful relative to the named `(F, Ω, D)`.

## What `cognitive_attestation` is

A signal that an envelope carries a cryptographically-signed claim about the
agent's reasoning state, specifying:

1. **The reduction map** — what aspect of the latent state is being attested
   (constraints considered, candidate actions evaluated, confidence over
   chosen path, evidence cited).
2. **The faithfulness scope** — what equivalence class of observations the
   attestation covers, and therefore what target facts the envelope
   determines.
3. **The signing party** — who attests to the reduction (the agent itself,
   the gateway, an external observer with model access).
4. **The temporal binding** — whether the attestation was signed before,
   during, or after the attested decision (pre-commit, continuous, or
   post-hoc).

A `cognitive_attestation` signal in a receipt means: the envelope makes a
determinable claim about the cognitive state, the reduction map is named,
and a verifier can check faithfulness by recomputing the reduction over the
attested observation.

## What `cognitive_attestation` is not

- **Not a recording of the full reasoning trace.** Diarization records every
  token; attestation commits to a structured claim. The descriptor covers
  the latter, not the former.
- **Not a guarantee of reasoning soundness.** The attestation commits to
  *what was reasoned about*, not to *whether the reasoning was correct*. A
  faithful attestation of a flawed decision is still a faithful attestation.
- **Not a substitute for `entity_continuity` or `invariant_survival`.** Those
  descriptors cover behavioral drift and boundary-to-boundary continuity
  respectively. `cognitive_attestation` covers the per-decision reasoning
  state, not the cross-session pattern or the cross-boundary survival.
- **Not a privacy-preserving abstraction by default.** A cognitive attestation
  may reveal latent state to verifiers. Privacy preservation (selective
  disclosure, zero-knowledge proofs over the reduction) is a separate concern
  and is not in scope for the descriptor v0.1.

## Boundary conditions

The descriptor commits to vocabulary-layer framing only. It does not claim
or imply:

1. `cognitive_attestation` does not make latent cognition directly
   observable.
2. JEP records and verifies signed protocol events, not cognitive truth.
3. Same canonical bytes determine the same protocol-level commitment, not
   the actual internal reasoning state itself.
4. `precondition_set`, `candidate_set`, `decision_path`, and
   `pre_commit_chain` are reduction-map / faithfulness scopes, not truth
   levels.
5. v0.1 stays at vocabulary-layer framing only. No verifier semantics, no
   implementation guidance.
6. The v0.1 vocabulary schema does not carry (F, Ω, D). Faithfulness
   checking as defined is the correctness condition; structural support
   for (F, Ω, D) in signed envelopes is future work outside v0.1 scope.
   A downstream consumer reading a bare `cognitive_attestation` value
   without the qualifier sees a less-rigorous claim than the
   determinability criterion strictly requires.

A `cognitive_attestation` envelope can make a protocol-level attestation
claim determinable from canonical signed bytes only relative to a specified
configuration family `F`, observation function `Ω`, target function `D`, and
reduction / faithfulness assumptions. The envelope does not by itself prove
the external truth of the latent reasoning state, model intent, correctness,
legal responsibility, or normative accountability.

## Composition with adjacent descriptors

`cognitive_attestation` composes naturally with three existing descriptors:

| Adjacent descriptor | Composition |
|---------------------|-------------|
| `delegation_chain` | The attestation may bind to the delegation chain hash, asserting that the reasoning was constrained by a specific authority chain at decision time. |
| `entity_continuity` | A behavioral fingerprint dimension may include attestation-class statistics (rate of faithful vs unfaithful claims), feeding into the PDR slope. |
| `invariant_survival` | An invariant about reasoning may be attested across boundaries — for example, "no decision in this session relied on constraint C" — turning a cognitive property into a survival check. |

These compositions are descriptive; the descriptor v0.1 does not enforce them.
They establish where future fixtures can compose `cognitive_attestation` with
existing structural and behavioral signals.

## Determinability classes (v0.1)

The descriptor v0.1 recognizes three determinability classes for cognitive
attestations, ordered by strength:

These classes are AEOESS's v0.1 taxonomy proposal. The Target Determinability framework review by @schchit covers the determinability criterion itself, not endorsement of this specific taxonomy.

| Class | Definition | Example |
|-------|------------|---------|
| `precondition_set` | Attestation commits to which preconditions were available at decision time (delegation scope, policy constraints, tool availability, context window). | "At step 3, the agent was operating under delegation D with scope S, with tools T1..Tk available." |
| `candidate_set` | Attestation commits to which candidate actions were evaluated and which were eliminated, with elimination reasons. | "At step 3, the agent considered actions {transfer, deny, escalate}. Transfer eliminated: violates policy 4.2." |
| `decision_path` | Attestation commits to the chosen path with confidence and the structured reasoning that selected it. | "At step 3, the agent chose 'deny' with confidence 0.91, citing constraint compliance." |

Each class corresponds to a different reduction map and a different
faithfulness scope. A signal entry can carry exactly one class per envelope;
multiple envelopes may compose to cover multiple classes across a session.

The three classes are *not* a hierarchy of correctness. They are different
contracts between attestor and verifier. `precondition_set` is the cheapest
to produce and the least informative; `decision_path` is the most
expensive of the v0.1 set and the most informative. Choice of class is an
integration decision, not a vocabulary requirement.

## Boundaries

The descriptor v0.1 explicitly does not standardize:

- The reduction map syntax (left to implementers and future work)
- The signing-key class required (the descriptor inherits the receipt's
  `system_attributes.signature_capability`)
- The verifier algorithm for checking faithfulness (separate spec work)
- The privacy posture of the attestation (orthogonal concern)

What v0.1 does standardize: the determinability framing, the three classes,
the composition rules, and the boundaries above.

## Future work

The `pre_commit_chain` class is deferred to v0.2. It attests to chained
pre-commitments emitted *during* reasoning, before the final decision is
signed. The final envelope binds all prior pre-commit attestations. The
full specification of continuous attestation during generation depends on
tighter integration with model generation loops than current SDK/model
interfaces support, and the determinability criterion may need extension
to handle streaming observation maps cleanly. It is named here as a v0.2
candidate and is not part of the v0.1 surface.

We expect v0.2 to be informed by:
- Operator experience with v0.1 `decision_path` attestations
- Extensions to the Target Determinability framework for streaming
  observations, if @schchit's theoretical work extends in that direction
- Convergence with cognitive-attestation primitives in adjacent ecosystems
  (model-internal interpretability research, frontier-model evaluation suites)

## References

- [Target Determinability under Partial Causal Observation: A Faithful Reduction Framework](https://zenodo.org/records/19678205) (@schchit, 2026)
- [Cognitive Attestation: Signing Interpretable Decompositions of Latent Model State in AI Agent Governance](https://zenodo.org/records/19646276) ([SSRN](https://doi.org/10.2139/ssrn.6677441)) (Pidlisnyi, 2026)
- [JEP crosswalk](../../crosswalk/jep.yaml) (@schchit, 2026-04-15)
- [aaif/project-proposals#14](https://github.com/aaif/project-proposals/issues/14) — origin thread
