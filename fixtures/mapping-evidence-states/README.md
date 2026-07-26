# Mapping Evidence States

**What this exercises:** the crosswalk merge bar in [`CONTRIBUTING.md`](../../CONTRIBUTING.md), specifically criteria 2 and 3.
**Source discussion:** DIF trusted-ai-agents [#41](https://github.com/decentralized-identity/trusted-ai-agents/issues/41).

## Scope and claim boundaries

Every file here carries a machine-readable top-level `scope` object so it stays honestly labeled when it travels without this README.

- **`normative_status: non_normative`** means nothing here is a conformance requirement on any specification.
- **Artifact provenance:** emitted by the named implementation at the version pinned in the file, using ephemeral keys generated for the fixture and used nowhere else. Not a production artifact.
- **Claim boundary:** each file describes what *that artifact* carries. It is not a claim about what the emitting protocol can express, and it is not a claim about any other system.

## The problem this addresses

The current merge bar gives a contributor two ways to describe a canonical term:

1. a mapping to a specific field with a cited source path, or
2. `no_mapping` with a technical rationale.

Some fields are neither. The value is recoverable from what the artifact carries, but the artifact never asserts it. A contributor facing one of those has to overstate it as a mapping or understate it as absent. Both answers are wrong, and the reader of the crosswalk cannot tell which kind of wrong they are looking at.

That is the same collapse the registry already rejects elsewhere: a verifier that reports could-not-verify as valid has removed the distinction its reader most needs.

## The three states

| State | Meaning | Required alongside |
|---|---|---|
| `present` | The artifact emits the value as a field. | `source_path`, `basis` |
| `inferable` | Recoverable from emitted fields by computation, never asserted by the issuer. | `inferred_from`, `inference_basis`, `why_not_present`, `why_not_absent` |
| `absent` | Neither carried nor derivable. Requires a lookup outside the artifact. | `no_mapping_rationale` |

`inferable` does not count toward the two-independent-implementations bar for canonical status. That bar asks for an emitted artifact whose shape is compatible under the canonical definition. A value the consumer computes is not something the issuer emitted, so it is not evidence that the issuer implements the term.

## The worked example

[`01-aps-delegation.json`](01-aps-delegation.json) carries one real delegation artifact and maps three canonical terms against it, one in each state.

- `spend_cap` is **present**. It is a signed field and a verifier reads it directly.
- `remaining_spend` is **inferable**. Both operands are signed and the subtraction is trivial, but the issuer never states the remainder, so the number is the consumer's computation. If the issuer's accounting disagrees with that arithmetic, nothing in the signed body resolves the conflict.
- `revocation_status` is **absent**. A holder of this artifact alone cannot distinguish an active delegation from one revoked a second after issuance.

The middle row is the one the current merge bar has no vocabulary for, and it is the row where a crosswalk most easily reads as stronger than the system it describes.
