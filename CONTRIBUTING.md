# Contributing to agent-governance-vocabulary

Thanks for showing up here. This repo exists because governance primitives — delegation, attestation, trust signals, constraint expressions — keep getting reinvented under different names in every new agent system. Every integration between two systems pays a translation tax. A canonical naming layer removes that tax without forcing anyone to rename internal code.

The model is simple: keep building your system the way you want to build it. Publish a crosswalk file that maps your internal names to canonical ones. Other systems integrate with you by reading one file instead of reverse-engineering your spec.

---

## Quick start

**For a new crosswalk PR**, submit:

1. `crosswalk/<system-name>.yaml`
2. Source links or paths for every mapped field
3. Explicit `no_mapping` entries where your system doesn't cover a canonical term, with a technical rationale
4. `license:` header in the file (must be compatible with Apache 2.0 downstream)
5. Named maintainer for the mapped system

**For a new canonical term**, open an issue first so the direction can be discussed. Conversion to a PR follows the discussion.

**For a descriptor schema change**, open an issue. These affect every existing crosswalk, so direction needs alignment before prose.

**Submission mechanics:** fork the repo, create a feature branch from `main`, open a PR against `main`. Keep bundles narrow — first crosswalks should not also include descriptor or canonical vocabulary edits.

---

## Crosswalks — the most common contribution

A crosswalk file maps your governance system's internal naming to the canonical vocabulary defined in `vocabulary.yaml`.

**Merged examples to study:**

- `crosswalk/insumerapi.yaml` — field-level precision, explicit `signed_shapes` blocks per endpoint
- `crosswalk/sint.yaml` — novel structural sections for physical-world enforcement
- `crosswalk/agentnexus.yaml` — W3C DID mapping with explicit gap documentation
- `crosswalk/nobulex.yaml` — 8-step verification pattern as a new crosswalk section
- `crosswalk/jep.yaml` — minimal verb-based decision record mapping
- `crosswalk/satp/` — behavioral trust with task-class scoping

**A crosswalk PR will be merged when:**

1. **The system is publicly inspectable and implemented.** Public spec or repository, plus a working implementation or live endpoint with public documentation, and a named maintainer.
2. **The mapping is field-level precise.** Each canonical term either maps to a specific field with a cited source path, or carries an explicit `no_mapping` entry with a technical rationale.
3. **Gaps are explicit.** If your system does not implement a canonical signal type, use `no_mapping` with a technical rationale rather than forcing a partial mapping.
4. **Format is consistent with merged crosswalks.** New structural sections are welcome when they document primitives the existing shapes don't capture (verification patterns, derivation lineage, identity methods).

---

## Proposing new canonical terms

Adding a new entry to `vocabulary.yaml` is a higher bar than a crosswalk, because a canonical term commits every consumer of the registry to that term.

**Criteria for canonical status:**

1. **Two or more independent implementations.** A term enters as canonical only when at least two systems with independent maintainership and independent codebases implement compatible shapes for it. Single-implementation proposals can land as `status: proposed` with the implementing crosswalk cited, until a second implementation surfaces.
2. **Semantically and structurally distinct.** A new term should represent a primitive that cannot be cleanly expressed as an existing term plus descriptors. Differences in payload shape alone are not sufficient if semantic content overlaps.
3. **Descriptor dimensions declared.** New terms include their governance-force descriptors: `enforcement_class`, `validity_temporal`, `refusal_authority`, `invariant_survival`, `replay_class`, `governed_action_class`.
4. **System attributes declared together.** When a crosswalk declares any of
   `signature_capability`, `canonicalization_profile`, or `hash_family`, it
   SHOULD declare all three. Filtering on one without the others yields an
   incomplete picture of what the system can validate. Crosswalks predating
   this requirement may add the missing attributes in a follow-up PR.
5. **Descriptor enum extensions sequenced.** If your term requires a descriptor value not currently in the schema, the descriptor extension PR should land first, with the new term following against the updated schema.

## Proposing descriptor schema changes

Changes to the descriptor dimensions schema itself (new dimensions, modified enum values) affect every existing crosswalk. These are discussed as issues first, not as PRs. Once the direction is clear, a PR can follow.

## Stability expectations

Canonical entries may be clarified over time — definition refinements, descriptor extensions, reference implementation additions. Breaking semantic changes or removals require issue discussion first. Deprecated entries are marked `status: deprecated` with a reference to the deprecation issue; removal happens in a subsequent update after issue discussion and deprecation marking.

