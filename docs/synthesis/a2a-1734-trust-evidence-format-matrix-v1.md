# A2A #1734: Trust Evidence Format Synthesis Matrix v1

**Synthesis venue:** AEOESS, organized at a2aproject/A2A discussion #1734
**Substrate window:** 2026-05-21 (five-candidate frame posted) through 2026-05-26 (substrate window close, per velocity-driven compression announced 2026-05-23)
**Publication:** 2026-05-27 (target)
**Attribution schema.** Every row distinguishes originating contribution (the conceptual work, who proposed the framing, the field, or the convention) from submitted substrate (the empirical work, who shipped fixtures, conformance vectors, production data, cross-exhibit pairs, or reference implementations). Both citable. Open-ambiguity column documents disputed or unresolved lineage. AEOESS does not adjudicate authorship disputes; it documents them.
**Substrate window stays open through publication.** New material against any candidate, particularly extensions of the gap classes named in Candidates 3 and 5, is welcome and will surface in v1.1.

---

## Posture

AEOESS organized the synthesis pass; AEOESS did not author the substrate. Five-candidate framing was posted by AEOESS at A2A #1734 on 2026-05-21 as an organizing structure for unresolved problems the cohort had not yet pointed at directly. The substrate against each candidate was authored by named ecosystem contributors. AEOESS reads the substrate, records what landed, records what diverges, and records what remains open. Reference implementations are cited by URL, not absorbed.

The matrix records the substrate as-it-landed under the schema's discipline. Per the schema, where authorship is disputed across visible artifacts, both threads are cited and the dispute is surfaced rather than resolved.

---

## Matrix

### Candidate 1: Semantic divergence under byte-match identity

**Framing as candidate.** Posted by AEOESS on A2A #1734, 2026-05-21: two implementations producing byte-identical canonical receipts under JCS-RFC 8785 can still encode semantically distinct claims, leaving silent verifier disagreement downstream. The candidate asked: what substrate-layer signal converts the gap from theoretical to detectable?

**Originating contribution (formalism layer).**

Disputed lineage. Two threads, both citable:

