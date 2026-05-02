# Agent Governance Vocabulary

Canonical names for governance primitives across multi-issuer agent ecosystems.

**Precedent:** IANA JWT claim registry, JSON-LD `@context`. Each system keeps its internal code. This repo provides shared reference + per-system crosswalks.

## Status

v0.1 draft. Open for Working Group review. Co-authored:

- [@aeoess](https://github.com/aeoess) - APS
- [@QueBallSharken](https://github.com/QueBallSharken) - descriptor dimensions, BBIS-aligned distinctions
- [@douglasborthwick-crypto](https://github.com/douglasborthwick-crypto) - InsumerAPI / SkyeProfile, scope layering
- [@MoltyCel](https://github.com/MoltyCel) - MolTrust / AAE, typed schema discipline
- WG members invited

## Layered scope

Three layers, distinct altitudes, cross-reference via this repo:

1. `vocabulary.yaml` - canonical names for abstract governance primitives (signal types, descriptor dimensions, match semantics)
2. `MULTI-ATTESTATION-SPEC.md` (lives in [insumer-examples](https://github.com/douglasborthwick-crypto/insumer-examples)) - canonical envelope `type` field values for multi-issuer verification
3. `crosswalk/<system>.yaml` - per-system mappings between internal names and canonical names

Renaming live signed envelope `type` values is explicitly out of scope - canonical aligns with what is already in production.

## Crosswalks

Open a PR adding `crosswalk/<your-system>.yaml`. Use the match types from `vocabulary.yaml > crosswalk_match_types`. Partial match and non-equivalent-similar-label are encouraged - this layer exists to clarify differences, not hide them.

See [`docs/generated/crosswalk-matrix.md`](./docs/generated/crosswalk-matrix.md) for the system × signal-type match grid across the corpus.

Committed contributors so far:

- `crosswalk/a2a.yaml` - @rnwy
- `crosswalk/aeoess-aps.yaml` - @aeoess (renamed from aps.yaml)
- `crosswalk/agent-did.yaml` - @edisonduran
- `crosswalk/agentlair.yaml` - @piiiico
- `crosswalk/agentnexus.yaml` - @kevinkaylie
- `crosswalk/asqav.yaml` - @jagmarques
- `crosswalk/continuity-analyzer.yaml` - @nutstrut
- `crosswalk/dcp-ai.yaml` - @lktron00
- `crosswalk/fidelity-spec.yaml` - @lowkey-divine
- `crosswalk/insumerapi.yaml` - @douglasborthwick-crypto
- `crosswalk/jep.yaml` - @schchit
- `crosswalk/logpose.yaml` - @rkaushik29
- `crosswalk/moltrust.yaml` - @MoltyCel
- `crosswalk/nobulex.yaml` - @arian-gogani
- `crosswalk/pathcourse-health.yaml` - @alex-pathcourse
- `crosswalk/pic.yaml` - @madeinplutofabio
- `crosswalk/rfc-category-taxonomy.yaml` - reverse crosswalk mapping
  the ten MULTI-ATTESTATION-SPEC signal_types to the (proposed) A2A
  RFC trust evidence category taxonomy. Drafted on
  @douglasborthwick-crypto's offer per A2A Discussion #1734
  ([@AlexanderLawson17](https://github.com/AlexanderLawson17)). Eight
  of ten rows currently need per-issuer field-set confirmation; see
  the file's `review_required` block for the tag list.
- `crosswalk/rnwy.yaml` - @rnwy
- `crosswalk/sar.yaml` - @nutstrut
- `crosswalk/satp/behavioral-trust.yaml` - @0xbrainkid
- `crosswalk/signet.yaml` - @willamhou
- `crosswalk/sint.yaml` - @pshkv
- `crosswalk/soulboundrobots.yaml` - @rnwy
- `crosswalk/sovereign-atom.yaml` - @AuthorPrime
- `crosswalk/veritasacta.yaml` - @tomjwxf

## Legacy descriptor overrides

`scripts/legacy-descriptor-overrides.yaml` lists known-stale `(file, path, value)` combinations from crosswalks that pre-date a vocabulary resolution. The validator emits warnings (not errors) for these so contributor CI doesn't break on unrelated PRs to those files. As maintainers update their crosswalks, entries are removed.

Do not add new entries without a tracked WG issue establishing the canonical resolution.

## License

Apache-2.0.
