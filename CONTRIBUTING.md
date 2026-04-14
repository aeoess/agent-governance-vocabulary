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
4. **Descriptor enum extensions sequenced.** If your term requires a descriptor value not currently in the schema, the descriptor extension PR should land first, with the new term following against the updated schema.

## Proposing descriptor schema changes

Changes to the descriptor dimensions schema itself (new dimensions, modified enum values) affect every existing crosswalk. These are discussed as issues first, not as PRs. Once the direction is clear, a PR can follow.

## Stability expectations

Canonical entries may be clarified over time — definition refinements, descriptor extensions, reference implementation additions. Breaking semantic changes or removals require issue discussion first. Deprecated entries are marked `status: deprecated` with a reference to the deprecation issue; removal happens in a subsequent update after issue discussion and deprecation marking.

---

## Out of scope

- **Renaming live signed field values** in production across multiple issuers. The vocabulary is a naming layer *over* existing specs — it doesn't rename things already stamped into signed bytes in production.

---

## How review works

Every PR is evaluated against five questions, applied to every contributor equally:

1. **Identity.** Is the contributor an identifiable maintainer or authorized contributor for the system being crosswalked?
2. **Format.** Does the file match the structure of merged crosswalks?
3. **Substance.** Are technical claims about other systems accurate and verifiable from public artifacts?
4. **Scope.** Does the PR stay within its own crosswalk file, or modify canonical artifacts that affect other implementations?
5. **Reversibility.** Can the change be cleanly reverted if a problem surfaces later?

Substantive declines include the reason. Review comments aim to be concrete and actionable.

---

## Practical details

- **Maintainer:** [@aeoess](https://github.com/aeoess) (Tymofii Pidlisnyi)
- **Review timing:** maintainer-bandwidth dependent. If a PR has had no response after 5 business days, ping it — the notification may have been missed.
- **CLA / DCO:** no CLA is required. Contributions are accepted on the understanding that the submitter has the right to contribute under the stated file license. Signed-off-by commits are welcome but not required.
- **Security issues:** open a private security advisory via GitHub rather than a public issue.
- **Code of Conduct:** Contributor Covenant 2.1 — see [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

---

## Licensing

- **Repository:** Apache License 2.0 (see [`LICENSE`](./LICENSE))
- **`vocabulary.yaml` itself:** CC0 — canonical terms should be freely adoptable by any system without license friction
- **Individual crosswalk files:** contributor's choice, provided the license permits Apache 2.0 downstream consumption. Declare the license in the crosswalk file header (`license:` field). Examples in merged crosswalks: Apache-2.0, MIT, MIT (code) + CC-BY-4.0 (specification).
