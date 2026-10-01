# Boundary map

Proposed map of the contributions and connections discussed in [#177](https://github.com/aeoess/agent-governance-vocabulary/issues/177). Draft. Change it by pull request, like any other file here. Non-normative. It confers no vocabulary term and defines no required stack. Being listed here, mentioned in the thread, or expressing interest does not establish membership in anything or agreement to any pilot.

Each node is owned by its own project. Each edge records what one project produces that another project consumes or checks, what that check does not establish, and how far the edge has been exercised. The principles it follows are in [PRINCIPLES.md](../PRINCIPLES.md), in particular 3 (no required central protocol), 4 (verification is not endorsement) and 5 (claims stay at their layer).

## How to read this file

**Nodes** are projects, one each. A project is described from its own comment, which is linked.

**Edges** are the unit of work. An edge exists when one project's artifact crosses into another project's check. An edge is not a stage in a pipeline. Most projects below produce evidence independently of each other, and any subset of edges can be composed without the rest.

**Field mappings.** This draft reuses the existing crosswalk match types from `vocabulary.yaml` (`crosswalk_match_types`: `exact`, `structural`, `partial`, `false_analog`, `no_mapping`) for field mappings on edges. Applying them to boundary fields is a proposed convention for review, not something `vocabulary.yaml` already governs. Every classification below is the editors' proposal until the owners on both sides confirm it. A relationship nobody has assessed is recorded as not evaluated, never as `no_mapping`: `no_mapping` is a settled finding that no analog exists, and missing evidence is not that finding.

Three things are recorded separately for every edge and never merged:

- **Progress**, how far the edge has been exercised. More than one can hold at once.

  | progress | meaning |
  |---|---|
  | `reproduced` | Someone ran the pinned artifact through a consumer and got the published outcomes. The record says who ran it and whether they authored the implementation. A rerun by the author is a reproduction, not independent evidence. |
  | `pinned` | Artifacts and expected outcomes are pinned to commits and digests in a public record. |
  | `scoped` | The scope is agreed in writing. Nothing has been run. |
  | `proposed` | Named in the thread. No pinned artifact yet. |

- **Provenance**, who proposed or confirmed the connection and who ran which check. A connection that no owner has proposed is marked `inferred by editors` here. That describes where the idea came from, not how far it has been tested.

- **Claim results**, quoted in the vocabulary of the project that emitted them. `COMPLIANT`, `NON_COMPLIANT`, `rely`, `ESTABLISHED`, `CONTRADICTED`, `NOT_ESTABLISHED`, `not_evaluated` and similar are never mapped onto each other and never summarized into an aggregate verdict. In particular `not_evaluated` is not `NOT_ESTABLISHED`, and neither is `CONTRADICTED`.

**Independent record** follows the conformance lab's rule: a record is independent when the party supplying the recomputation authored neither the fixtures nor the implementation that checks them. Independence is stated per claim or per layer, not per run.

## Nodes

| project | owner | produces or consumes | source |
|---|---|---|---|
| AgentAvow | @kenneives | Signed scan attestation for a tool (MCP server, package, repo, skill): compact JWS over an RFC 8785 canonical verdict, carrying `scan.toolManifestDigest` over the tool definitions the scan observed | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5893438004) |
| Agent Passport System (APS) | @aeoess | Delegation and decision evidence: action intent receipt, policy decision receipt and decision evidence, identified by `decision_ref` | [#177](https://github.com/aeoess/agent-governance-vocabulary/issues/177) |
| PIC Standard | @madeinplutofabio | Pre-execution action gate: a signed attestation binding evidence to the proposed tool, arguments, impact, claims and provenance, with an allow or block outcome | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5890595191) |
| PriorSeal | @imokokok | Before execution, a principal-signed exact-call authorization that carries external decision evidence. After execution, a receipt and a comparison of the observed call against the authorization | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5885120538) |
| Insight | @imokokok | Signed `OracleSafetyCheck` evidence. A separate project from PriorSeal that can compose with it. A lab interop record exists (`interop/insight-oracle-safety-check-13bd3ed`). No cross-project boundary was proposed in #177 | same comment |
| argentum-core | @giskard09 | Its `action_ref` artifact: SHA-256 over an RFC 8785 canonicalization of the decision inputs, anchored on chain through `AnchorRegistry`. `action_ref` is an artifact of this node, not a separate project | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5887743729) |
| WasmAgent / Agent Evidence Protocol (AEP) | @telleroutlook | Machine-checkable evidence records and an installable conformance corpus with separate structural, semantic, authenticity and chain checks | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5884884800) |
| REMORA-research | @darklordVirtual | Runtime capability evidence for a bounded claim: every recorded tool invocation belongs to the declared tool set for the identified runtime configuration. `runtime_capability_surface_completeness` stays `NOT_ESTABLISHED` | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5885614008) |
| Veritas Acta | @tomjwxf | Signed receipts and receipt chains ([draft-farley-acta-signed-receipts](https://datatracker.ietf.org/doc/draft-farley-acta-signed-receipts/)), verifiable offline with [@veritasacta/verify](https://github.com/VeritasActa/verify). Test vectors are published at [ScopeBlind/agent-governance-testvectors](https://github.com/ScopeBlind/agent-governance-testvectors), linked as evidence only | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5885617993) |
| Frequency | @altrudev | Independent verification of claims, artifacts and cross-project relationships against explicit evidence, one result per claim. No commit designated for external testing yet | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5885397094) |
| Assay | @Rul1an | The project the standalone corpus-adequacy tool came out of. No interoperability boundary for Assay itself was proposed in #177 | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5885883462) |
| corpus-adequacy | @Rul1an | A standalone tool that came out of Assay. Mutation-adequacy report for a published corpus: which seeded checker faults the corpus kills and which survive, with a positive and an inert control | same comment |
| Default Settlement / DefaultVerifier | @nutstrut | Independent evidence evaluation and portable verification artifacts for autonomous systems. Produces portable SAR v0.1 receipts with PASS, FAIL or INDETERMINATE verdicts over a frozen six-field signed core, and can consume pinned external artifacts for independently implemented evaluation. Claim ceiling: a valid SAR receipt establishes the signed evaluator result for the referenced task or evidence under the applicable profile. It does not by itself establish authority validity, execution occurrence, completeness, independent observation or adoption by another system. No edge until a first bounded pilot is chosen | [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5902118417) |

Supporting projects, listed separately: this vocabulary (crosswalks and match types) and the [Agent Authority Conformance lab](https://github.com/Agent-Authority-Conformance/aps-conformance-suite) (run records with per-claim attribution).

## Graph

```
                         RUNTIME BOUNDARIES

                       ┌───────────────────────┐
                       │       AgentAvow       │
                       │ signed static verdict │
                       │   over a tool digest  │
                       └────┬─────────────┬────┘
                            ║             ┆
  E1 pinned, reproduced,    ║             ┆ E4 proposed
  into an APS-side consumer ║             ┆
            ╔═══════════════╝             └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
            ▼                                                ▼
 ┌───────────────────────┐    E5 proposed    ┌───────────────────────┐
 │          APS          │                   │          PIC          │
 │ authority and decision│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄▶ │     pre-execution     │
 │       evidence        │                   │         gate          │
 │                       │                   └───────────────────────┘
 └─────┬───────────┬─────┘
       ║           ║
       ║ E2        ║ E3
       ║ pinned,   ║ pinned,
       ║ reproduced║ reproduced
       ▼           ▼
 ┌─────────────┐ ┌─────────────────┐
 │  PriorSeal  │ │  argentum-core  │
 │ authorizes  │ │   action_ref    │
 │ before, and │ │ (both sides can │
 │ compares    │ │  compute it)    │
 │ after       │ │                 │
 └─────────────┘ └─────────────────┘


 ┌─────────────┐  E8 proposed   ┌─────────────┐  E7 proposed   ┌──────────────────┐
 │  AgentAvow  │ ┄┄┄┄┄┄┄┄┄┄┄┄▶  │   REMORA    │ ┄┄┄┄┄┄┄┄┄┄┄┄▶  │ a verifier from  │
 │ tool digest │                │ declared    │                │ another project  │
 └─────────────┘                │ tool set    │                └──────────────────┘
                                └─────────────┘

 ┌─────────────┐  E9 pinned,    ┌──────────────────┐
 │     AEP     │  reproduced    │ Conformance lab  │
 │ evidence and│ ════════════▶  │ layered run      │
 │ corpus      │                │ record           │
 └─────────────┘                └──────────────────┘

 ┌─────────────┐  E6 proposed   ┌──────────────────┐
 │ Veritas Acta│ ┄┄┄┄┄┄┄┄┄┄┄┄▶  │   paying side    │
 │ signed      │                │ receipt before   │
 │ receipts    │                │ money moves      │
 └─────────────┘                └──────────────────┘

 ┌─────────────┐                ┌─────────────┐                ┌────────────────────┐
 │   Insight   │                │    Assay    │                │ Default Settlement │
 │ signed      │                │ parent of   │                │ DefaultVerifier    │
 │ safety      │                │ the adequacy│                │ independent        │
 │ evidence    │                │ tool        │                │ evaluation, SAR    │
 └─────────────┘                └─────────────┘                └────────────────────┘
   no boundary proposed in #177 for any of these yet


                         ASSURANCE EDGES
               outside the runtime graph, observing it

 ┌─────────────────────┐  A1 scoped   ┌──────────────────┐
 │      Frequency      │ ┄┄┄┄┄┄┄┄┄┄▶  │   E2 artifacts   │
 │ per-claim, from its │              └──────────────────┘
 │ own implementation  │
 └─────────────────────┘

 ┌─────────────────────┐  A2 scoped   ┌──────────────────────────┐
 │   corpus-adequacy   │ ┄┄┄┄┄┄┄┄┄┄▶  │ Frequency checker over   │
 │ can the corpus tell │              │ the E2 corpus            │
 │ a broken checker    │              └──────────────────────────┘
 │ from a correct one? │  A3 run      ┌──────────────────────────┐
 │                     │ reported ─▶  │ REMORA                   │
 └─────────────────────┘              │ evidence-sufficiency-v1  │
                                      └──────────────────────────┘


                     SUPPORTING PROJECTS

   Agent Governance Vocabulary          Agent Authority Conformance lab
   crosswalks and match types           pinned, reproducible run records
   exact, structural, partial,          per-layer attribution and
   false_analog, no_mapping             independence labels


 Legend
   ════▶   pinned artifact, exercised
   ┄┄┄┄▶   proposed or scoped, not run
   ─▶      run reported by its owner, not inspected here
```

**This is a graph, not a stack.** Arrows show independently owned boundaries that can compose. They do not mean every project is required, and a line does not imply that two projects share an internal protocol. Why each line is solid or dotted is recorded in the edge sections below, which are the source of truth for this picture.

## Runtime edges

### E1. AgentAvow -> APS-side consumer

- **Producer and artifact.** AgentAvow scan attestation for `github/github-mcp-server`, published as [tool-manifest-digest-vectors-v0](https://github.com/AgentAvow/AgentAvow/tree/main/docs/standards/tool-manifest-digest-vectors-v0): one JWS, its `scan.toolManifestDigest`, and five expected outcomes for a consuming gate (digest match, digest mismatch, past expiry, wrong subject, tampered payload). Gate input is three fields: `subject_id`, `observed_manifest_digest`, `evaluation_time`.
- **Consumer.** An APS-side consumer using `agent-passport-system` 7.2.0 primitives (JCS canonicalization, strict Ed25519 verification). Not yet an APS decision context. Using the attestation inside an APS tool decision is blocked on the two mappings below.
- **Field mappings** (proposed, owners to confirm).
  - Binding from AgentAvow `subject.id` to an APS `requestedToolName`: not evaluated. The subject identifies a repository or server, and `scan.toolDigests` is keyed by file path, so the attestation carries no tool name for a binding either way.
  - Substituting AgentAvow `subject.id` for APS `requestedToolName`: proposed `false_analog`. A gate that wired one in as the other would authorize a tool on the strength of a grade about a server.
  - AgentAvow `scan.toolManifestDigest` as an APS `capabilityMetadataDigest`: proposed `false_analog`. The AgentAvow digest is folded over per-file digests of every observed definition. The APS digest hashes one tool's declared metadata under a required domain label. Different preimages and domains.
  - `evaluation_time`: supplied by the consumer as the reference instant. No field mapping needed.
- **What this edge checks.** The five axes AgentAvow defines, each reported separately: `signature_valid`, `canonical_bytes`, `subject_binds`, `digest_binds`, `fresh`.
- **What it does not establish.** Which APS tool the attestation is about. That the AgentAvow digest equals any APS metadata pin. Anything about runtime behavior, per the fixture's own claim ceiling.
- **Pinned artifact.** AgentAvow `4404df2c`, `tool-manifest-digest-v0-vectors.json`, read unchanged.
- **Progress.** `pinned`, `reproduced`.
- **Provenance.** Proposed by @kenneives. Run by @aeoess: all 30 expected axis results match, each negative failing exactly its own axis ([comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5899072203)). A second implementation, run by the consuming project. Not an independent record. @kenneives confirmed both `false_analog` mappings from the AgentAvow side ([comment](https://github.com/aeoess/agent-governance-vocabulary/pull/179#issuecomment-5905478185)), and the fixture README states both boundaries at AgentAvow [`50c144f`](https://github.com/AgentAvow/AgentAvow/commit/50c144f).
- **Owners.** AgentAvow owns the fixture and its claim ceiling. APS owns the consumer.
- **Remaining.** AgentAvow's [tool-manifest-digest-vectors-v1](https://github.com/AgentAvow/AgentAvow/tree/main/docs/standards/tool-manifest-digest-vectors-v1) adds the binding from tool name to subject, one signed digest per served tool keyed by tool name. The APS-side consumer reproduced it as a second implementation at AgentAvow `0727e5e9`, matching all three tool digests and all six cases ([comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5941651625)). Two encoding details are unresolved. The key encoding text says "outside printable ASCII" while both fixture implementations encode space, and a truncation rule for long names is mentioned but not specified. The v1 consumer is local and not yet published. The v0 consumer is published at APS [`fd47f34`](https://github.com/aeoess/agent-passport-system/commit/fd47f34) under `examples/interop/agentavow/`, and the fixture README links it with the second-implementation label at AgentAvow [`d2760c6`](https://github.com/AgentAvow/AgentAvow/commit/d2760c6).

### E2. APS -> PriorSeal

- **Producer and artifact.** APS decision evidence at [`948f99b8`](https://github.com/aeoess/agent-passport-system/commit/948f99b85343bef2c6fa677c8543965caacfc087), `fixtures/priorseal-decision-binding/`: four cases (permit, narrow, deny, expired), each an action intent receipt, a policy decision receipt and its decision evidence, under pinned test keys.
- **Consumer.** PriorSeal, the offline payment-limit pair at [`d749d269`](https://github.com/imokokok/PriorSeal/commit/d749d2691c3e6be139de4020e7b27cdafca2c428), `examples/aps-priorseal-decision-binding-v1/`: an exact-call authorization before execution, a comparison against synthetic observations after. [`b867ac5`](https://github.com/imokokok/PriorSeal/commit/b867ac556be6650715e10e20d3d225618c6115c1) later corrects provenance wording only.
- **Field mappings** (proposed, owners to confirm).
  - APS `decision_ref` -> the context commitment inside the PriorSeal authorization: `partial`. Carried and correlated as opaque bytes, never interpreted by PriorSeal.
  - APS `spend.per_action` cap -> PriorSeal signed exact-call value: `partial`. One is a ceiling and one is an exact amount. They are separate claims, because the over-limit observation violates both and one aggregate result cannot say which check caught it.
- **What this edge checks.** Six claims, one entry each in the lab record: APS evidence verifies under pinned keys at the reference time, PriorSeal signatures verify, `decision_ref` correlation, exact call versus observation, APS cap compliance, byte reproduction of the published report. PriorSeal's own outcomes: `COMPLIANT` within limit, `NON_COMPLIANT` with `TRANSACTION_VALUE_MISMATCH` over limit.
- **What it does not establish.** Independently observed chain execution, live APS currency at execution time, decision-level single use, that any transaction was sent, production use of either project.
- **Pinned artifact.** Inputs above, report SHA-256 `d2c1bea5…`, reference time `2026-09-19T10:05:00.000Z`, recorded in lab [#138](https://github.com/Agent-Authority-Conformance/aps-conformance-suite/issues/138) and the open record PR [#139](https://github.com/Agent-Authority-Conformance/aps-conformance-suite/pull/139).
- **Progress.** `pinned`, `reproduced`.
- **Provenance.** Proposed through aps#163 and built by @imokokok. Run by @aeoess from a fresh clone: `npm run test:aps-priorseal` 26 of 26, report reproduced byte for byte. Claims 2 and 4 are independent (aeoess authored neither PriorSeal's signed objects nor its checks). @imokokok published a Mode A run of the original APS verifier ([#139 comment](https://github.com/Agent-Authority-Conformance/aps-conformance-suite/pull/139#issuecomment-5901343345)). It is added to open lab PR #139 as a separate candidate independent record for claim 1 (commit `6ee1765`), inclusion pending the lab's review of #139. Claims 3, 5 and 6 have no independent record.
- **Owners.** APS owns the producer fixtures. PriorSeal owns the pair and report.
- **Remaining.** Review of #139. Independent verification (A1).

### E3. APS <-> argentum-core (`action_ref`)

- **Producer and artifact.** argentum-core's `action_ref` derivation and its conformance sets, and the APS SDK's correlation helper that reproduces that derivation, with published vectors at `conformance/action-ref-v1/vectors.json`.
- **Consumer.** Either side. Each computes the other's digest from the shared input domain.
- **Field mappings** (proposed, owners to confirm).
  - APS correlation helper output <-> argentum `action_ref`: `exact` over the input domain both profiles accept. The one divergence found in [argentum-core#35](https://github.com/giskard09/argentum-core/issues/35) was profile enforcement, fixed at `62930b59`.
- **What this edge checks.** Byte agreement on accepted inputs, and rejection of out-of-profile inputs before any digest work.
- **What it does not establish.** Anything about the anchoring layer, timing of anchors, or the truth of the decision inputs.
- **Pinned artifact.** argentum-core `62930b59` and the APS vector file.
- **Progress.** `pinned`, `reproduced`.
- **Provenance.** Reported by @aeoess in #35 and fixed by @giskard09. Rerun by @aeoess at `62930b59` ([comment](https://github.com/giskard09/argentum-core/issues/35#issuecomment-5138236932)): argentum's validators `action-ref-v1-domain-negative` 7 of 7 and `action-ref-v2` 3 of 3, all five timestamp variants rejected with zero SHA-256 constructions during the call, `av-007` accepted with the expected digest, every accepted 4-field preimage in the fixtures replayed and matching. The validators are argentum's, so that part is independent of the runner. The parity side uses the APS helper, authored by the runner.
- **Owners.** argentum-core owns the derivation and its sets. APS owns the helper and its vectors.
- **Remaining.** The `action_ref` portion of [`crosswalk/mycelium-trails.yaml`](../crosswalk/mycelium-trails.yaml) was refreshed against argentum action-ref spec v1.2 in #180, merged 2026-10-01, with @giskard09's approval.

### E4. AgentAvow -> PIC

- **Producer and artifact.** The E1 fixture.
- **Consumer.** A PIC Action Proposal carrying the three gate fields.
- **Field mappings.** None recorded. PIC has not yet defined how external evidence enters an Action Proposal.
- **Progress.** `proposed`.
- **Provenance.** Proposed by @kenneives, who offered to shape the fixture to PIC's Action Proposal.
- **Owners.** AgentAvow owns the fixture. PIC owns the consumer.
- **Remaining.** PIC defining how external authority and evidence become PIC evidence, and who is trusted to sign it.

### E5. APS -> PIC

- **Producer and artifact.** APS authority for one bounded synthetic MCP action.
- **Consumer.** PIC checks the action at the protected tool. An operator who built neither component runs the allowed call and altered or unsupported calls.
- **Field mappings.** None recorded.
- **Progress.** `proposed`.
- **Provenance.** Proposed by @madeinplutofabio. APS side agreed in the thread.
- **Owners.** PIC leads the pre-execution scope and test cases. APS defines its own side. The first operator should be outside both projects.
- **Remaining.** The same PIC definition as E4.

### E6. Veritas Acta -> paying side

- **Producer and artifact.** Acta receipts and receipt chains, verifiable offline against published vectors.
- **Consumer.** The paying side, which checks before money moves that every billed item has a signed receipt, that none is missing, and what an independent re-check found.
- **Field mappings.** None recorded for this edge.
- **Progress.** `proposed`.
- **Provenance.** Proposed by @tomjwxf, who wants one consuming project for a pilot.
- **Owners.** Veritas Acta owns the receipt format and verifier. The consuming project is unnamed.
- **Adjacent existing work, not evidence for this edge.** [`crosswalk/aps-acta.yaml`](../crosswalk/aps-acta.yaml) is a pairwise composition crosswalk between APS and Acta, calibrated against APS 2.6.0 with Acta-side review pending, so it is not current.
- **Remaining.** A consuming project.

### E7. REMORA -> a verifier maintained by another project

- **Producer and artifact.** One REMORA evidence artifact with the bounded claim above, and five test vectors: a valid artifact supports the claim, an undeclared tool invocation contradicts it, a changed runtime or authority binding prevents reliance on the original attribution, missing observation coverage prevents any claim about all activity, evidence of an alternative execution path defeats any exclusivity claim.
- **Consumer.** A verifier maintained by another project, to be named.
- **Field mappings.** None recorded.
- **Must keep separate.** A contradicted claim from one that cannot be established. A narrower claim survives only where the remaining evidence still supports it.
- **Progress.** `proposed`.
- **Provenance.** Proposed by @darklordVirtual.
- **Remaining.** A consuming verifier.

### E8. AgentAvow `scan.toolManifestDigest` <-> REMORA declared tool set

- **Producer and artifact.** The digest from E1 on one side, REMORA's declared tool set for a runtime configuration on the other.
- **Field mappings.** Not evaluated. Whether the two describe the same set, and at what time, is the question the edge would answer.
- **What it could check.** Declared set at grade time versus observed set at run time.
- **Progress.** `proposed`.
- **Provenance.** Proposed by @kenneives ([comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5893438004)).
- **Remaining.** Both owners agreeing what "the same tool set" means across a static grade and a runtime trace.

### E9. AEP corpus -> conformance lab driver

- **Producer and artifact.** The AEP conformance corpus for the component tuple published as `aep-certified-2026-09-13-03`: 28 fixtures with a manifest, pinned by component SHA and confirmed by the AEP maintainer. That target is historical and immutable. The current AEP certified target is `aep-certified-2026-09-16-01`, which supersedes `-03` ([comment](https://github.com/aeoess/agent-governance-vocabulary/pull/179#issuecomment-5901735000)). The recorded run's scope, pinned evidence and claim ceiling are unchanged.
- **Consumer.** An outside driver that reports exactly which layers it independently checked. Importing the WasmAgent semantic evaluator does not count as independent semantic verification, per AEP's own implementer rules.
- **Pinned artifact.** Lab record [`interop/wasmagent-aep-2026-09-13-03/RUN.md`](https://github.com/Agent-Authority-Conformance/aps-conformance-suite/blob/main/interop/wasmagent-aep-2026-09-13-03/RUN.md), with pinned component SHAs, checksums and byte-reproducible outputs.
- **Progress.** `pinned`, `reproduced`.
- **Provenance.** @telleroutlook reported in #177 that this boundary had already been exercised with the lab. The record's runner is @aeoess. Per layer: native JS record and chain observations and Rust DSSE observations are independent (Mode A, implementations by WasmAgent). The lab semantic recomputation is author-produced (Mode B, harness authored by the runner) and claims no independent record. 28 of 28 fixtures agree with the manifest.
- **Owners.** AEP owns the corpus and rules. The lab owns the record.
- **Remaining.** An independent semantic implementation, and reuse of the pattern by other projects, which is what @telleroutlook asked for.

## Assurance edges

These sit outside the runtime action graph. They consume artifacts, corpora or checkers and emit verification or measurement records. Their results never inherit from the edge they observe, and an edge's result never inherits from them.

### A1. Frequency -> E2 artifacts

- **What it would emit.** One result per claim: APS evidence validity, `decision_ref` binding, PriorSeal authorization validity, exact call versus observation, APS cap compliance, temporal validity, and each explicitly unestablished layer with its own result. Own key pins. No import of APS or PriorSeal verifier logic.
- **Progress.** `scoped` ([scope](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5885842512)). @altrudev has started building thin adapters on the Frequency side ([comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5902671142)) and asked for the pilot inputs and for the baseline to be frozen before any run. The run, its publication and any mutation work (A2) stay gated until he designates the exact Frequency commit.
- **Owners.** Frequency owns its verifier and results.

### A2. corpus-adequacy -> Frequency's checker over the E2 corpus

- **What it would emit.** Which seeded faults the pinned E2 corpus detects, with a positive and an inert control. Fault table at claim level: [comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5892629762). Rows without a pinned negative input are expected to survive and would be reported as corpus discrimination limits, not verifier failures. Scoring follows @Rul1an's note ([comment](https://github.com/aeoess/agent-governance-vocabulary/pull/179#issuecomment-5908062490)). A crash or a missing result does not count as detection. The report would count as detections only changes in the targeted claim and list any crash beside them. That differs from A3, where the agreed reading counts crash kills and labels them.
- **Progress.** `scoped`. Nothing has been run. It runs only after Frequency publishes its own result and @altrudev consents. The full report goes to the three maintainers first, and public release needs each one's separate approval.
- **Owners.** corpus-adequacy owns the tool and the report.

### A3. corpus-adequacy -> REMORA `evidence-sufficiency-v1`

- **What it emits.** An adequacy report over REMORA's corpus.
- **Progress.** Run reported, review in progress.
- **Provenance.** @darklordVirtual reports that the first run found real gaps in what the corpus can distinguish, tracked in [REMORA-research#629](https://github.com/darklordVirtual/REMORA-research/issues/629) ([comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5895284356)). Not inspected by the editors of this file. @Rul1an, who wrote the tool and the fault definitions and ran both runs, reports them as public ([comment](https://github.com/aeoess/agent-governance-vocabulary/pull/179#issuecomment-5908062490)). v1.0 ran at REMORA `31c4060` ([report](https://github.com/Rul1an/remora-es-v1-adequacy/blob/05f7a087b6462400f4eb9ea9e4fb7d4aa023ccd3/REPORT.md)). v1.1 ran at `57ee0351`, before the squash merge as `8772d85` ([report](https://github.com/corpus-adequacy/remora-es-v11-adequacy/blob/9f3851995bbe395e510dde9ce9a03ebb6f1f965a/REPORT.md)), with the maintainer's survivor classification in [corpus-adequacy/remora-es-v11-adequacy#1](https://github.com/corpus-adequacy/remora-es-v11-adequacy/issues/1). By his own statement neither record is independent, both reports count crash kills and label them, and a v1.2 rerun under maintainer review is not part of this entry. The editors checked that these links resolve and did not review the reports.
- **Owners.** REMORA owns the corpus and the survivor classification. corpus-adequacy owns the tool and the run reports.

## Example composition (hypothetical)

One way some edges could compose for one bounded paid MCP action. Illustrative only. No project is required for it, no run of it exists, and no results are filled in.

1. AgentAvow attests the tool-definition digest of the target MCP server (E1 or E4).
2. APS issues a decision for one exact call.
3. PriorSeal binds `decision_ref` into a principal-signed exact-call authorization before execution (E2).
4. PIC allows or blocks the call at the protected tool (E5).
5. After execution, PriorSeal compares the observed call with the authorization (E2).
6. `action_ref` binds the decision inputs across projects and anchors them (E3).
7. Veritas Acta checks that every billed item has a receipt before payment (E6).
8. Frequency and corpus-adequacy observe the pinned claims and corpora (A1, A2).

Any subset works without the rest. A project can use E1 and E2 without E6, or E9 without any of the others.

## Editing this file

- Each project may correct its own node and its side of any edge at any time.
- Progress is raised only by a pull request that links the pinned artifact and the run record, and states who ran it and whether the record is independent.
- Claim results are quoted in the vocabulary of the project that emitted them. Do not translate them.
- Connections no owner has proposed are marked `inferred by editors` until an owner adopts them.
