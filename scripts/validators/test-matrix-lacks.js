'use strict';
// test-matrix-lacks.js - a partial mapping with `lacks` (#254) must keep its
// mark in both the Markdown and the HTML matrix, so it never renders as a
// plain partial match.
const fs = require('fs');
const os = require('os');
const path = require('path');

const repo = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const gen = require(path.join(repo, 'scripts/generate-crosswalk-matrix.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'matrix-lacks-'));
let failed = 0;
let passed = 0;
function check(name, condition) {
  if (condition) { passed++; console.log('ok', name); }
  else { failed++; console.log('FAIL', name); }
}
try {
  fs.copyFileSync(path.join(repo, 'vocabulary.yaml'), path.join(dir, 'vocabulary.yaml'));
  fs.mkdirSync(path.join(dir, 'crosswalk'));
  fs.writeFileSync(path.join(dir, 'crosswalk/lacking.yaml'), `system: Lacking
signal_types:
  governance_attestation:
    match: partial
    lacks: [signature]
  peer_review:
    match: partial
    evidence: inferable
    lacks: [signature, issuer_binding]
  trust_verification:
    match: partial
  cognitive_attestation:
    match: partial
    lacks: [issuer_binding]
`);
  const model = gen.buildModel(gen.loadInputs(dir));
  const md = gen.renderMarkdown(model);
  const html = gen.renderHtml(model);
  const header = md.split('\n').find(line => line.startsWith('| System'));
  const row = md.split('\n').find(line => line.startsWith('| Lacking'));
  const columns = line => line ? line.split('|').slice(1, -1).map(s => s.trim()) : [];
  const headers = columns(header);
  const cells = columns(row);
  for (const [signal, expected] of [
    ['governance_attestation', '🟡 (lacks: signature)'],
    ['peer_review', '🟡ʰ (lacks: signature, issuer_binding)'],
    ['trust_verification', '🟡'],
    ['cognitive_attestation', '🟡 (lacks: issuer_binding)'],
  ]) {
    check('Markdown renders ' + signal + ' as ' + expected, cells[headers.indexOf(signal)] === expected);
    check('HTML renders ' + signal + ' as ' + expected, html.includes(`<td title="${signal}">${expected}</td>`));
  }
  check('Markdown legend explains the lacks mark', md.includes('(lacks: …)` after a badge'));
  check('HTML legend explains the lacks mark', html.includes('<code>(lacks: …)</code> after a badge'));
  check('the output check accepts a cell with both qualifiers', gen.checkOutput(model, md, html).length === 0);
  const broken = { ...model, rows: model.rows.map(r => ({ ...r, cells: r.cells.map(c => c.replace(/ \(lacks: [^)]*\)$/, '')) })) };
  check('the output check reports a lost lacks qualifier', gen.checkOutput(broken, md, html).some(p => p.includes('lacks qualifier lost')));
} finally {
  fs.rmSync(dir, {recursive: true, force: true});
}
console.log(`${passed}/${passed + failed} lacks rendering checks pass`);
process.exitCode = failed ? 1 : 0;
