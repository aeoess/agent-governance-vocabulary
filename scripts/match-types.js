#!/usr/bin/env node
// match-types.js - one place where a crosswalk `match` token is normalized.
//
// Ruling: issue #153. `false_analog` is the canonical token. The former
// spelling `non_equivalent_similar_label` is a deprecated INPUT ALIAS: it is
// accepted, normalized, and warned about. It is never a second documented
// match type and never appears in generated or public output.
//
// SINGLE AUTHORITY, literally. The alias map lives in vocabulary.yaml under
// `crosswalk_match_type_aliases` and NOWHERE ELSE. This module holds no
// semantic table of its own: it validates the declared map and applies it.
// An earlier version kept a hardcoded copy here with a test asserting the two
// were equal, which is a mirrored invariant rather than one authority, and
// would have made retiring an alias a two-file edit with a test to satisfy in
// between. Callers must supply the map; there is deliberately no fallback,
// because a silent fallback lets a caller that forgot to pass it keep
// normalizing against a stale table forever.
//
// INVARIANT, and the reason normalization lives here rather than at each call
// site: normalization preserves BOTH tokens on the entry. Every semantic
// consumer (enum validation, the bilateral_receipt purpose gate, the matrix
// generator, matrix statistics) reads the NORMALIZED value. Only the
// deprecation warning reads the RAW one, via rawMatch(). Normalizing once at
// load makes that structural instead of a rule each new call site has to
// remember; a consumer that simply reads `entry.match` is correct by
// construction.
'use strict'

// Property carrying the token exactly as authored, when it differed.
const RAW_MATCH = '_rawMatch'

// Read and VALIDATE the alias map declared in a loaded vocabulary document.
// Returns {} when the key is absent, so a vocabulary that has finished its
// deprecation simply stops accepting the old spelling. A malformed declaration
// throws rather than silently disappearing: an alias map that quietly evaluated
// to empty would turn every legacy row into an unknown-token failure with no
// statement of why.
function aliasesFromVocab(vocab) {
  const declared = (vocab || {}).crosswalk_match_type_aliases
  if (declared === undefined || declared === null) return {}
  if (typeof declared !== 'object' || Array.isArray(declared)) {
    throw new Error('crosswalk_match_type_aliases must be a mapping of deprecated spelling to canonical token')
  }
  const canonical = new Set(Object.keys((vocab || {}).crosswalk_match_types || {}))
  for (const [from, to] of Object.entries(declared)) {
    if (typeof to !== 'string' || to === '') {
      throw new Error(`crosswalk_match_type_aliases.${from}: target must be a nonempty string`)
    }
    if (from === to) {
      throw new Error(`crosswalk_match_type_aliases.${from}: an alias cannot point at itself`)
    }
    if (canonical.has(from)) {
      throw new Error(`crosswalk_match_type_aliases.${from}: a deprecated spelling must not also be a member of crosswalk_match_types; two live spellings for one concept is the drift this map exists to remove`)
    }
    if (!canonical.has(to)) {
      throw new Error(`crosswalk_match_type_aliases.${from}: target "${to}" is not a member of crosswalk_match_types`)
    }
  }
  return declared
}

// Normalize one token against a supplied alias map. Returns the input unchanged
// when it is neither canonical nor a known alias, so an unknown sixth token
// still reaches enum validation and fails there rather than being swallowed
// here.
function normalizeMatch(token, aliases) {
  if (aliases === undefined || aliases === null) {
    throw new Error('normalizeMatch requires the alias map declared in vocabulary.yaml; pass aliasesFromVocab(vocab)')
  }
  if (typeof token !== 'string') return token
  return Object.prototype.hasOwnProperty.call(aliases, token) ? aliases[token] : token
}

// Normalize every `match` in a loaded crosswalk document, in place.
// Returns the deprecated entries found, each { key, entry }, for the caller to
// report. Reporting is the caller's job: the validator warns, the generator
// stays silent. The raw token is deliberately NOT returned here: a caller that
// wants it calls rawMatch(entry), which reads what was preserved on the entry.
// That keeps the preservation load-bearing rather than decorative, so a change
// that stopped preserving it would break the warning and be caught.
function normalizeDoc(doc, aliases) {
  if (aliases === undefined || aliases === null) {
    throw new Error('normalizeDoc requires the alias map declared in vocabulary.yaml; pass aliasesFromVocab(vocab)')
  }
  const found = []
  if (!doc || typeof doc !== 'object' || !doc.signal_types) return found
  for (const [key, entry] of Object.entries(doc.signal_types)) {
    if (!entry || typeof entry !== 'object') continue
    const raw = entry.match
    if (typeof raw !== 'string') continue
    const normalized = normalizeMatch(raw, aliases)
    if (normalized !== raw) {
      Object.defineProperty(entry, RAW_MATCH, {
        value: raw, enumerable: false, writable: false, configurable: true,
      })
      entry.match = normalized
      found.push({ key, entry })
    }
  }
  return found
}

// The token as authored: the raw spelling when it was an alias, otherwise the
// value itself. Only the deprecation warning should need this.
function rawMatch(entry) {
  if (!entry || typeof entry !== 'object') return undefined
  return Object.prototype.hasOwnProperty.call(entry, RAW_MATCH)
    ? entry[RAW_MATCH]
    : entry.match
}

module.exports = { RAW_MATCH, normalizeMatch, normalizeDoc, rawMatch, aliasesFromVocab }
