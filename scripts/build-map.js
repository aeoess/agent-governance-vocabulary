// Validates map/ records and generates docs/generated/systems-map.md.
// Usage: node scripts/build-map.js          write the page
//        node scripts/build-map.js --check  fail if records are invalid or the page is stale
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const repo = path.join(__dirname, '..');
const root = path.join(repo, 'map');
const outFile = path.join(repo, 'docs', 'generated', 'systems-map.md');
const load = f => yaml.load(fs.readFileSync(f, 'utf8'));
const dir = d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.yaml')).sort()
  .map(f => ({ ...load(path.join(root, d, f)), _file: `map/${d}/${f}` }));

const caps = load(path.join(root, 'capabilities.yaml')).capabilities;
const projects = dir('projects'), edges = dir('edges'), evidence = dir('evidence'), journeys = dir('journeys');
const errors = [];
const err = m => errors.push(m);

// identifiers are unique within and across record kinds
const seen = new Map();
for (const [kind, list] of [['capability', caps], ['project', projects], ['edge', edges], ['evidence', evidence], ['journey', journeys]]) {
  for (const r of list) {
    if (!r.id) { err(`${kind} without id in ${r._file || 'capabilities.yaml'}`); continue; }
    if (seen.has(r.id)) err(`duplicate id ${r.id} (${seen.get(r.id)} and ${kind})`);
    seen.set(r.id, kind);
  }
}
const byId = list => new Map(list.map(r => [r.id, r]));
const C = byId(caps), P = byId(projects), E = byId(edges), V = byId(evidence);
const GAPS = new Set(['role_unrepresented', 'interface_missing', 'connection_proposed_not_exercised', 'run_reported_evidence_unavailable', 'disputed']);
const EVIDENCE_TYPES = new Set(['component_run', 'preflight', 'preflight_rerun', 'end_to_end_run']);
const projectLists = (pid, cap) => (P.get(pid)?.implements || []).some(i => i.capability === cap);
const sides = e => [e.producer, e.consumer].filter(Boolean);
const edgeCaps = e => sides(e).flatMap(s => s.capabilities || []);
const isUrl = s => typeof s === 'string' && /^https:\/\//.test(s);