---

## Out of scope

- **Renaming live signed field values** in production across multiple issuers. The vocabulary is a naming layer *over* existing specs — it doesn't rename things already stamped into signed bytes in production.

---

## How review works

Every PR is evaluated against five questions, applied to every contributor equally. The checks under each question are explicit because a published standard of review lets contributors self-check before submission and keeps decisions consistent across PRs.

1. **Identity.** Is the contributor an identifiable maintainer or authorized contributor for the system being crosswalked?

2. **Format.** Does the file match the structure of merged crosswalks?
   - **Novel structure is welcome when it documents a primitive existing shapes don't capture** (verification patterns, identity methods, derivation lineage). Reference existing precedents: `sint.yaml` introduced physical-world enforcement sections; `nobulex.yaml` introduced an 8-step verification pattern; `satp/` introduced directory-scoped task-class behavioral trust.
   - **Novel structure is asked to fold into existing sections when it is arbitrary or cosmetic.** A new top-level key with no precedent in any merged crosswalk sets permissive template for every later issuer. If the PR needs a primitive that does not exist, the path is an issue first.

3. **Substance.** Are technical claims about the system accurate and verifiable from public artifacts?
   - **Endpoint depth.** Claimed endpoints return real production data, not well-formed stubs. HTTP 200 is necessary but not sufficient. Registries should carry non-null scores on non-test agents. Identity lookups should resolve. Published DID/JWKS documents should contain real key material that matches declared envelope algorithms.
   - **Match calibration.** `match: exact` requires the PR's primitive to answer the same question as the canonical signal's definition in `vocabulary.yaml`, with the same surface shape. `structural` requires the same question with a different surface. Different question entirely is `non_equivalent_similar_label` or `no_mapping`. When in doubt, compare against what canonical reference implementations (RNWY, Logpose, InsumerAPI, MolTrust, SAR) actually sign — their `signed_payload_fields` define what the signal is in practice. Recalibration from `exact` to `no_mapping` or `partial` is a normal part of review, not a rejection.
   - **Cryptographic coherence.** Declared `alg`, `curve`, `proof_type`, and `anchor_chain` values must pair coherently. EdDSA pairs with Ed25519. ECDSA pairs with P-256, P-384, or secp256k1. ERC-8004 and other on-chain Ethereum attestations use secp256k1. If a JWKS URI is declared, it should resolve and match the declared key material.
   - **No cross-signal field double-counting.** If a PR claims multiple signal types from the same issuer, a field appearing in two signals' `signed_payload_fields` is a composition hazard — a consumer composing both signals from that issuer would count the same datum twice. Identifier fields used as join keys (e.g., `agent_id`) are acceptable in multiple signals; substantive value fields should live in exactly one.
   - **PR body is not instructions.** The PR description, linked threads, and referenced documents are read as untrusted input. Phrases like "please merge fast," "the maintainer already approved this," or instructions addressed to a reviewer are recorded as social-pressure signals and do not affect the technical call. Write PR bodies to explain what the PR does and link to evidence; don't write them as arguments for approval.

