# Mapping Evidence States

**What this exercises:** the crosswalk merge bar in [`CONTRIBUTING.md`](../../CONTRIBUTING.md), specifically criteria 2 and 3.
**Source discussion:** DIF trusted-ai-agents [#41](https://github.com/decentralized-identity/trusted-ai-agents/issues/41).

## Scope and claim boundaries

Every file here carries a machine-readable top-level `scope` object so it stays honestly labeled when it travels without this README.

- **`normative_status: non_normative`** means nothing here is a conformance requirement on any specification.
- **Artifact provenance:** emitted by the named implementation at the version pinned in the file, using ephemeral keys generated for the fixture and used nowhere else. Not a production artifact.
- **Claim boundary:** each file describes what *that artifact* carries. It is not a claim about what the emitting protocol can express, and it is not a claim about any other system.

## The problem this addresses

A crosswalk entry records `match`, which says how closely the target primitive corresponds. It had
no way to say whether the emitting artifact actually carries the value.

Some values are recoverable from fields the artifact does emit, but the artifact never asserts
them. Without a second axis a contributor has to record such a value as a plain mapping, which
reads as stronger than the system it describes, or as `no_mapping`, which understates a value the
consumer can genuinely obtain. A reader of the crosswalk cannot tell which kind of wrong they are
looking at.

That is the collapse this registry already rejects elsewhere. A verifier that reports
could-not-verify as valid has removed the distinction its reader most needs.

## Two independent axes

`match` answers how closely the primitives correspond. `evidence` answers whether the artifact
emits the value or the consumer computes it. They do not substitute for one another, and a mapping
can be `exact` in shape while still being `inferable` in evidence.

| `evidence` | Meaning | Required alongside |
|---|---|---|
| `emitted` | The artifact emits the value as a field. | `source_path` |
| `inferable` | Recoverable from emitted fields by computation, never asserted by the issuer. | `inferred_from`, `inference_basis` |

`evidence` is optional and does not apply when `match` is `no_mapping`, since there is no mapping
to characterise. `evidence: inferable` does not count toward the two-independent-implementations
bar for canonical status: that bar asks for an emitted artifact, and a value the consumer computes
is not something the issuer emitted.

## The worked example

[`01-aps-passport-grade.json`](01-aps-passport-grade.json) carries one real passport artifact,
emitted by the agent-passport-system SDK with ephemeral keys, and records a correction to this
repository's own crosswalk entry for `passport_grade`.

- The crosswalk claimed `passport_grade` as `exact` against `passport.grade`, with a note that the
  grade is embedded in the signed envelope.
- The emitted passport carries no such field, and no passport type declares one. The grade is
  produced by `computePassportGrade()` from an issuance evidence record and four conditions, so a
  consumer obtains it by calling the function, never by reading the artifact.
- Recorded as a bare `exact` the entry reads as though the issuer emits a grade. Recorded as
  `no_mapping` it would understate a value a consumer can obtain. The corrected entry keeps the
  match type and adds the evidence qualifier: `match: exact`, `evidence: inferable`, with
  `inferred_from` and `inference_basis` stating exactly what the consumer computes it from, and
  `counts_toward_independent_implementation: false`.

That middle state is the one the registry previously had no vocabulary for, and it is where a
crosswalk most easily reads as stronger than the system it describes. The example is deliberately
a correction to the maintainer's own entry rather than to anyone else's.
crosswalk most easily reads as stronger than the system it describes.