for (const p of projects) {
  for (const i of p.implements || []) if (!C.has(i.capability)) err(`${p.id}: unknown capability ${i.capability}`);
  const c = p.owner_confirmation;
  if (c) {
    if (c.by !== p.maintainer) err(`${p.id}: confirmation by someone other than the maintainer`);
    if (!isUrl(c.ref)) err(`${p.id}: confirmation needs a link to where the maintainer confirmed it`);
    if (!c.revision || !c.date) err(`${p.id}: confirmation needs the confirmed revision and date`);
  }
}
for (const e of edges) {
  for (const s of sides(e)) {
    if (!P.has(s.project)) err(`${e.id}: unknown project ${s.project}`);
    for (const cap of s.capabilities || []) {
      if (!C.has(cap)) err(`${e.id}: unknown capability ${cap}`);
      else if (!projectLists(s.project, cap)) err(`${e.id}: ${s.project} does not list ${cap}`);
    }
  }
  if (e.kind === 'assurance' && !E.has(e.observes)) err(`${e.id}: assurance edge must observe a known edge`);
  for (const r of e.evidence || []) if (!V.has(r)) err(`${e.id}: unknown evidence ${r}`);
  if ((e.evidence || []).length && !(e.pins || []).length) err(`${e.id}: evidence without a pinned artifact`);
}
for (const v of evidence) {
  if (!EVIDENCE_TYPES.has(v.type)) err(`${v.id}: unknown evidence type ${v.type}`);
  if (!v.runner) err(`${v.id}: no runner`);
  if ((v.independent_for || []).length && !(v.runner_authored || []).length) err(`${v.id}: independence claimed without stating what the runner authored`);
  for (const r of v.reviews || []) if (!r.by || !r.date || !r.revision || !r.method) err(`${v.id}: a review needs by, date, revision and method`);
}
for (const j of journeys) {
  const used = new Set();
  for (const s of j.steps) {
    if (!C.has(s.capability)) err(`${j.id}: unknown capability ${s.capability}`);
    if (s.gap && !GAPS.has(s.gap)) err(`${j.id}: unknown gap kind ${s.gap}`);
    if (!s.implementations.length && !s.gap) err(`${j.id}: ${s.capability} has no implementation and no gap`);
    for (const i of s.implementations) {
      if (!P.has(i)) err(`${j.id}: unknown project ${i}`);
      else if (!projectLists(i, s.capability)) err(`${j.id}: ${i} does not list ${s.capability}`);
    }
    if (s.via) {
      const e = E.get(s.via);
      if (!e) { err(`${j.id}: unknown edge ${s.via}`); continue; }
      used.add(e.id);
      if (!edgeCaps(e).includes(s.capability)) err(`${j.id}: edge ${e.id} does not exercise ${s.capability}`);
      if (!sides(e).some(x => s.implementations.includes(x.project))) err(`${j.id}: edge ${e.id} has no endpoint among the implementations of ${s.capability}`);
    }
  }
  if (j.end_to_end_run != null) {
    const v = V.get(j.end_to_end_run);
    if (!v) err(`${j.id}: end-to-end run must reference evidence`);
    else {
      if (v.type !== 'end_to_end_run') err(`${j.id}: ${v.id} is ${v.type}, not an end-to-end run`);
      if (v.journey !== j.id) err(`${j.id}: ${v.id} is not scoped to this journey`);
      const need = [...used].flatMap(id => (E.get(id).pins || []).map(p => p.commit));
      const have = new Set(v.covers_pins || []);
      const missing = need.filter(c => !have.has(c));
      if (missing.length) err(`${j.id}: end-to-end run does not cover pins ${missing.map(c => c.slice(0, 8)).join(', ')}`);
    }
  }
}
if (errors.length) { console.error(errors.join('\n')); console.error(`FAIL ${errors.length}`); process.exit(1); }

// rendering
const name = id => P.get(id)?.name || id;
const short = c => c.slice(0, 8);
const pinLink = p => `[${p.repo}@${short(p.commit)}](https://github.com/${p.repo}/tree/${p.commit})${p.tag ? ` (tag \`${p.tag}\`)` : ''}`;
const reviewText = v => (v.reviews || []).length
  ? v.reviews.map(r => `Reviewed by ${r.by} on ${r.date} at ${short(r.revision)}, ${r.method}`).join('; ')
  : 'Not reviewed by the map editors';
const evidenceLine = v => {
  const ind = (v.independent_for || []).length ? `independent for ${v.independent_for.join(', ')}` : 'not independent';
  const res = Object.keys(v.results_as_emitted || {}).length ? ` Results as emitted: ${Object.entries(v.results_as_emitted).map(([k, x]) => `${k} ${x}`).join(', ')}.` : '';
  return `\`${v.id}\` ${v.type.replace(/_/g, ' ')} by @${v.runner}, ${v.record_state}, ${ind}. Source: ${isUrl(v.source) ? `[link](${v.source})` : v.source}. ${reviewText(v)}.${res}${v.note ? ' ' + v.note : ''}`;
};
const nodeId = (pid, cap) => `${pid}__${cap}`.replace(/[^A-Za-z0-9_]/g, '_');

