# APS to PriorSeal: pilot status (proposal)

**Status of this file: proposal.** It is a first draft of the single status file discussed in [#185](https://github.com/aeoess/agent-governance-vocabulary/issues/185). Who authors it, who approves changes to it, and how long a review window runs are not yet settled in #185. For this proposal, @imokokok has offered to check the PriorSeal-owned facts before merge. That is the arrangement for this draft, not an agreed rule for shared files.

Listing this case does not opt PriorSeal or Insight into active federation participation, shared governance, commercial delivery or any economic allocation. The same holds for APS.

Facts below were checked against the linked public sources on 2026-10-02.

## The case

A fixed, offline pair. APS decision evidence at a pinned commit is copied byte for byte into PriorSeal, which binds it to signed payment authorization and execution receipts and reports two observations. One matches the signed exact call. The other differs from it and is also above the delegated limit.

## Pins

| side | repository | commit | tag | contents |
|---|---|---|---|---|
| APS | [agent-passport-system/agent-passport-system](https://github.com/agent-passport-system/agent-passport-system) (formerly `aeoess/agent-passport-system`, which redirects and is the form the cited records use) | `948f99b85343bef2c6fa677c8543965caacfc087` | `fixtures/priorseal-decision-binding-v1` | `fixtures/priorseal-decision-binding/`, cases `permit`, `narrow`, `deny`, `expired`, test keys, reference time `2026-09-19T10:05:00.000Z`. `MANIFEST.sha256` SHA-256 `2bf365bc9124ecfc943d5be86c34e8e0cacd51a5929b8d0c906e633a017231f9` |
| PriorSeal | [imokokok/PriorSeal](https://github.com/imokokok/PriorSeal) | `d749d2691c3e6be139de4020e7b27cdafca2c428` | none | `examples/aps-priorseal-decision-binding-v1/`, report `PAYMENT-LIMIT-REPORT.json` SHA-256 `d2c1bea5f0acf0afe06c944376c5a471402ab5d48bf85ca267ed9b5876336ae4` |

The 17 files covered by the APS manifest are byte identical in both repositories. PriorSeal's copy also carries APS's `LICENSE` and `NOTICE`. Its `verify-from-package-root.mjs` differs, because PriorSeal generates it from a TypeScript port, so the lab run used the original APS script for claim 1.

PriorSeal emits `COMPLIANT` for the observation that matches the signed exact call (`1000000000000000` wei). The over limit observation (`6000000000000000` wei) is `NON_COMPLIANT` with the single reason `TRANSACTION_VALUE_MISMATCH`, which names its difference from the signed exact call. That it is also above the APS `spend.per_action` cap (`5000000000000000` wei) is a separate numeric assertion in the pair's report (claim 5 below), not a PriorSeal reason.

## Records

**Lab record.** Merged in [aps-conformance-suite#139](https://github.com/Agent-Authority-Conformance/aps-conformance-suite/pull/139) on 2026-10-02 (`aca2ff0c`), at `interop/priorseal-aps-payment-limit-d749d269/` ([run-report.md](https://github.com/Agent-Authority-Conformance/aps-conformance-suite/blob/aca2ff0cb916265acde5fc131ca7fa3b03b3d500/interop/priorseal-aps-payment-limit-d749d269/run-report.md)). Six claims, each labelled by runner and by whether the runner authored what it checks:

| claim | runner | label |
|---|---|---|
| 1 APS receipts, decision and delegation checks under pinned test keys at the reference time | aeoess | author-produced |
| 2 PriorSeal signatures verify | aeoess | independent |
| 3 `decision_ref` correlation | aeoess | author-produced |
| 4 exact call against observation | aeoess | independent |
| 5 numeric comparison against APS `spend.per_action` | aeoess | author-produced |
| 6 report byte reproduction | aeoess | author-produced |

**Runner record for claim 1.** @imokokok ran the original APS verifier from the pinned commit, recorded as [independent-entry1-imokokok.md](https://github.com/Agent-Authority-Conformance/aps-conformance-suite/blob/aca2ff0cb916265acde5fc131ca7fa3b03b3d500/interop/priorseal-aps-payment-limit-d749d269/independent-entry1-imokokok.md) in the same merged record. It is an independent run of the APS-authored verifier, not a new implementation.

The cited records contain no independent run for claims 3, 5 and 6. The lab record does not create an end to end verdict.

## A1: Frequency review run (report pending)

The bounded A1 review adapter at `cf7389097fe3a404b3557da2e72fdd8cbe962b81` (tag `aps-priorseal-a1-exec-2026-10-02`), with `RUN.md` at `a40562268aa1d6e1f6d369e296c16261d623c4e0` (tag `aps-priorseal-a1-instructions-2026-10-02`), in [altrudev/Frequency-Federation-Review](https://github.com/altrudev/Frequency-Federation-Review). Its README says the repository is "not Frequency, not Frequency-Dev, and not a public release of Frequency's internal assurance architecture", and it carries a review only notice. Who authored the adapter and who performed the formal run are pending the full report, which the PriorSeal side has not yet received for review. Until that report is checked, this section records the scope of the run, not who ran it.

Scope confirmed by the PriorSeal side ([comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5952032554)) and, with conditions, by the APS side ([comment](https://github.com/aeoess/agent-governance-vocabulary/issues/177#issuecomment-5956876272)). APS confirmation requires the stated ceilings to accompany their claims and the pins to remain retained. It does not accept formal results or establish independence. No formal result has been published. Publication needs separate agreement from APS, PriorSeal and Frequency.

A2, corpus adequacy, has not run.

## Not established

Live chain execution, live currency enforcement, APS decision single use, an outside witness of execution, and production use of either project. All observations are synthetic at a fixed reference time, and the APS keys are public test keys.

## Licenses

APS Apache-2.0. PriorSeal MIT. Conformance lab Apache-2.0. Frequency review repository: no license, review only notice.