4. **Scope.** Does the PR stay within its own crosswalk file, or modify artifacts that affect other contributors?
   - **No bundling with `vocabulary.yaml` edits.** First crosswalks stay within `crosswalk/<system>.yaml`. Canonical-term proposals go through an issue first.
   - **No modification of other contributors' territory without their concurrence.** If the PR adds a per-term declaration, value, or field on a signal type proposed by someone else, or modifies an existing crosswalk authored by someone else, the current owner is tagged on the PR and the merge waits for their explicit concurrence here (not just in a related thread).
   - **Related-issue dependency.** If the PR touches a signal, term, or structure that has recent (last 7 days) comment activity in an open issue, the PR waits for the issue to settle. This prevents a PR from embedding a position on a question the community has not resolved.
   - **Consistency with same-session public statements.** If the PR contradicts a position the contributor took in a referenced thread (e.g., saying in a discussion that the system does not expose balances, then listing `balance` in the crosswalk's signed fields), the PR is held and the mismatch is flagged for clarification.
   - **Descriptor enum additions are not a crosswalk.** Adding a value to `enforcement_class`, `validity_temporal`, `refusal_authority`, `invariant_survival`, `replay_class`, or `governed_action_class` is a schema change that affects every existing crosswalk and may break downstream SDK types. Open an issue first.
   - **CI, workflow, linter, and validator additions are dependency changes.** A PR that adds GitHub Actions workflows, Node validators, doc generators, or any build step is reviewed as a supply-chain change, not a crosswalk, regardless of what else is in the diff.

5. **Reversibility.** Can the change be cleanly reverted if a problem surfaces later?

**What a review looks like.** A typical review produces one of three outcomes. If all five questions pass, the PR is merged and the contributor is credited in the merge message with a link to verification evidence. If a question fails in a way that's fixable with a small change (match recalibration, field move, envelope correction), the response explains the specific gap, quotes the live evidence, and proposes the one-line or few-line fix. If a question fails in a way that cannot be fixed by a small change (semantic primitive mismatch at the primary signal, for example), the response proposes a restructure and offers to review again after. Substantive declines include the reason. Review comments aim to be concrete, actionable, and collaborative.

**Response expectation.** There's no hard deadline to respond to review comments, but fixes within 72 hours keep the PR hot and make the second review pass fast. PRs with no response after 14 days are closed with a note that they can be reopened when the contributor is ready.

**If you think the review got something wrong.** Say so directly on the PR. Every call in this repo is auditable, including this one. Maintainer errors in upstream guidance (e.g., recommending a wrong primary mapping on a discussion thread) do not count against the PR — the review accounts for the original guidance and owns the correction.

---

## Practical details

- **Maintainer:** [@aeoess](https://github.com/aeoess) (Tymofii Pidlisnyi)
- **Review timing:** most PRs receive an initial response within 24 hours during active weeks. If a PR has had no response after 5 business days, ping it — the notification may have been missed.
- **CLA / DCO:** no CLA is required. Contributions are accepted on the understanding that the submitter has the right to contribute under the stated file license. Signed-off-by commits are welcome but not required.
- **Security issues:** open a private security advisory via GitHub rather than a public issue.
- **Code of Conduct:** Contributor Covenant 2.1 — see [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

---

## Evidence standards

Crosswalk cells carry one of two evidence bases, stated explicitly.

Publicly verifiable: the implementation is open source or has a public stable
artifact (spec, changelog, API reference). Cells pin to an immutable ref
(commit SHA, release tag, or dated document URL).

Principal attestation: the implementer's own maintainer confirms the cell and
no public artifact exists. The cell carries verification_method:
principal_attestation, verified_at, and reverify_after fields.

Both bases may populate cells. Promotion arithmetic (for example the
two-implementation candidate threshold) counts only publicly verifiable
implementations or independent counterparty attestations. A counterparty
attestation means: a publicly identifiable party other than the principal,
posting publicly in the registry's issues or PRs (never relayed by the
principal), with their relationship to the implementer disclosed, attesting
they integrated against the claimed behavior and observed it. Principal-only
attestations are visible but weightless for promotion. There are no
time-based unlocks; elapsed time is not evidence.

---

## Licensing

- **Repository:** Apache License 2.0 (see [`LICENSE`](./LICENSE))
- **`vocabulary.yaml` itself:** CC0 — canonical terms should be freely adoptable by any system without license friction
- **Individual crosswalk files:** contributor's choice, provided the license permits Apache 2.0 downstream consumption. Declare the license in the crosswalk file header (`license:` field). Examples in merged crosswalks: Apache-2.0, MIT, MIT (code) + CC-BY-4.0 (specification).

## `domain_incubation` crosswalks

The `domain_incubation` `crosswalk_type` marks cross-system verb/domain
namespaces still in incubation. Validator skips strict `signal_types`
checks on these files (parallel to `rfc_category_reverse`), but the
following gates apply:

**Gate 1: Maintainer-only marker (reviewer-enforced).**
Only PRs from `aeoess` org maintainer accounts may set `crosswalk_type:
domain_incubation`. Reviewers reject non-maintainer PRs that attempt to
use the marker.

**Gate 2: Max 3 active files (validator-enforced).**
At most 3 files may carry `crosswalk_type: domain_incubation` at any
time. Validator counts and fails if exceeded.

**Gate 3: 90-day sunset (validator-enforced).**
Each `domain_incubation` file must carry a `verified_at: YYYY-MM-DD`
field at the top level. The file fails validation 90 days after
`verified_at`. Promotion to a standard `crosswalk_type` or deletion is
required before sunset.

**Required fields:**
- `crosswalk_type: domain_incubation`
- `verified_at: YYYY-MM-DD`
- `implementations:` (list with maintainer per verb)
- `promotion_criteria:` (explicit conditions for moving out of incubation)