let out = '<!-- generated by scripts/build-map.js from map/, do not edit -->\n# Shared systems map (prototype)\n\n';
out += 'Proposed and non-normative. Listing is a description, not membership, approval or agreement to shared governance. A role with no implementation here is not represented in this map, which says nothing about whether it exists elsewhere. Role identifiers are local to this map.\n\n';
for (const j of journeys) {
  out += `## Journey: ${j.action}\n\nStatus: **${j.status}**. End-to-end run: **${j.end_to_end_run ? j.end_to_end_run : 'none'}**. ${j.acceptance}\n\n`;
  out += '```mermaid\nflowchart LR\n';
  const filled = j.steps.filter(s => s.implementations.length), open = j.steps.filter(s => !s.implementations.length);
  for (const s of filled) for (const i of s.implementations) out += `  ${nodeId(i, s.capability)}["${s.capability}<br/>${name(i)}"]\n`;
  out += '  subgraph OPEN["Open roles in this journey"]\n';
  open.forEach((s, n) => { out += `    open${n}["${s.capability}"]\n`; });
  out += '  end\n';
  const drawn = new Set();
  for (const s of filled) {
    if (!s.via || drawn.has(s.via)) continue;
    const e = E.get(s.via); drawn.add(e.id);
    const stateWord = (e.evidence || []).length ? 'pinned, component runs' : 'proposed, not exercised';
    const arrow = (e.evidence || []).length ? '==>' : '-.->';
    if (e.kind === 'assurance') {
      const o = E.get(e.observes);
      for (const pc of e.producer.capabilities) for (const oc of o.consumer.capabilities) out += `  ${nodeId(e.producer.project, pc)} -.->|"${e.id} observes ${o.id}"| ${nodeId(o.consumer.project, oc)}\n`;
    } else {
      for (const pc of e.producer.capabilities) for (const cc of e.consumer.capabilities) out += `  ${nodeId(e.producer.project, pc)} ${arrow}|"${e.id} ${stateWord}"| ${nodeId(e.consumer.project, cc)}\n`;
    }
  }
  out += '```\n\nOnly declared edges are drawn. Steps inside one project have no edge.\n\n';
  out += '| role | job | implementation | via | state and limits |\n|---|---|---|---|---|\n';
  for (const s of j.steps) {
    const c = C.get(s.capability), e = s.via && E.get(s.via);
    let state = s.gap ? s.gap.replace(/_/g, ' ') : e ? ((e.evidence || []).length ? 'pinned, see edge' : 'no evidence') : 'within one project';
    if (s.note) state += `. ${s.note}`;
    if (e && (e.limitations || []).length) state += `. Limits: ${e.limitations.join(', ')}`;
    out += `| \`${s.capability}\` | ${c.job} | ${s.implementations.map(name).join(', ') || 'none in this map'} | ${s.via || ''} | ${state} |\n`;
  }
  out += '\n';
}
out += '## Edges\n\n';
for (const e of edges) {
  out += `### ${e.id} (${e.kind})\n\n${e.artifact}.\n\n`;
  out += `- Proposed by @${e.proposed_by.who}: [link](${e.proposed_by.ref})\n`;
  out += `- Pins: ${(e.pins || []).length ? e.pins.map(pinLink).join(', ') : 'none'}\n`;
  if ((e.field_mappings || []).length) out += `- Field mappings: ${e.field_mappings.map(m => `\`${m.from}\` to \`${m.to}\` ${m.match}, ${(m.confirmed_by || []).length ? 'confirmed by ' + m.confirmed_by.join(', ') : 'unconfirmed'}`).join('; ')}\n`;
  out += `- Limits: ${(e.limitations || []).join(', ') || 'none recorded'}\n`;
  out += `- Does not establish: ${e.does_not_establish.join(', ')}\n`;
  out += `- Evidence:${(e.evidence || []).length ? '\n' + e.evidence.map(id => `  - ${evidenceLine(V.get(id))}`).join('\n') : ' none'}\n\n`;
}
out += '## Projects\n\n| project | maintainer | description from | maintainer confirmation | limits |\n|---|---|---|---|---|\n';
for (const p of projects) {
  const c = p.owner_confirmation;
  out += `| [${p.name}](${p.repository || '#'}) | @${p.maintainer} | ${p.description_source} | ${c ? `[${c.date} at ${short(c.revision)}](${c.ref})` : 'pending'} | ${(p.limitations || []).join(', ')} |\n`;
}

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (cur !== out) { console.error('generated view is stale, run: node scripts/build-map.js'); process.exit(1); }
  console.log('map check ok');
} else { fs.writeFileSync(outFile, out); console.log('wrote', path.relative(repo, outFile)); }
