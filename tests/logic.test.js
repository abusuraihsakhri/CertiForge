/**
 * CertiForge logic tests — run with:  npm test   (or: node tests/logic.test.js)
 * Requires Node >= 20.19 (ESM, structuredClone, WebCrypto globals).
 *
 * No framework by design: the app ships zero build steps, and this harness fakes
 * just enough DOM/vendor surface to exercise the real modules end-to-end.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Real QR library in sloppy global mode (direct eval in a module is strict-scoped).
(0, eval)(fs.readFileSync(path.join(__dirname, '../vendor/qrcode.min.js'), 'utf8'));

global.window = global;
global.self = global;
global.document = {
  createElement: () => ({
    getContext: () => ({ fillRect: () => {}, drawImage: () => {}, putImageData: () => {} }),
    toDataURL: () => 'data:image/png;base64,mock',
    style: {}, dataset: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    appendChild: () => {}, addEventListener: () => {}, removeEventListener: () => {}, querySelector: () => null, querySelectorAll: () => []
  }),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  fonts: { add: () => {} },
  body: { appendChild: () => {} }
};
global.FontFace = class FontFace {
  constructor(family, source) { this.family = family; this.source = source; }
  async load() { return this; }
};
global.Blob = class Blob { constructor(parts, opts) { this.parts = parts; this.opts = opts; } };
global.URL = Object.assign(global.URL || {}, { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} });
global.Image = class Image {
  set src(v) { setTimeout(() => { if (this.onload) this.onload(); }, 0); }
};
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
if (typeof global.navigator === 'undefined') {
  Object.defineProperty(global, 'navigator', { value: { hardwareConcurrency: 2 }, configurable: true, writable: true });
}
global.window.jspdf = {
  jsPDF: class {
    constructor() {}
    addImage() {}
    output() { return new global.Blob(['mock-pdf'], { type: 'application/pdf' }); }
  }
};

function assert(x, msg) { if (!x) throw new Error(msg); }
function throws(fn, msg) {
  try { fn(); } catch (_) { return; }
  throw new Error(msg);
}

let passed = 0;
function ok(section) { passed++; console.log(`  ✓ ${section}`); }

(async () => {
  const { state, defaultState, randomVerifySecret } = await import('../js/state.js');
  const { getTemplate, templates } = await import('../js/templates.js');
  const { autoMap, mappedRows } = await import('../js/mapping.js');
  const { parseCSV, parseSpreadsheet } = await import('../js/spreadsheet.js');
  const { validateRows, validateProject } = await import('../js/validator.js');
  const { renderCertificateSVG, buildSvgSkeleton, clearSvgCache, wrapToLines } = await import('../js/pdf.js');
  const { generateAll, isWorkerSupported, generationRows, isGenerating, cancelGeneration, buildPublicRegistry } = await import('../js/generator.js');
  const cryptoModule = await import('../js/crypto.js');
  const { loadProjectFile, SAFE_FONT_DATA_URL, projectData } = await import('../js/project.js');
  const { pushHistory, resetHistory, undo, redo } = await import('../js/history.js');
  const { sanitizeProjectState, detectFontFormat, normalizeFontDataUrl } = await import('../js/security.js');
  const { LEGACY_VERIFY_SALT, verifyBaseUrl } = await import('../js/config.js');
  const ui = await import('../js/ui.js');
  const { parseRecord, normalizeRegistry, evaluateRecord, evaluateEcdsaRecord, renderUnconfirmed, renderVerified, renderEcdsaVerified, renderEcdsaMismatch } = await import('../js/verify.js');
  const {
    extractConferencePrefix,
    extractConferenceYear,
    computeVerificationSignature,
    getVerificationUrl,
    getVerificationBaseUrl,
    verificationContext,
    applyVerificationSignature,
    resolveText,
    sampleRecord,
    formatId
  } = await import('../js/variables.js');

  // 1. Conference prefix & year derivation
  assert(extractConferencePrefix('International Conference on Machine Learning 2026') === 'ICML', 'ICML prefix failed');
  assert(extractConferenceYear('International Conference on Machine Learning 2026') === '2026', 'Year extraction failed');
  assert(extractConferencePrefix('DevOps World 2026') === 'DW', 'DW prefix failed');
  assert(extractConferencePrefix('PyCon 2026') === 'PYCON', 'PyCon prefix failed');
  assert(extractConferencePrefix('10th International Conference on Computational Science') === 'ICCS', 'Ordinal stripping prefix failed');
  assert(extractConferencePrefix('') === 'CONF', 'Empty fallback failed');
  ok('1. prefix/year derivation');

  // 2. Signature v2: keyed digest, per-field coverage, no delimiter collisions
  const sampleCert = {
    CERTIFICATE_ID: 'ICML-2026-0001',
    NAME: 'Alice Example',
    ROLE: 'Speaker',
    EVENT: 'ICML 2026',
    DATE: '18 Sep 2026',
    ORGANIZATION: 'Society'
  };
  const sig1 = computeVerificationSignature(sampleCert, 'test-secret');
  assert(/^[a-f0-9]{16}$/.test(sig1), 'Signature must be 16 hex chars');
  assert(sig1 === computeVerificationSignature(sampleCert, 'test-secret'), 'Signature not deterministic');
  for (const field of ['CERTIFICATE_ID', 'NAME', 'ROLE', 'EVENT', 'DATE', 'ORGANIZATION']) {
    const tampered = { ...sampleCert, [field]: sampleCert[field] + '!' };
    assert(computeVerificationSignature(tampered, 'test-secret') !== sig1, `Signature must detect tampering with ${field}`);
  }
  const shiftA = computeVerificationSignature({ CERTIFICATE_ID: 'X', NAME: 'A|B', ROLE: '', EVENT: '', DATE: '', ORGANIZATION: '' }, 'k');
  const shiftB = computeVerificationSignature({ CERTIFICATE_ID: 'X', NAME: 'A', ROLE: 'B', EVENT: '', DATE: '', ORGANIZATION: '' }, 'k');
  assert(shiftA !== shiftB, 'Delimiter injection / field-shift collision must not produce identical signatures');
  throws(() => computeVerificationSignature(sampleCert, ''), 'Empty signing secret must be rejected');
  throws(() => computeVerificationSignature(sampleCert), 'Missing signing secret must be rejected');
  assert(state.settings.verifySecret !== LEGACY_VERIFY_SALT, 'Default verifySecret must be random, not the legacy public salt');
  assert(randomVerifySecret() !== randomVerifySecret(), 'randomVerifySecret must produce unique values');
  const verifyUrl = getVerificationUrl(sampleCert, 'test-secret');
  assert(verifyUrl.includes('id=ICML-2026-0001') && verifyUrl.includes('sig=' + sig1), 'Verification URL must carry id and sig');
  assert(!verifyUrl.includes('name=') && !verifyUrl.includes('Alice') && !verifyUrl.includes('role='), 'Verification URL must not carry recipient PII');
  ok('2. signature v2 (fields, collisions, secret required, random default salt)');

  // 2b. file:// and null-origin fallback for verification base URL
  assert(getVerificationBaseUrl({ origin: 'null', pathname: '/C:/Users/x/index.html' }) === verifyBaseUrl, 'file:// (null origin) must fall back to configured URL');
  assert(getVerificationBaseUrl({ origin: 'https://e.x', pathname: '/a/b/index.html' }) === 'https://e.x/a/b/verify.html', 'http(s) origin must build directory-relative URL');
  ok('2b. verification base URL resolution');

  // 3. Mapping — empty cells never blank conference-wide values
  state.elements = getTemplate('modern').elements.map(e => ({ ...e }));
  state.templateId = 'modern';
  state.rows = [
    { 'Participant Name': 'Alice Example', 'Role': 'Speaker', 'Registration ID': 'R001', 'Event': '' },
    { 'Participant Name': '', 'Role': 'Delegate', 'Registration ID': 'R002' },
    { 'Participant Name': 'Alice Example', 'Role': 'Speaker', 'Registration ID': 'R003' }
  ];
  state.columns = Object.keys(state.rows[0]);
  state.globalFields = { EVENT: 'Annual Meeting', DATE: '18 Sep 2026', VENUE: 'Hall A', ORGANIZATION: 'Society' };
  autoMap();
  assert(state.mappings.NAME === 'Participant Name', 'NAME auto-map failed');
  assert(state.mappings.ROLE === 'Role', 'ROLE auto-map failed');
  state.mappings.EVENT = 'Event'; // mapped column exists but cell is empty
  const mapped = mappedRows();
  assert(mapped[0].EVENT === 'Annual Meeting', 'Empty mapped cell must fall back to conference-wide value');
  assert(mapped[0].REGISTRATION_ID === 'R001', 'custom token failed');
  state.mappings.__proto__ = 'Pollute';
  const polluted = mappedRows();
  assert(Object.getPrototypeOf(polluted[0]) === Object.prototype, 'Mappings with __proto__ key must be ignored');
  delete state.mappings.__proto__;
  delete state.mappings.EVENT;
  ok('3. mapping (global fallback, prototype safety)');

  // 4. No sample-record leakage into real output + single-pass token substitution
  assert(resolveText('{{EMAIL}}', {}, 0) === '', 'Unmapped tokens must render empty — never personal/sample data');
  assert(!JSON.stringify(sampleRecord()).includes('abusuraih'), 'sampleRecord must not contain personal data');
  state.globalFields.TITLE = 'see {{NAME}}';
  assert(resolveText('{{TITLE}}', { NAME: 'Bob' }, 0) === 'see {{NAME}}', 'Token values must not be re-substituted (recursive injection)');
  delete state.globalFields.TITLE;
  ok('4. resolveText (no sample leak, non-recursive)');

  // 5. QR element rendering + z-order + text wrapping in the PDF path
  state.elements.push({ id: 'qr_test', type: 'qr', text: '{{VERIFY_URL}}', x: 100, y: 100, w: 80 });
  state.elements.push({ id: 'wrap_test', type: 'text', text: '{{NAME}}', x: 500, y: 60, w: 120, size: 20, font: 'Arial', color: '#000000', align: 'left', lineHeight: 1.5 });
  const svg = renderCertificateSVG(mapped[0], 0);
  assert(svg.includes('Alice Example') && svg.includes('Annual Meeting'), 'SVG text render failed');
  assert(svg.includes('data-el="qr_test"') && svg.includes('href="data:image/'), 'SVG QR element render failed');
  assert(svg.includes('text-anchor="start"'), 'left alignment must map to text-anchor=start');
  assert((svg.match(/data-el="wrap_test"/g) || []).length > 1, 'Long text within a width box must wrap into multiple <text> lines in the PDF');
  assert(wrapToLines('one two three four five', 'Arial', 20, 400, 100).length >= 2, 'wrapToLines must break by width');
  state.elements = [
    { id: 'z-rect1', type: 'shape', shape: 'rect', x: 0, y: 0, w: 10, h: 10, fill: '#000' },
    { id: 'z-text', type: 'text', text: 'Hi', x: 50, y: 50, w: 0, size: 10 },
    { id: 'z-rect2', type: 'shape', shape: 'rect', x: 0, y: 0, w: 10, h: 10, fill: '#111' }
  ];
  const zSvg = renderCertificateSVG({}, 0);
  assert(zSvg.indexOf('z-rect1') < zSvg.indexOf('z-text') && zSvg.indexOf('z-text') < zSvg.indexOf('z-rect2'), 'PDF must respect element z-order');
  ok('5. SVG output (QR, align, wrap, z-order)');

  // 6. Batch generation: consistent numbering, collision-proof dedupe
  state.templateId = 'modern';
  state.elements = getTemplate('modern').elements.map(e => ({ ...e }));
  state.rows = [
    { 'Participant Name': 'A Row', 'Role': 'Speaker' },
    { 'Participant Name': '', 'Role': 'Delegate' },
    { 'Participant Name': 'A Row', 'Role': 'Speaker' },
    { 'Participant Name': 'A Row_2', 'Role': 'Speaker' }
  ];
  state.columns = ['Participant Name', 'Role'];
  autoMap();
  state.settings.filename = '{{NAME}}.pdf';
  state.certificate.start = 1; state.certificate.digits = 4;
  const genRows = generationRows();
  assert(genRows.length === 3, 'generationRows must exclude nameless rows');
  assert(verificationContext(genRows[2], 2).CERTIFICATE_ID === formatId(3), 'Preview/generate numbering must be index-after-filter');
  const result = await generateAll();
  assert(result.files.length === 3 && result.skipped === 1, 'generation skip failed');
  const names = result.files.map(f => f.name);
  assert(names[1] === 'A Row_2.pdf' && names[2] === 'A Row_2_2.pdf', `filename collision resolution failed: ${names.join(', ')}`);
  assert(new Set(names).size === 3, 'filenames must be unique');
  assert(result.registry.length === 3 && result.registry.every(r => r.sig && r.id), 'registry data invalid');
  assert(result.registry[0].id === formatId(1) && result.registry[2].id === formatId(3), 'registry must use filtered numbering');
  assert(!isGenerating(), 'generator must not stay running after completion');
  assert(typeof cancelGeneration === 'function', 'cancelGeneration must be exported');
  ok('6. batch generation (skip, numbering, collision-proof dedupe)');

  // 7. CSV parser: quotes, BOM, duplicate headers, ragged rows
  const csv = 'Name,Role,Note\n"Doe, Jane",Speaker,"A ""quoted"" note"\nBob,Delegate,OK\n';
  const parsed = parseCSV(csv);
  assert(parsed[0].Name === 'Doe, Jane' && parsed[0].Note === 'A "quoted" note', 'CSV parser failed');
  const bom = parseCSV('\uFEFFName,Role\nAlice,Speaker\n');
  assert(Object.keys(bom[0])[0] === 'Name', 'UTF-8 BOM must be stripped from first header');
  const dupes = parseCSV('Name,Role,Name\nA,B,C\n');
  assert(dupes[0]['Name (2)'] === 'C', 'duplicate headers must be disambiguated');
  const ragged = parseCSV('A,B\n1,2,3\n4\n');
  assert(ragged[0]['Column 3'] === '3' && ragged[1]['Column 3'] === '', 'ragged rows must be unified with extra columns');
  ok('7. CSV (quotes, BOM, dupes, ragged)');

  // 8. Validation
  const v = validateRows();
  assert(v.total === 4 && v.valid === 3 && v.missingName === 1, 'validation failed');
  assert(validateProject().valid === true, 'validateProject should pass with data loaded');
  ok('8. validation');

  // 9. Project import/restore hardening
  const snapshot = {
    version: 3, projectName: 'Saved', templateId: 'modern',
    elements: [
      { id: 'x', type: 'text', text: 'Edited', x: 1, y: 2, w: 3, size: 12, weight: 800 },
      { id: 'nan', type: 'text', text: 'NaN', x: 5, y: 5, h: null, w: 1e12 }
    ],
    mappings: { NAME: 'Name', __proto__: 'bad', NOPE: 'x' },
    globalFields: { EVENT: 'Saved event' },
    certificate: { prefix: 'ABC', digits: 1e9, start: -5 },
    settings: { filename: '{{NAME}}.pdf' }
  };
  await loadProjectFile({ size: 1000, text: async () => JSON.stringify(snapshot) });
  assert(state.elements[0].text === 'Edited' && state.globalFields.EVENT === 'Saved event', 'project import failed');
  assert(state.elements[0].weight === 800, 'weight 800 must survive project import');
  assert(state.elements[1].h === undefined, 'null h must not become NaN in state');
  assert(state.elements[1].w <= 5000, 'absurd width must be clamped');
  assert(state.certificate.digits === 8 && state.certificate.start === 0, 'certificate numbers must be clamped on import');
  assert(!Object.keys(state.mappings).includes('__proto__') && !('NOPE' in state.mappings), 'invalid mapping keys must be dropped');
  await loadProjectFile({ size: 1000, text: async () => JSON.stringify({ ...snapshot, version: 2 }) }).then(
    () => { throw new Error('v2 projects must be rejected with a clear error'); },
    (e) => assert(/version/i.test(e.message), 'rejection must mention version')
  );
  await loadProjectFile({ size: 1000, text: async () => '{not json' }).then(
    () => { throw new Error('invalid JSON must be rejected'); },
    (e) => assert(/valid JSON/i.test(e.message), 'invalid JSON message')
  );
  const patch = sanitizeProjectState({ elements: [], templateId: 'no-such-template' }, defaultState());
  assert(patch.templateId === 'modern', 'unknown template falls back to default via shared sanitizer');
  ok('9. project import/restore hardening');

  // 10. Template catalog and Indian layout rendering
  assert(templates.length === 13, `Expected 13 templates, found ${templates.length}`);
  const medConf = getTemplate('indian-medical-conf');
  assert(medConf && medConf.name === 'Indian Medical Conference', 'Indian Medical Conf template missing');
  const medAward = getTemplate('indian-medical-award');
  assert(medAward && medAward.name === 'Indian Conference Merit & Award', 'Indian Medical Award template missing');

  state.templateId = 'indian-medical-conf';
  state.elements = medConf.elements.map(e => ({ ...e }));
  const indianSvg = renderCertificateSVG({
    NAME: 'Dr Test Recipient',
    ROLE: 'Delegate',
    ORGANIZATION: 'Delhi Society of Haematology',
    EVENT: '32nd Annual Conference',
    VENUE: 'Maulana Azad Medical College, New Delhi',
    DATE: '8th October 2026'
  }, 0);
  assert(indianSvg.includes('Dr Test Recipient'), 'Indian recipient name missing in SVG');
  assert(indianSvg.includes('Delhi Society of Haematology'), 'Indian organization missing in SVG');
  assert(indianSvg.includes('data-el="logo-soc"') && indianSvg.includes('data-el="logo-col"'), 'Indian dual crests missing in SVG');
  assert(indianSvg.includes('data-el="sig1-img"') && indianSvg.includes('data-el="sig4-img"'), 'Indian 4-column signatures missing in SVG');
  ok('10. template catalog + Indian layout rendering');

  // 11. SVG font embedding (validated) & attribute hardening
  state.fonts = [{ family: 'CustomHeadingFont', data: 'data:font/woff2;base64,d09GMgABAAAAAA' }];
  clearSvgCache();
  const skeleton = buildSvgSkeleton('modern');
  assert(skeleton.includes('@font-face { font-family: "CustomHeadingFont"; src: url("data:font/woff2;base64,d09GMgABAAAAAA"); }'), 'Valid custom font must be embedded');
  state.fonts = [{ family: 'Evil', data: 'data:font/woff2;base64,</style><script>alert(1)</script>' }];
  clearSvgCache();
  const evilSkeleton = buildSvgSkeleton('modern');
  assert(!evilSkeleton.includes('<script>') && !evilSkeleton.includes('Evil'), 'Unsafe font data must never reach the SVG');
  state.fonts = [];
  clearSvgCache();
  ok('11. font embedding validation');

  // 12. Skeleton cache invalidation (content revision)
  clearSvgCache();
  const skelA1 = buildSvgSkeleton('modern');
  const skelA2 = buildSvgSkeleton('modern');
  assert(skelA1 === skelA2, 'Same revision must return cached skeleton');
  assert(typeof skelA1 === 'string' && skelA1.startsWith('<svg'), 'Skeleton must be valid SVG');
  const skelB1 = buildSvgSkeleton('classic');
  assert(skelB1 !== skelA1, 'Different templates must produce distinct skeletons');
  clearSvgCache();
  assert(buildSvgSkeleton('modern') === skelA1, 'After invalidation, skeleton content must be deterministic');
  ok('12. skeleton caching with revision invalidation');

  // 13. History: shallow-share snapshots, independence from live mutation
  state.templateId = 'modern';
  resetHistory();
  state.elements = [
    { id: 'el_qr', type: 'qr', text: '{{VERIFY_URL}}', _qrDataUrl: 'data:image/png;base64,largeqrcode', x: 10, y: 10, w: 80 },
    { id: 'el_shape', type: 'shape', shape: 'rect', _svg: '<rect width="20" height="20"/>', x: 20, y: 20, w: 50, h: 50 },
    { id: 'el_text', type: 'text', text: 'Certificate of Excellence', size: 20, x: 100, y: 100 }
  ];
  pushHistory();
  const snap = state.history.stack[state.history.index];
  assert(snap.length === 3, 'snapshot length');
  assert(!('_qrDataUrl' in snap[0]) && !('_svg' in snap[1]), 'transient fields stripped');
  assert(state.elements[0]._qrDataUrl === 'data:image/png;base64,largeqrcode', 'live element keeps transient fields');
  state.elements[2].text = 'MUTATED';
  assert(snap[2].text === 'Certificate of Excellence', 'snapshot must be independent of live mutations');
  state.elements[2].text = 'Certificate of Excellence';
  assert(undo(), 'undo returns true');
  assert(redo(), 'redo returns true');
  assert(projectData().version === 3, 'projectData serializable');
  ok('13. history snapshots + undo/redo mechanics');

  // 14. Font URI allowlist + magic-byte format detection
  const validFontDataURIs = [
    'data:font/woff2;base64,d09GMgABAAAAAA',
    'data:font/woff;base64,d09GMgABAAAAAA==',
    'data:font/truetype;base64,AAEAAAASAQA',
    'data:font/opentype;base64,T1RUTwACAA',
    'data:application/x-font-ttf;base64,AAEAAAASAQA',
    'data:application/x-font-woff;base64,d09GMgABAAAAAA',
    'data:application/font-woff2;base64,d09GMgABAAAAAA'
  ];
  const maliciousFontDataURIs = [
    'data:font/woff2;base64,</style><script>alert(1)</script>',
    'data:font/woff2;base64,abc"</style><script>alert("xss")</script>',
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'https://evil.com/font.woff2',
    'data:application/javascript;base64,YWxlcnQoMSk=',
    ''
  ];
  validFontDataURIs.forEach(uri => assert(SAFE_FONT_DATA_URL.test(uri), `valid font URI rejected: ${uri}`));
  maliciousFontDataURIs.forEach(uri => assert(!SAFE_FONT_DATA_URL.test(uri), `malicious font URI accepted: ${uri}`));
  assert(detectFontFormat(new TextEncoder().encode('wOF2xxxx')) === 'woff2', 'woff2 magic');
  assert(detectFontFormat(new TextEncoder().encode('wOFFxxxx')) === 'woff', 'woff magic');
  assert(detectFontFormat(new TextEncoder().encode('OTTOxxxx')) === 'opentype', 'otto magic');
  assert(detectFontFormat(new Uint8Array([0x00, 0x01, 0x00, 0x00, 0])) === 'truetype', 'ttf magic');
  assert(detectFontFormat(new TextEncoder().encode('GARBAGE!')) === null, 'garbage must be rejected');
  const normalized = normalizeFontDataUrl('data:application/octet-stream;base64,d09GMgABAAAAAA', 'woff2');
  assert(SAFE_FONT_DATA_URL.test(normalized), 'normalized font URL must pass the allowlist');
  throws(() => normalizeFontDataUrl('data:font/woff2;base64,d09G', null), 'unknown format must throw');
  ok('14. font security (allowlist + magic bytes)');

  // 15. Verification portal: registry-backed trust model, no secrets anywhere
  const cardMock = { innerHTML: '' };
  const secret = 'portal-secret';
  const rec = { id: 'CERT-1', name: 'Alice Example', role: 'Speaker', event: 'ICML 2026', date: '18 Sep 2026', organization: 'Society' };
  const realSig = computeVerificationSignature(rec, secret);
  const registry = normalizeRegistry({ event: 'ICML 2026', certificates: [{ id: 'CERT-1', name: 'Alice Example', role: 'Speaker', event: 'ICML 2026', date: '18 Sep 2026', organization: 'Society', sig: realSig }] });
  assert(evaluateRecord({ ...rec, sig: realSig }, registry).status === 'verified', 'matching registry record must verify');
  assert(evaluateRecord({ ...rec, name: 'Mallory', sig: realSig }, registry).status === 'mismatch', 'field mismatch must fail');
  assert(evaluateRecord({ ...rec, sig: 'deadbeefdeadbeef' }, registry).status === 'mismatch', 'bad digest must fail');
  assert(evaluateRecord({ id: 'NOPE', sig: realSig }, registry).status === 'not-found', 'unknown id must fail');
  assert(evaluateRecord({ ...rec, sig: realSig }, null).status === 'no-registry', 'without registry the portal must NOT claim verified');
  assert(evaluateRecord({ ...rec, sig: 'zzzz' }, registry).status === 'invalid', 'malformed sig must be invalid');
  const legacy = parseRecord('id=CERT-1&sig=abc&secret=attacker-key&key=alt');
  assert(!('secret' in legacy) && legacy.legacySecretPresent === true, 'URL-borne secrets must be ignored and flagged legacy');
  renderUnconfirmed(cardMock, { ...rec, sig: realSig }, null);
  assert(!cardMock.innerHTML.includes('Credential Verified'), 'unconfirmed view must never claim verification');
  assert(cardMock.innerHTML.includes('Cannot Verify Without a Registry'), 'unconfirmed view must be honest');
  renderVerified(cardMock, rec, registry.certificates[0]);
  assert(cardMock.innerHTML.includes('Registry-Confirmed Credential'), 'verified view names the registry');

  // Schema 2: hash-only public registry + minimal id+sig links
  delete state._signingPublicKey;
  const reg2 = normalizeRegistry({ schema: 2, event: 'ICML 2026', organization: 'Society', generatedAt: '2026-09-20T00:00:00Z', certificates: [{ id: 'CERT-1', sig: realSig }] });
  assert(reg2.schema === 2, 'schema 2 must survive normalization');
  assert(!reg2.certificates.some(c => c.name), 'schema-2 registry must expose no recipient names');
  assert(evaluateRecord({ id: 'CERT-1', sig: realSig }, reg2).status === 'verified', 'minimal link: id+sig pair must verify against schema-2 registry');
  assert(evaluateRecord({ id: 'CERT-1', sig: 'deadbeefdeadbeef' }, reg2).status === 'mismatch', 'schema-2: wrong digest must fail');
  assert(evaluateRecord({ ...rec, sig: realSig }, reg2).status === 'verified', 'legacy full-field link must still verify via digest against schema-2 registry');
  assert(evaluateRecord({ id: 'CERT-1', sig: realSig }, registry).status === 'verified', 'minimal link must verify against legacy plaintext registry');
  assert(evaluateRecord({ id: 'CERT-1', name: 'Mallory', sig: realSig }, registry).status === 'mismatch', 'presented forged field must still fail against legacy registry');
  state.registry = [{ id: 'CERT-1', name: 'Alice Example', role: 'Speaker', event: 'ICML 2026', date: '18 Sep 2026', organization: 'Society', sig: realSig, filename: 'CERT-1_Alice.pdf' }];
  const pubReg = buildPublicRegistry();
  assert(pubReg.schema === 2 && pubReg.certificates.every(c => Object.keys(c).sort().join(',') === 'id,sig'), 'public registry entries must carry only id and sig');
  assert(!JSON.stringify(pubReg).includes('Alice'), 'public registry must not leak participant names or filenames');

  const verifyHtmlSource = fs.readFileSync(path.join(__dirname, '..', 'verify.html'), 'utf8');
  assert(!/<script(?![^>]*\bsrc=)[^>]*>/.test(verifyHtmlSource), 'verify.html must contain no inline scripts');
  assert(!/onclick=/.test(verifyHtmlSource), 'verify.html must not use inline event handlers');
  assert(/script-src 'self'(?!!)/.test(verifyHtmlSource), 'verify.html CSP must lock scripts to same-origin');
  const indexHtmlSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(/script-src 'self'(?!!)/.test(indexHtmlSource), 'index.html CSP must drop unsafe-inline for scripts');
  assert(/role="status"/.test(indexHtmlSource) && /aria-live="polite"/.test(indexHtmlSource), 'toast must be an aria-live status region');
  ok('15. verification portal trust model + CSP');

  // 15b. ECDSA P-256 signing, schema-3 registry, portal verification, passphrase encryption
  const { hasWebCrypto, generateKeyPair, exportPublicKeyJWK, exportPrivateKeyJWK, importPublicKeyJWK, importPrivateKeyJWK, signPayload, verifySignature, encryptWithPassphrase, decryptWithPassphrase } = cryptoModule;
  assert(hasWebCrypto(), 'WebCrypto must be available in Node 20+');
  const kp = await generateKeyPair();
  const pubJWK = await exportPublicKeyJWK(kp.publicKey);
  const privJWK = await exportPrivateKeyJWK(kp.privateKey);
  assert(pubJWK.kty === 'EC' && pubJWK.crv === 'P-256', 'public key must be ECDSA P-256 JWK');
  assert(privJWK.d, 'private key JWK must include the secret scalar d');
  const privKey = await importPrivateKeyJWK(privJWK);
  const pubKey = await importPublicKeyJWK(pubJWK);
  const testHash = 'a'.repeat(64); // placeholder 64-char hex hash
  const ecdsaSig = await signPayload(privKey, testHash);
  assert(/^[A-Za-z0-9_\-]{60,120}$/.test(ecdsaSig), 'ECDSA signature must be base64url, 60-120 chars');
  assert(await verifySignature(pubKey, testHash, ecdsaSig), 'ECDSA signature must verify');
  assert(!(await verifySignature(pubKey, 'b'.repeat(64), ecdsaSig)), 'ECDSA verification must fail on different payload');
  const otherKeyPair = await generateKeyPair();
  const otherPub = await importPublicKeyJWK(await exportPublicKeyJWK(otherKeyPair.publicKey));
  assert(!(await verifySignature(otherPub, testHash, ecdsaSig)), 'ECDSA verification must fail with wrong public key');
  const testHash2 = 'b'.repeat(64);
  const ecdsaSig2 = await signPayload(privKey, testHash2);
  const ecdsaRecord = { id: 'CERT-ECDSA-1', sig: ecdsaSig, h: testHash };
  const reg3 = normalizeRegistry({
    schema: 3,
    publicKey: pubJWK,
    event: 'ICML 2026',
    certificates: [
      ecdsaRecord,
      { id: 'CERT-ECDSA-2', sig: ecdsaSig2, h: testHash2 }
    ]
  });
  assert(reg3.schema === 3, 'schema 3 must survive normalization');
  assert(reg3.publicKey && reg3.publicKey.kty === 'EC', 'registry must carry the public key');
  assert(reg3.certificates[0].h === testHash, 'schema-3 normalization must preserve the registered payload hash');
  assert((await evaluateEcdsaRecord({ id: 'CERT-ECDSA-1', sig: ecdsaSig, h: testHash }, reg3)).status === 'verified', 'registered ECDSA QR tuple must verify');
  assert((await evaluateEcdsaRecord({ id: 'CERT-ECDSA-2', sig: ecdsaSig, h: testHash }, reg3)).status === 'mismatch', 'valid signature/hash from one certificate must not verify under another registered ID');
  assert((await evaluateEcdsaRecord({ id: 'CERT-ECDSA-NOPE', sig: ecdsaSig, h: testHash }, reg3)).status === 'not-found', 'valid ECDSA material must not verify an unregistered ID');

  const signedCtx = applyVerificationSignature({
    CERTIFICATE_ID: 'CERT-ECDSA-1',
    VERIFY_SIG: 'old-digest',
    VERIFY_H: testHash,
    VERIFY_URL: 'https://example.invalid/old'
  }, ecdsaSig);
  const signedQr = parseRecord(new URL(signedCtx.VERIFY_URL).search);
  assert(signedCtx.VERIFY_SIG === ecdsaSig && signedQr.sig === ecdsaSig, 'QR URL must carry the final ECDSA signature, not the earlier keyed digest');
  assert(signedQr.id === 'CERT-ECDSA-1' && signedQr.h === testHash, 'rebuilt QR URL must retain certificate ID and payload hash');

  const ecdsaCard = { innerHTML: '' };
  renderEcdsaVerified(ecdsaCard, { id: 'CERT-ECDSA-1', h: testHash }, ecdsaRecord, reg3);
  assert(ecdsaCard.innerHTML.includes('ECDSA P-256 Signature Verified'), 'ECDSA verified view must show correct status');
  assert(ecdsaCard.innerHTML.includes('Credential Cryptographically Verified'), 'ECDSA verified view must show title');
  const mismatchCard = { innerHTML: '' };
  renderEcdsaMismatch(mismatchCard, { id: 'CERT-ECDSA-1', h: testHash }, reg3);
  assert(mismatchCard.innerHTML.includes('Signature Verification Failed'), 'ECDSA mismatch view must show failure');
  // Passphrase encryption round-trip
  const secretPayload = { publicKey: pubJWK, privateKey: privJWK };
  const encrypted = await encryptWithPassphrase(secretPayload, 'test-passphrase-123');
  assert(encrypted.v === 1 && encrypted.ct && encrypted.salt && encrypted.iv, 'encrypted output must have v, ct, salt, iv');
  const decrypted = await decryptWithPassphrase(encrypted, 'test-passphrase-123');
  assert(decrypted.privateKey.d === privJWK.d, 'decrypted private key must match original');
  let wrongPassThrew = false;
  try { await decryptWithPassphrase(encrypted, 'wrong-passphrase'); } catch (_) { wrongPassThrew = true; }
  assert(wrongPassThrew, 'wrong passphrase must fail');
  // Schema-3 registry with ECDSA + payload hash in public registry output
  state.registry = [{ id: 'CERT-ECDSA-1', sig: ecdsaSig, h: testHash, name: 'Alice', role: 'Speaker', event: 'ICML 2026', date: '20 Sep 2026', organization: 'Society', filename: 'cert.pdf' }];
  state._signingPublicKey = pubJWK;
  const pubReg3 = buildPublicRegistry();
  assert(pubReg3.schema === 3, 'buildPublicRegistry must emit schema 3 when signing key present');
  assert(pubReg3.publicKey && pubReg3.publicKey.kty === 'EC', 'buildPublicRegistry must include publicKey');
  assert(pubReg3.certificates[0].h === testHash, 'buildPublicRegistry must include payload hash');
  assert(!JSON.stringify(pubReg3).includes('Alice'), 'buildPublicRegistry must not leak names even in schema 3');
  delete state._signingPublicKey;
  ok('15b. ECDSA P-256 signing, schema-3 registry, portal verification');

  // 16. Web Worker batch offloading: init handshake, per-record error isolation, fallback
  assert(typeof isWorkerSupported === 'function', 'isWorkerSupported exported');
  assert(!isWorkerSupported(), 'isWorkerSupported false without Worker');

  let workerRenderCount = 0;
  let readyBeforeRenderHeld = true;
  let failureMode = 'none'; // none | id0 | all

  class MockWorker {
    constructor() { this.ready = false; this.onmessage = null; this.onerror = null; }
    postMessage(msg) {
      setTimeout(() => {
        if (!this.onmessage) return;
        if (msg.type === 'init') { this.ready = true; this.onmessage({ data: { type: 'ready' } }); return; }
        if (msg.type === 'render') {
          if (!this.ready) readyBeforeRenderHeld = false;
          workerRenderCount++;
          if (failureMode === 'all' || (failureMode === 'id0' && msg.id === 0)) {
            this.onmessage({ data: { type: 'error', id: msg.id, error: 'Simulated worker rasterization failure' } });
            return;
          }
          const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
          this.onmessage({ data: { type: 'rendered', id: msg.id, buffer: pngHeader.buffer } });
        }
      }, 2);
    }
    terminate() {}
  }
  global.Worker = MockWorker;
  global.OffscreenCanvas = class { constructor() {} };
  assert(isWorkerSupported(), 'isWorkerSupported true with mocks');

  state.templateId = 'modern';
  state.elements = getTemplate('modern').elements.map(e => ({ ...e }));
  state.rows = [
    { 'Participant Name': 'Alice Example', 'Role': 'Speaker' },
    { 'Participant Name': '', 'Role': 'Delegate' },
    { 'Participant Name': 'Alice Example', 'Role': 'Speaker' }
  ];
  state.columns = ['Participant Name', 'Role'];
  autoMap();
  state.settings.filename = '{{NAME}}.pdf';

  const progBar = { style: { width: '0%' } };
  const progText = { textContent: '' };
  const origGetElementById = global.document.getElementById;
  global.document.getElementById = (id) => {
    if (id === 'progressBar') return progBar;
    if (id === 'progressText') return progText;
    return origGetElementById ? origGetElementById(id) : null;
  };

  const workerResult = await generateAll();
  assert(workerRenderCount === 2, `Worker pool should render 2 certificates, got ${workerRenderCount}`);
  assert(readyBeforeRenderHeld, 'No render may be dispatched before the worker reports fonts ready');
  assert(workerResult.files.length === 2 && workerResult.skipped === 1, 'worker generation counts');
  assert(workerResult.files[1].name === 'Alice Example_2.pdf', 'worker dedupe');
  assert(progBar.style.width === '100%' && progText.textContent.includes('Generated 2 of 2 (100%)'), 'progress to 100%');

  workerRenderCount = 0; failureMode = 'id0';
  const partialFailure = await generateAll();
  assert(partialFailure.files.length === 2, 'per-record worker failure must not abort the batch');
  assert(partialFailure.registry[0].sig && partialFailure.registry[1].sig, 'registry complete after retry');

  failureMode = 'all';
  const allFail = await generateAll();
  assert(allFail.files.length === 2 && allFail.files[1].name === 'Alice Example_2.pdf', 'all-worker failure completes on main thread');
  failureMode = 'none';

  global.document.getElementById = origGetElementById;
  delete global.Worker;
  delete global.OffscreenCanvas;
  assert(!isWorkerSupported(), 'workers off after cleanup');
  ok('16. worker pool (handshake, error isolation, fallback)');

  // 17. UI module exports (monolithic ui.js re-exporting progress)
  assert(typeof ui.go === 'function' && typeof ui.renderStep === 'function', 'router exports');
  assert(typeof ui.historyAction === 'function', 'historyAction export (undo repaint path)');
  const { updateGenerationProgress } = await import('../js/progress.js');
  assert(ui.updateGenerationProgress === updateGenerationProgress, 'progress re-export identity');
  ok('17. UI module exports');

  // 18. SheetJS-absent error guidance + spreadsheet size cap
  let excelFallbackErrorTriggered = false;
  try {
    delete global.XLSX;
    if (global.window) delete global.window.XLSX;
    await parseSpreadsheet({ name: 'delegates.xlsx', arrayBuffer: async () => new ArrayBuffer(16) });
  } catch (err) {
    excelFallbackErrorTriggered = true;
    assert(err.message.includes('save the file as CSV and try again'), 'must guide to CSV fallback');
    assert(!/internet connection/i.test(err.message), 'must not blame the internet (parser is local)');
  }
  assert(excelFallbackErrorTriggered, 'parseSpreadsheet must throw without SheetJS');
  let tooBig = false;
  try { await parseSpreadsheet({ name: 'huge.csv', size: 500 * 1024 * 1024, text: async () => 'A\n1\n' }); }
  catch (err) { tooBig = /too large/i.test(err.message); }
  assert(tooBig, 'oversized spreadsheets must be rejected');
  const sampleCSVFile = {
    name: 'attendees.csv', size: 100,
    text: async () => '"Participant Name","Role","Affiliation"\n"Dr. Jane Smith","Keynote Speaker","AI Institute"\n"Dr. John Doe","Panelist","Medical Council"\n'
  };
  await parseSpreadsheet(sampleCSVFile);
  assert(state.rows.length === 2 && state.rows[0]['Participant Name'] === 'Dr. Jane Smith', 'CSV intake via parseSpreadsheet');
  ok('18. spreadsheet intake (guidance, caps, CSV path)');

  // 19. Service worker: version, assets on disk, privacy + fallback guards
  const swCode = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const packageMeta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const expectedCache = `certiforge-v${packageMeta.version}`;
  assert(swCode.includes(`const CACHE = '${expectedCache}';`), `sw.js cache version must match package version (${expectedCache})`);
  const assetsMatch = swCode.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert(assetsMatch, 'ASSETS list declared');
  const swAssets = (0, eval)('[' + assetsMatch[1] + ']');
  ['./js/ui.js', './js/pdf-worker.js', './js/verify.js', './js/security.js', './js/progress.js', './css/verify.css', './icons/icon.svg', './icons/icon-maskable.svg'].forEach(a =>
    assert(swAssets.includes(a), `sw.js ASSETS must include ${a}`));
  for (const asset of swAssets) {
    if (asset === './') continue;
    assert(fs.existsSync(path.join(__dirname, '..', asset.replace(/^\.\//, ''))), `Service worker asset missing on disk: ${asset}`);
  }
  assert(/url\.search/.test(swCode) && /cacheable/.test(swCode), 'sw must refuse caching of query-string URLs (PII guard)');
  assert(/mode === 'navigate'/.test(swCode), 'sw offline shell fallback must apply to navigations only');
  assert(/allSettled/.test(swCode), 'sw install must be resilient to individual asset failures');
  ok('19. service worker policy');

  // 20. Zero-telemetry supply-chain check on vendored SheetJS
  const xlsxCode = fs.readFileSync(path.join(__dirname, '..', 'vendor/xlsx.full.min.js'), 'utf8');
  assert(!xlsxCode.includes('fetch(') && !xlsxCode.includes('XMLHttpRequest'), 'vendor/xlsx.full.min.js must contain no outbound network requests');
  ok('20. vendor telemetry check');

  // 21. Editorial design system integration
  const atelierCss = fs.readFileSync(path.join(__dirname, '..', 'css/atelier.css'), 'utf8');
  const themeSource = fs.readFileSync(path.join(__dirname, '..', 'js/theme.js'), 'utf8');
  const generatorSource = fs.readFileSync(path.join(__dirname, '..', 'js/generator.js'), 'utf8');
  assert(indexHtmlSource.includes('css/atelier.css'), 'index.html must load the editorial design system');
  assert(atelierCss.includes('.cert-canvas::before') && atelierCss.includes('content:none!important'), 'editor chrome must not force decorative overlays onto every certificate');
  assert(themeSource.includes("storedTheme() || 'light'"), 'light theme must be the default when no preference is stored');
  assert(generatorSource.includes('applyVerificationSignature(ctx, sig)'), 'generator must rebuild the QR URL after the final ECDSA signature is produced');
  assert(!generatorSource.includes('VERIFY_URL: ctx.VERIFY_URL'), 'generator must not retain the pre-ECDSA QR URL');
  const modernTemplate = getTemplate('modern');
  assert(modernTemplate.background === '#f6f0e1', 'flagship modern template must use the ivory paper palette');
  assert(modernTemplate.elements.some(e => e.id === 'seal' && e.type === 'image'), 'flagship modern template must include its template-owned seal');
  templates.forEach(t => {
    assert(t.elements.some(e => e.type === 'qr'), `Template ${t.id} must retain QR verification`);
    assert(t.elements.some(e => /certificate-id|^id$/.test(e.id || '')), `Template ${t.id} must retain a certificate identifier layer`);
  });
  ok('21. editorial design system integration');

  console.log(`\nCertiForge logic tests: PASS (${passed} sections)`);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
