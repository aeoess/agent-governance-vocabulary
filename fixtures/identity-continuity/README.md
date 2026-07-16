# Identity Continuity Fixtures

**What these exercise:** the `composition_rules.handoff_decay_then_rebuild` section of [`crosswalk/sovereign-atom.yaml`](../../crosswalk/sovereign-atom.yaml)
**Source discussions:** DIF trusted-ai-agents [#36](https://github.com/decentralized-identity/trusted-ai-agents/issues/36) — [hosting route](https://github.com/decentralized-identity/trusted-ai-agents/issues/36#issuecomment-4254823999) (@aeoess, Apr 15), [decay-function micro-spec](https://github.com/decentralized-identity/trusted-ai-agents/issues/36#issuecomment-4301859093) (Apr 23), [corrected rebuild figures](https://github.com/decentralized-identity/trusted-ai-agents/issues/36#issuecomment-4313774423) (Apr 24)

## What this is

Five JSON fixtures — one per adversarial scenario enumerated in the April 11 DIF #36 comment. Each fixture is `input_state` + `handoff_event` + expected outputs at two layers:

- **Identity layer** — APS passport / ERC-8004 key-rotation verdict (`valid` | `ambiguous` | `rejected`)
- **Trust layer** — decay factor applied + trust score after handoff + rebuild trajectory

## Canonical primitive mapping

These fixtures are not a new vocabulary — they exercise a *composition rule* between three primitives that already exist in `vocabulary.yaml`:

| Fixture field | Canonical primitive |
|---|---|
| `handoff_event` (entire object) | `entity_continuity` |
| `input_state.trust_score` | `behavioral_trust` |
| `expected.rebuild_trajectory` | `trust_velocity` |
| `accrual_rate` parameter | (consumer-configured rate input to `trust_velocity`) |
| rebuild-step observations (implicit) | `observation_window` |

The composition rule the fixtures encode:

> When `entity_continuity` fires, `behavioral_trust(t+) = decay_factor(quality) × behavioral_trust(t−)`, and post-event `trust_velocity` describes the rebuild trajectory.

See `composition_rules.handoff_decay_then_rebuild` in [`crosswalk/sovereign-atom.yaml`](../../crosswalk/sovereign-atom.yaml) for the full crosswalk.

## Scenario index

| # | Scenario | Decay factor | Identity verdict | Rebuild curve (accrual_rate = 0.15) |
|---|----------|--------------|------------------|---------------|
| 1 | [Graceful + full state transfer](./01-graceful-handoff.json) | 0.85 | `valid` | 0.7225 → 0.95 in 11 receipts |
| 2 | [Ungraceful + DID continuity](./02-ungraceful-termination.json) | 0.40 | `valid` | 0.2880 → 0.90 in 13 receipts |
| 3 | [Fork detection](./03-fork-detection.json) | frozen | `ambiguous` | paused pending resolution |
| 4 | [Stale re-establishment (30d)](./04-stale-reestablishment.json) | 0.50 (passive) | `valid, stale` | 0.4400 → 0.90 in 13 receipts (accrual 0.10 → 0.15) |
| 5 | [Impersonation](./05-impersonation.json) | n/a | `rejected` | n/a |

**Note on rebuild curves:** trajectories assume `interaction_score = 1.0` at every step (ideal receipts). Real rebuild will be slower because real interactions vary in quality. The fixtures express the *upper bound* on rebuild speed given the decay factor and accrual rate.

**Values are policy, structure is the spec.** `accrual_rate = 0.15` and the decay-factor bands are illustrative consumer configuration, not prescriptions. A regulated-fintech consumer might run `accrual_rate = 0.05`; a creative-tooling consumer might run `0.3`. What the fixtures pin down is the *shape*: multiplicative decay bucketed by handoff quality, asymptotic rebuild via receipt accrual, and the two-layer separation of identity verdict from trust verdict.

## Composition with AIP #13

Each fixture includes a `composition.aip13_delegationChain` field describing how the `delegationChain.attenuated` pattern (narrowed-scope successor delegation, [AIP #13](https://github.com/openagentidentityprotocol/agentidentityprotocol/issues/13)) interacts with the trust-layer verdict. The two specs compose cleanly: attenuation provides the action-envelope ceiling; decay/accrual provides the trust-score trajectory *inside* that ceiling.

## Provenance

These values emerged from the Sovereign Lattice's operational evidence — 100+ sessions of agent relay with observed handoff behavior. Graceful handoffs (explicit journals, clean state files) produced faster rebuilds than ungraceful ones (session timeouts, partial notes). The numeric bands are calibrated against that operational data and are open to refinement. Maintainer: @AuthorPrime (same as `crosswalk/sovereign-atom.yaml`).

If a joint fixture schema for this directory stabilizes in a different shape (per the DIF #36 test-vector format discussion — RFC 8032 deterministic keypairs, Ed25519 over JCS-canonicalized payloads), these fixtures adapt to it. The structure is the contribution; the schema is negotiable.
