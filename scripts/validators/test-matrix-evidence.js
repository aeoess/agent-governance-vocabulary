const fs = require('fs');
const os = require('os');
const path = require('path');

const repo = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const gen = require(path.join(repo, 'scripts/generate-crosswalk-matrix.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'matrix-evidence-'));
let failed = 0;
let passed = 0;
function check(name, condition) {
  if (condition) { passed++; console.log('ok', name); }
  else { failed++; console.log('FAIL', name); }
}
try {
  fs.copyFileSync(path.join(repo, 'vocabulary.yaml'), path.join(dir, 'vocabulary.yaml'));
  fs.mkdirSync(path.join(dir, 'crosswalk'));
  fs.writeFileSync(path.join(dir, 'crosswalk/qualifiers.yaml'), `system: Qualifiers
signal_types:
  governance_attestation:
    match: partial
    evidence: inferable
  trust_verification:
    match: exact
    evidence: referenced
`);
  const model = gen.buildModel(gen.loadInputs(dir));
  const md = gen.renderMarkdown(model);
  const html = gen.renderHtml(model);
  const header = md.split('\n').find(line => line.startsWith('| System'));
  const row = md.split('\n').find(line => line.startsWith('| Qualifiers'));
  const columns = line => line ? line.split('|').slice(1, -1).map(s => s.trim()) : [];
  const headers = columns(header);
  const cells = columns(row);
  for (const [signal, expected] of [['governance_attestation', '🟡ʰ'], ['trust_verification', '✅ʳ']]) {
    check('Markdown preserves ' + signal + ' evidence', cells[headers.indexOf(signal)] === expected);
    check('HTML preserves ' + signal + ' evidence', html.includes(`<td title="${signal}">${expected}</td>`));
  }
  check('empty Markdown is rejected', gen.checkOutput(model, '', html).length > 0);
  check('empty HTML is rejected', gen.checkOutput(model, md, '').length > 0);
} finally {
  fs.rmSync(dir, {recursive: true, force: true});
}
console.log(`${passed}/${passed + failed} evidence and output checks pass`);
process.exitCode = failed ? 1 : 0;