- **Thread A. AlgoVoi (chopmob-cloud), A2A #1734, 2026-05-14:** the discrimination-tuple injectivity formulation, stated as a rule over `(claim_type, evidenceType, source_provider_did)` with byte-comparison enforcement.
- **Thread B. AgentGraph (kenneives), v0.3.3 row-classification working document at `agentgraph-co/agentgraph` (predates AlgoVoi's substrate involvement):** the row-classification work that introduces the injectivity invariant in matrix-form across the v0.3.3 cross-extension scaffold.

**Submitted substrate (consolidated artifact, 2026-05-25).**

`agentgraph-co/agentgraph/blob/v0.3.3-cross-extension-matrix/docs/standards/semantic-divergence-boundary-v0.md` (commit `229040b`). Three-leg composition the document itself names:

1. Formalism: discrimination-tuple injectivity rule, §2 of the document
2. Empirical distribution: AgentGraph scan corpus measurement, "12% of OpenClaw skill repositories with valid SKILL.md, byte-clean canonical serialization, and live did:web resolution were classified malware on static analysis," §1.2 of the document, cross-citing *State of Agent Security 2026* at `agentgraph.co/state-of-agent-security-2026`
3. Verifier-instance: AlgoVoi `/compliance/screen` endpoint as production-instance that converts tuple-mismatch into structured rejection, §4 of the document

Operational worked examples (§3 of the substrate file):

- Row #7 reclassification: eriknewton (Concordia Protocol), surfaced A2A #1734 2026-05-21
- Row #4/#5 (continuity, behavioral) disambiguation via `source_provider_did`: surfaced during v0.3.3 cross-extension matrix authoring; touches arian-gogani (Nobulex) + vdineshk (Dominion Observatory)
- Row #8 `urn:arkforge:verdict` open architectural question: desiorac + lawcontinue, A2A #1734 2026-05-19

**Open ambiguity.**

The 2026-05-25 substrate file's own §2 authorship note credits AlgoVoi (chopmob-cloud) as the originator of the discrimination-tuple injectivity formulation, with named co-authorship at AlgoVoi's 2026-05-23 request. The substrate author recorded the lineage decision in-text. Per the matrix's stated discipline ("AEOESS reads the substrate, records what landed"), the substrate file's authorship note is what landed. No submitted substrate artefact -- no commit hash, no dated document, no publicly-citable URL predating A2A #1734 2026-05-14 -- that contains the discrimination-tuple injectivity rule as a stated formalism has been submitted against this candidate. _Amendment 2026-05-26: removed AEOESS independent lineage-review sentence; the substrate file is the record._

**What the substrate establishes.**

The semantic-divergence gap is empirically measurable at known production frequency (12% in the OpenClaw scan corpus, May 2026). A substrate-layer signal exists (discrimination-tuple JCS-hash comparison at validation time) that converts the silent verifier-disagreement failure mode into a detectable mismatch. A production verifier instance exists (`/compliance/screen`) that exhibits the fail-closed discipline the substrate calls for. The three legs compose into the substrate evidence shape the candidate asked for.

**What remains open.**

Verifier-policy downstream of tuple-mismatch detection (reject vs warn vs surface to operator) is explicitly out-of-scope of the substrate document and remains a verifier-policy decision. The substrate file also declines to enumerate every semantic-divergence case; the injectivity rule is the substrate invariant, not the case catalog.

---

### Candidate 2: Live-state admissibility at commit

**Framing as candidate.** AEOESS, A2A #1734, 2026-05-21: authorization-at-issuance is structurally distinct from admissibility-at-execution. A receipt valid at the moment it was issued can be inadmissible by the time the action it carries is executed (revocation between issuance and admission; finality window mismatch; anchor not yet committed; etc.). The candidate asked: what substrate-layer construct lets a verifier distinguish the two temporal states cleanly?

**Originating contribution.**

- AEOESS for the candidate framing as one of the five
- giskard09 (argentum-core) for the dual-timestamp pattern at the field-shape layer: `authority_verified_at_ms` (issuance anchor) and `revocation_check_at_ms` (execution-time check), spec-committed in `action-ref.md v1.0` at `giskard09/argentum-core/blob/action-ref-v1.0/docs/spec/action-ref.md`, commit `71c01e8`

**Submitted substrate.**

- Agent OS (Liuyanfeng1234). `Trust_Ledger 8731` production data, issued-valid / executed-revoked fixture composed with the argentum-core dual-timestamp pattern. Submitted via Agent OS public submissions on A2A#1734.
- azender1 (SafeAgent). `RFC_EXECUTION_GUARD_1.md` three-incident production case study (2026-05-19, 2026-05-21, 2026-05-22) at `github.com/azender1/SafeAgent/blob/main/docs/RFC_EXECUTION_GUARD_1.md`. Two production-observed cases:
  - 422-cascade anchor-absence fixture (companion to anchor-inadmissibility)
  - Race-condition variant: both instances reach the broker before either commits, guard present but window between claim and commit wide enough that both readers see "not yet claimed"
- argentum-core (giskard09). NEXUS production deployment on Base mainnet, two gap classes:
  - Anchor_status polling (receipt issued before anchor transaction confirms; verifier sees `anchor_status: pending` immediately post-issuance)
  - Credential window at execution (whether the agent's credential was still valid at admission time, not just at issuance; the `revocation_check_at_ms` field bounds the credential exposure window in-receipt)

**Open ambiguity.**

None of substance. The anchor-absence and anchor-inadmissibility cases compose cleanly under the dual-timestamp pattern. The race-condition variant from azender1's case study extends the candidate into concurrency-window territory that the dual-timestamp pattern partially addresses (the `revocation_check_at_ms` field carries the admission-time check) and partially leaves to verifier policy (whether to admit on `anchor_status: pending` with a backoff retry or reject outright).

**What the substrate establishes.**

Three production cases (Agent OS, SafeAgent, NEXUS) demonstrate the gap as a live-system failure mode rather than a theoretical concern. The dual-timestamp pattern (authority_verified_at_ms + revocation_check_at_ms) supplies the in-receipt substrate that converts the gap from silent failure into a per-transition temporal claim a verifier can act on. Two distinct fixture classes (anchor-absence, anchor-inadmissibility) plus the concurrency-window variant give the candidate substrate the empirical grounding it needs.

**What remains open.**

Verifier-policy choices (admit-with-backoff vs reject-on-pending) are explicitly outside the substrate layer. The `revocation_check_at_ms` field bounds the credential exposure window but does not eliminate the race; whether the verifier should hard-reject on a stale revocation check or soft-warn is a policy decision per deployment.

---

### Candidate 3: Cross-jurisdictional receipt portability

**Framing as candidate.** AEOESS, A2A #1734, 2026-05-21: the same byte-canonical receipt under JCS-RFC 8785 can produce different mandatory downstream obligations under different jurisdictions (UK MLR 2017 s.330 SAR-mandatory vs EU AMLD5/6 EDD-only; MiCA Art. 80 issuance-anchor vs DORA Art. 14 execution-time-check). The candidate asked: does the closure happen inside the receipt schema, or in adjacent governance?

**Originating contribution.**

- AEOESS for the candidate framing
- chopmob-cloud (AlgoVoi) for the gap statement at the regulatory-mapping layer: same canonical receipt → different mandatory downstream obligation under UK MLR 2017 s.330 (SAR mandatory) vs EU AMLD5/6 (EDD only). Submitted via AlgoVoi submissions on A2A#1734 and x402-foundation/x402#2436. The framing deliberately holds the gap at the receipt-schema boundary and leaves the closure question open.

**Submitted substrate.**

- giskard09 (argentum-core) argues the closure happens **inside the receipt schema** via the dual-timestamp pattern (authority_verified_at_ms + revocation_check_at_ms in action-ref.md v1.0). Under MiCA Art. 80 / AMLR Art. 56 the issuance anchor is the relevant boundary; under DORA Art. 14 / FCA SYSC 9.1 the execution-time check is the relevant boundary; a receipt carrying both fields satisfies both regimes from a single schema. Cross-jurisdictional admissibility becomes a field-selection problem at verification time, not a schema-fork at issuance.
- Liuyanfeng1234 (Agent OS) submits SCP v2.2 (8725) jurisdiction-aware degrade-and-retry path as the **adjacent-governance** closure if AEOESS synthesis lands on that side. Agent OS reports it is prepared for either closure direction; both their COMMITTED Claim engine (8715) and CAR arbiter (8716) already emit the dual-timestamp pattern in production, so the receipt-schema closure path is also covered on their side.

**Open ambiguity.**

This is the candidate's structural open question, not a contributor ambiguity. The gap statement (AlgoVoi) holds the question open by design. The substrate (argentum-core, Agent OS) offers two closure paths with arguments for each:

- Receipt-schema closure (argentum-core view): the dual-timestamp pattern already in `action-ref.md v1.0` satisfies both temporal boundaries from a single schema; per-jurisdiction obligations become a field-selection problem at verification, not a schema branch at issuance
- Adjacent-governance closure (Agent OS SCP v2.2 path available): jurisdiction-aware degrade-and-retry at the governance layer; receipt schema stays jurisdiction-neutral; per-region obligations enforced one layer above

AEOESS reading: both closures are coherent. The receipt-schema closure (argentum-core) has the lighter contributor burden and reuses the dual-timestamp substrate from Candidate 2; the adjacent-governance closure (Agent OS SCP v2.2) handles obligations the receipt schema cannot semantically express (mandatory reporting, EDD scope, sanctions screening). They are not mutually exclusive; the receipt schema can carry the temporal substrate while adjacent governance carries the obligation enforcement. The synthesis matrix does not select; it records both submitted substrates and the structural question as open for further substrate.

**What the substrate establishes.**

The gap is concrete and regulatorily anchored (MLR 2017 s.330, AMLD5/6, MiCA Art. 80, DORA Art. 14, FCA SYSC 9.1). Two closure paths have submitted substrate. The candidate is no longer a hypothetical; it is a closure-direction question with two implementer-backed answers.

**What remains open.**

The substrate-vs-governance closure decision is the open question the candidate framed. Neither closure has been ruled out. Further substrate (production-observed jurisdictional incidents; sanctions-screening receipt instances; SAR-trigger evidence) would help future readers select.

---

### Candidate 4: Legacy receipt format migration

**Framing as candidate.** AEOESS, A2A #1734, 2026-05-21: receipt formats retained for years (regulatory retention windows, archival-recovery cases) can only migrate forward if the format version is part of the receipt itself, not external metadata. The candidate asked: what substrate-layer mechanism makes legacy receipts forward-migratable without breaking byte-canonical identity?

**Originating contribution.**

- AEOESS for the candidate framing as one of the five
- Upstream: the `canon_version` mechanism originated in the v3 shared canonicalisation thread; substrate is implementation-specific, conceptual origin is the canonicalization conversation across the cohort

**Submitted substrate.**

- chopmob-cloud (AlgoVoi). `canon_version` cross-exhibit pair (pre/post canonicalization rules) demonstrating that a receipt carrying its own canon-version pin can be re-verified under either old or new rules without external context. Submitted via AlgoVoi submissions on A2A#1734 and x402-foundation/x402#2436.
**Open ambiguity.**

None of substance.

**What the substrate establishes.**

The `canon_version` mechanism is substrate-general. Substrate-generality is established by five independent parties carrying `canon_version: jcs-rfc8785-v1` in-band on published artefacts, listed in the AlgoVoi Substrate Adopters Registry ([docs.algovoi.co.uk/adopters](https://docs.algovoi.co.uk/adopters)): AlgoVoi (substrate author, v1); Supership / Crest Deployment Systems (`verify.crestsystems.ai`); PEAC Protocol (`peacprotocol/peac`); Nobulex (`arian-gogani/nobulex`, bilateral-receipt vectors); Vauban Pay (STARK receipts, `vauban-org/x402-stark-receipts-conformance`). A sixth AlgoVoi artefact (`algovoi-substrate-pqc`, `canon_version: jcs-rfc8785-v2`) demonstrates the mechanism supports forward migration -- which is the precise property C4 asks for. A receipt with a canonical-version pin can be re-verified under either old or new rules without external context, since the pin is self-describing on the receipt. The legacy-retention case (multi-year receipts persisting across canon-version updates) becomes a routine field-resolution at verification time. _Amendment 2026-05-26: removed Agent OS COMMITTED Claim engine (8715) from submitted substrate; the Agent OS Provenance Fingerprint (SHA-256 over colon-joined string preimage, agntcy/identity#165) does not carry a `canon_version` field on emitted artefacts and does not satisfy C4's stated criterion ("the format version is part of the receipt itself, not external metadata"). Substrate-generality is established by the five independent external adopters listed above._

**What remains open.**

The candidate is well-covered at substrate.

---

### Candidate 5: Real-world deployment patterns

**Framing as candidate.** AEOESS, A2A #1734, 2026-05-21: most byte-match conformance work uses synthetic test inputs. The candidate asked: what do production receipts actually look like in deployed systems, and where are the gap classes that synthetic fixtures don't cover?

**Originating contribution.**

- AEOESS for the candidate framing
- Substrate-row gap classes originated by named implementers (per row below)

**Submitted substrate (settlement-plane).**

- chopmob-cloud (AlgoVoi): four production-observed gap classes:
  - Retry-induced timestamp clustering
  - Integer-vs-float coercion at canonicalization
  - Cross-chain identity fragmentation
  - Safeguarding finality-window mismatch
- Liuyanfeng1234 (Agent OS). CAR arbiter dedup hash mechanism + did:agent-os v1.0 method spec as named reference implementations for the receiver-side timestamp-clustering and cross-chain identity anchoring rows
- seritalien (Vauban Pay). STARK source-side determinism, integer arithmetic discipline, DelegationGrant claim shape, block-hash anchoring as substrate against the integer-vs-float and finality-window gap classes
- giskard09 (argentum-core / NEXUS): production deployment on Base mainnet with two empirically observed gap classes:
  - Gap class A: anchor_status polling under L2 settlement variable finality (any L2 settlement plane, not NEXUS-specific)
  - Gap class B: credential window at execution (audit question not answerable from receipt alone; resolved in-receipt via `revocation_check_at_ms` field)
- azender1 (SafeAgent). `RFC_EXECUTION_GUARD_1.md` three-incident production case study composes with Candidate 2 substrate and contributes the race-condition variant to deployment-pattern catalog

**Submitted substrate (discovery-plane).**

- kenneives (AgentGraph). `State of Agent Security 2026` scan corpus (35,000+ agents across MCP Registry, OpenClaw skills marketplace, npm/PyPI agent packages, AI-generated Solidity from Microsoft-backed Dreamspace). Full report at `agentgraph.co/state-of-agent-security-2026`, published 2026-05-12.

**Open ambiguity.**

None of substance. Settlement-plane and discovery-plane substrate are distinct surfaces (production-observed receipts in deployed systems vs population-scale scan corpus of declared identities and skills) and complementary; neither subsumes the other.

**What the substrate establishes.**

Production deployments exist on multiple settlement planes (Base mainnet via NEXUS; STARK-anchored via Vauban Pay; Agent OS production CAR arbiter). At least 4-6 production-observed gap classes have been catalogued by named implementers, each with a substrate reference. Settlement-plane and discovery-plane substrate together cover both the receipts-in-transit case and the agent-population-distribution case, which are the two empirical surfaces the candidate asked for.

**What remains open.**

The deployment-pattern catalog is open-ended by nature. Further production-incident case studies, particularly from non-EVM settlement planes (Solana, Cosmos SDK, off-chain commitment-based) would extend the substrate. Cross-jurisdiction production-observed incidents (cf. Candidate 3) would strengthen substrate at the intersection of #3 and #5.

---

## Cross-references

- `agent-passport-system` (AEOESS): protocol, npm `agent-passport-system`, PyPI `agent-passport-system`. IETF Internet-Draft `draft-pidlisnyi-aps-01` cited from within the discussion thread.
- `aeoess/agent-governance-vocabulary`: vocabulary repo where this matrix lives. Crosswalk files for AgentGraph, Agent OS, argentum-core (`crosswalk/mycelium-trails.yaml`), AlgoVoi, and others are visible under `crosswalk/`. Cross-impl substrate (rfc8785, JCS) lives in fixtures.
- A2A #1734 thread: `github.com/a2aproject/A2A/discussions/1734`
- AEOESS synthesis-attribution schema (internal doctrine, paste-safe summary): originating contribution = the conceptual work, submitted substrate = the empirical work, open ambiguity = disputed or unresolved lineage. Both columns citable; dispute documentation rather than adjudication.

## How to cite this matrix

For draft-pidlisnyi-aps-02, NLnet review materials, foundation submissions, and any downstream synthesis reference:

> AEOESS Synthesis Matrix v1, A2A Discussion #1734 (Composable Trust Evidence Format for Multi-Provider Agent Attestations). Published 2026-05-27 at `aeoess/agent-governance-vocabulary/docs/synthesis/a2a-1734-trust-evidence-format-matrix-v1.md`. Five candidates, per-row originating-contribution and submitted-substrate attribution.

Reference implementations cited by URL in the matrix itself. No consolidation under AEOESS authorship.

---

## Versioning

- **v1, 2026-05-27 (target).** Initial publication; five candidates with substrate as of substrate-window close 2026-05-26.
- **v1.x, rolling.** Substrate window stays open. New substrate against any candidate appears in patch versions with attribution-column updates. Existing rows are amended rather than rewritten; the matrix is additive over time.
- **v2, Q3 2026 (target).** Cadence is one methodology-ownership artifact per 6-to-8 weeks per AEOESS doctrine. A v2 update may shift candidate framings if substrate has materially changed the open questions.

Future v1.x updates amend existing rows with dated changelog notes rather than silently rewriting attribution. A `## Changelog` section at the bottom of this file carries the dated history once the first amendment lands.

---

## Changelog

### v1.1 -- 2026-05-26 (PR: chopmob-cloud/agent-governance-vocabulary)

**C1 open-ambiguity column:** Removed the sentence asserting an independent AEOESS lineage review that observed the `agentgraph-co/agentgraph` row-classification work predating AlgoVoi's substrate involvement. The submitted substrate file (`semantic-divergence-boundary-v0.md`, commit `229040b`) contains an unambiguous in-text §2 authorship note crediting AlgoVoi (chopmob-cloud) as the originator of the discrimination-tuple injectivity formulation. Per the matrix's own stated discipline, the substrate file is the record. No submitted substrate artefact that contains the injectivity rule as a stated formalism and predates A2A #1734 2026-05-14 was submitted against this candidate.

**C4 submitted substrate:** Removed Agent OS COMMITTED Claim engine (8715) as a second `canon_version` implementation. The Agent OS Provenance Fingerprint (`SHA-256(agent_id:action_type:scope:timestamp)`, agntcy/identity#165, posted 2026-05-26 14:32 UTC) uses a colon-joined string preimage and does not carry a `canon_version` field on emitted artefacts. C4's stated criterion requires "the format version is part of the receipt itself, not external metadata"; the Agent OS fingerprint shape does not satisfy this test. Substrate-generality for `canon_version` is established by five independent external adopters (AlgoVoi, Supership/Crest, PEAC Protocol, Nobulex, Vauban Pay) plus the AlgoVoi v2 artefact demonstrating forward migration; these are documented in the AlgoVoi Substrate Adopters Registry at `docs.algovoi.co.uk/adopters`.
