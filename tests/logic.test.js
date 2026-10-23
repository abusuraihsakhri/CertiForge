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
  const { state, defaultState, randomVerifySecret, markDirty, mutationCount } = await import('../js/state.js');
  const { getTemplate, templates } = await import('../js/templates.js');
  const { autoMap, mappedRows } = await import('../js/mapping.js');
  const { parseCSV, parseSpreadsheet } = await import('../js/spreadsheet.js');
  const { validateRows, validateProject } = await import('../js/validator.js');
  const { renderCertificateSVG, renderStaticLayerSVG, renderDynamicLayerSVG, buildSvgSkeleton, clearSvgCache, wrapToLines } = await import('../js/pdf.js');
  const { generateAll, isWorkerSupported, generationRows, isGenerating, cancelGeneration, buildPublicRegistry } = await import('../js/generator.js');
  const cryptoModule = await import('../js/crypto.js');
  const { loadProjectFile, applySanitizedState, SAFE_FONT_DATA_URL, projectData } = await import('../js/project.js');
  const { pushHistory, resetHistory, undo, redo } = await import('../js/history.js');
  const { sanitizeProjectState, detectFontFormat, normalizeFontDataUrl } = await import('../js/security.js');
  const { LEGACY_VERIFY_SALT, verifyBaseUrl, fileVerifyFallback } = await import('../js/config.js');
  const { qrVendorAvailable } = await import('../js/qrcode.js');
  const ui = await import('../js/ui.js');
  const { parseRecord, normalizeRegistry, evaluateRecord, evaluateEcdsaRecord, verificationGate, renderCryptoLimited, renderRevoked, renderUnconfirmed, renderVerified, renderEcdsaVerified, renderEcdsaMismatch } = await import('../js/verify.js');
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

  // 2b. verification base URL resolution: config override, same-origin, file:// fallback
  assert(getVerificationBaseUrl({ origin: 'null', pathname: '/C:/Users/x/index.html' }) === fileVerifyFallback, 'file:// (null origin) must fall back to the deployment fallback URL');
  assert(getVerificationBaseUrl({ origin: 'https://e.x', pathname: '/a/b/index.html' }) === 'https://e.x/a/b/verify.html', 'http(s) origin must build directory-relative URL');
  assert(getVerificationBaseUrl({ origin: 'https://e.x', pathname: '/a/b/index.html' }, 'https://verify.example.com/v/verify.html') === 'https://verify.example.com/v/verify.html', 'a configured absolute base URL must be authoritative on every origin');
  assert(getVerificationBaseUrl({ origin: 'https://e.x', pathname: '/a/b/index.html' }, 'not a url') === 'https://e.x/a/b/verify.html', 'invalid config must fall back to origin resolution');
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
  assert(templates.length === 113, `Expected 13 curated + 100 presets, found ${templates.length}`);
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

  // 13. History: shallow-share snapshots, independence from live mutation,
  //     mappings/globalFields/certificate coverage, selection preservation
  state.templateId = 'modern';
  resetHistory();
  state.elements = [
    { id: 'el_qr', type: 'qr', text: '{{VERIFY_URL}}', _qrDataUrl: 'data:image/png;base64,largeqrcode', x: 10, y: 10, w: 80 },
    { id: 'el_shape', type: 'shape', shape: 'rect', _svg: '<rect width="20" height="20"/>', x: 20, y: 20, w: 50, h: 50 },
    { id: 'el_text', type: 'text', text: 'Certificate of Excellence', size: 20, x: 100, y: 100 }
  ];
  state.mappings = { NAME: 'Name Col' };
  state.globalFields.EVENT = 'History Event';
  state.certificate.prefix = 'HIST';
  state.selectedElement = 'el_text';
  pushHistory();
  const snap = state.history.stack[state.history.index];
  assert(snap.elements.length === 3, 'snapshot element length');
  assert(!('_qrDataUrl' in snap.elements[0]) && !('_svg' in snap.elements[1]), 'transient fields stripped');
  assert(state.elements[0]._qrDataUrl === 'data:image/png;base64,largeqrcode', 'live element keeps transient fields');
  state.elements[2].text = 'MUTATED';
  assert(snap.elements[2].text === 'Certificate of Excellence', 'snapshot must be independent of live mutations');
  state.elements[2].text = 'Certificate of Excellence';
  // A second edit (mapping + prefix + selection cleared), then undo/redo across it.
  state.mappings.NAME = 'Changed Col';
  state.certificate.prefix = 'CHNG';
  state.selectedElement = null;
  pushHistory();
  assert(undo(), 'undo returns true');
  assert(state.mappings.NAME === 'Name Col', 'undo must restore column mappings');
  assert(state.certificate.prefix === 'HIST', 'undo must restore certificate settings');
  assert(state.selectedElement === 'el_text', 'undo must preserve a surviving selection');
  assert(redo(), 'redo returns true');
  assert(state.mappings.NAME === 'Changed Col', 'redo must re-apply the mapping change');
  assert(state.certificate.prefix === 'CHNG', 'redo must re-apply certificate settings');
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
  // Font/CSP consistency: the shared stylesheet must not @import cross-origin
  // fonts, because verify.html loads it under a CSP with no third-party origins.
  assert(!verifyHtmlSource.includes('fonts.googleapis'), 'verify portal must not depend on third-party font origins');
  const mainCss = fs.readFileSync(path.join(__dirname, '..', 'css/main.css'), 'utf8');
  assert(!/@import/.test(mainCss), 'css/main.css must not @import cross-origin fonts (verify.html loads it under a stricter CSP)');
  assert(/fonts\.googleapis\.com\/css2/.test(indexHtmlSource), 'index.html must load the web font via a link tag matching its CSP origins');
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
  state._signingKeyProjectName = state.projectName;
  const pubReg3 = buildPublicRegistry();
  assert(pubReg3.schema === 3, 'buildPublicRegistry must emit schema 3 when signing key present');
  assert(pubReg3.publicKey && pubReg3.publicKey.kty === 'EC', 'buildPublicRegistry must include publicKey');
  assert(pubReg3.certificates[0].h === testHash, 'buildPublicRegistry must include payload hash');
  assert(!JSON.stringify(pubReg3).includes('Alice'), 'buildPublicRegistry must not leak names even in schema 3');
  delete state._signingPublicKey;
  delete state._signingKeyProjectName;
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
  // Reverse check: every shipped module must be precached — a module present on
  // disk but absent from ASSETS breaks offline only after first online use.
  const jsModules = fs.readdirSync(path.join(__dirname, '..', 'js')).filter(f => f.endsWith('.js'));
  jsModules.forEach(f => assert(swAssets.includes(`./js/${f}`), `sw.js ASSETS must precache js/${f}`));
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

  // 22. Batch hardening: strict QR, legacy-salt block, key binding, signing isolation, delimiters
  // (a) A failed QR must never reach final output — placeholder is preview-only.
  const savedQr = global.qrcode;
  global.qrcode = undefined;
  state.templateId = 'modern';
  state.elements = [
    { id: 't1', type: 'text', text: 'Hello', x: 50, y: 50, size: 10 },
    { id: 'qr_x', type: 'qr', text: '{{VERIFY_URL}}', x: 100, y: 100, w: 80 }
  ];
  assert(qrVendorAvailable() === false, 'qrVendorAvailable must report the vendor library as unavailable');
  const previewSvg = renderCertificateSVG({ NAME: 'P' }, 0);
  assert(previewSvg.includes('image/svg+xml'), 'preview may keep the placeholder QR');
  let strictThrew = false;
  try { renderCertificateSVG({ NAME: 'P' }, 0, undefined, { strict: true }); }
  catch (e) { strictThrew = /QR verification code/.test(e.message); }
  assert(strictThrew, 'strict render must throw instead of shipping a placeholder QR');
  global.qrcode = savedQr;
  assert(qrVendorAvailable() === true, 'qrVendorAvailable must recover when the vendor library is present');

  // (b) The publicly known legacy default secret blocks generation + validation.
  state.elements = getTemplate('modern').elements.map(e => ({ ...e }));
  state.rows = [{ 'Participant Name': 'A' }, { 'Participant Name': 'B' }];
  state.columns = ['Participant Name'];
  autoMap();
  state.settings.verifySecret = LEGACY_VERIFY_SALT;
  assert(validateProject().valid === false, 'legacy default secret must fail validation');
  let legacyThrew = false;
  try { await generateAll(); } catch (e) { legacyThrew = /legacy default/i.test(e.message); }
  assert(legacyThrew, 'generateAll must refuse the legacy default signing secret');
  state.settings.verifySecret = 'a-random-test-secret';

  // (c) A signing key from another project must never anchor this registry.
  const kpX = await cryptoModule.generateKeyPair();
  const pubX = await cryptoModule.exportPublicKeyJWK(kpX.publicKey);
  state.registry = [{ id: 'K-1', sig: 'x', h: 'a'.repeat(64) }];
  state.projectName = 'Project Now';
  state._signingPublicKey = pubX;
  state._signingKeyProjectName = 'Project Before';
  assert(buildPublicRegistry().schema === 2, "another project's key must not anchor this registry");
  state._signingKeyProjectName = 'Project Now';
  state._signingKeyId = 'f'.repeat(16);
  assert(buildPublicRegistry().schema === 4, 'the current project key must anchor the registry');
  await applySanitizedState(sanitizeProjectState({ elements: [], templateId: 'modern' }, defaultState()));
  assert(!state._signingPublicKey && !state._signingKeyProjectName, 'project switch must clear cached signing keys');
  delete state._signingPublicKey;
  delete state._signingKeyProjectName;

  // (d) One signing failure skips only that record — the batch still completes.
  state.templateId = 'modern';
  state.elements = getTemplate('modern').elements.map(e => ({ ...e }));
  state.rows = [{ 'Participant Name': 'S One' }, { 'Participant Name': 'S Two' }];
  state.columns = ['Participant Name'];
  autoMap();
  state.settings.filename = '{{NAME}}.pdf';
  const realSign = globalThis.crypto.subtle.sign.bind(globalThis.crypto.subtle);
  let signCalls = 0;
  globalThis.crypto.subtle.sign = async (...a) => { if (++signCalls === 1) throw new Error('simulated signer failure'); return realSign(...a); };
  let signIso;
  try { signIso = await generateAll(); } finally { globalThis.crypto.subtle.sign = realSign; }
  assert(signIso.files.length === 1 && signIso.signFailures === 1, 'one signing failure must skip only that record');
  assert(signIso.registry.length === 1, 'registry must cover exactly the successfully signed records');

  // (e) Worker font failures must surface instead of failing silently.
  class FontFailWorker {
    constructor() { this.onmessage = null; this.onerror = null; }
    postMessage(msg) {
      setTimeout(() => {
        if (!this.onmessage) return;
        if (msg.type === 'init') { this.onmessage({ data: { type: 'ready', failedFonts: ['TestFont'] } }); return; }
        if (msg.type === 'render') {
          const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
          this.onmessage({ data: { type: 'rendered', id: msg.id, buffer: pngHeader.buffer } });
        }
      }, 1);
    }
    terminate() {}
  }
  global.Worker = FontFailWorker;
  global.OffscreenCanvas = class { constructor() {} };
  const fontFailResult = await generateAll();
  assert(fontFailResult.files.length === 2, 'font-failure batch still completes');
  assert(fontFailResult.fontWarnings.includes('TestFont'), 'worker font failures must surface to the caller');
  delete global.Worker;
  delete global.OffscreenCanvas;

  // (f) Delimiter detection: quoted tabs survive; semicolon files parse.
  await parseSpreadsheet({ name: 'data.tsv', size: 100, text: async () => 'Name\tNote\n"A\tB"\tSpeaker\n' });
  assert(state.rows[0].Name === 'A\tB' && state.rows[0].Note === 'Speaker', 'a quoted tab inside a TSV field must survive');
  await parseSpreadsheet({ name: 'data.csv', size: 100, text: async () => 'Name;Note\nDoe;Speaker\n' });
  assert(state.rows[0].Name === 'Doe' && state.rows[0].Note === 'Speaker', 'semicolon-delimited files must parse');
  ok('22. batch hardening (strict QR, legacy salt, key binding, signing isolation, delimiters)');

  // 23. Portal crypto gate: "verified" is never claimed without cryptography
  const reg3Gate = normalizeRegistry({ schema: 3, publicKey: pubJWK, event: 'E', certificates: [{ id: 'G-1', sig: ecdsaSig, h: testHash }] });
  assert(verificationGate({ id: 'G-1', sig: ecdsaSig, h: testHash }, reg3Gate) === 'ecdsa', 'schema-3 + hash + crypto must take the ECDSA path');
  assert(verificationGate({ id: 'G-1', sig: ecdsaSig }, reg3Gate) === 'hmac', 'no hash in the QR must stay on the pair-match path');
  assert(verificationGate({ id: 'G-1', sig: ecdsaSig, h: testHash }, { schema: 2, certificates: [] }) === 'hmac', 'schema-2 registry must stay on pair-match');
  assert(verificationGate({ id: 'G-1', sig: ecdsaSig, h: testHash }, reg3Gate, false) === 'crypto-unavailable', 'without WebCrypto the ECDSA path must be blocked, not downgraded');
  const gateCard = { innerHTML: '' };
  renderCryptoLimited(gateCard, { id: 'G-1', sig: ecdsaSig, h: testHash }, reg3Gate);
  assert(gateCard.innerHTML.includes('Verification Limited'), 'crypto-limited card must render');
  assert(!gateCard.innerHTML.includes('Credential Cryptographically Verified') && !gateCard.innerHTML.includes('Credential Verified'), 'crypto-limited card must never claim verification');
  ok('23. portal crypto gate');

  // 24. Layered batch rendering: static artwork split from per-record content
  state.templateId = 'modern';
  state.elements = getTemplate('modern').elements.map(e => ({ ...e }));
  clearSvgCache();
  const modernHasArtwork = state.elements.some(e => e.type === 'image');
  assert(modernHasArtwork, 'modern template must own image artwork for this test');
  const staticLayer = renderStaticLayerSVG('modern');
  assert(staticLayer.includes('<image'), 'static layer must carry the template artwork');
  assert(staticLayer.includes('width="100%"'), 'static layer must paint the page background');
  const dynLayerRow = { NAME: 'Layer Alice', ROLE: 'Delegate' };
  const dynLayerCtx = verificationContext(dynLayerRow, 0);
  const dynLayer = renderDynamicLayerSVG(dynLayerRow, 0, dynLayerCtx, { strict: true });
  const dynImages = (dynLayer.match(/<image/g) || []).length;
  const dynQrs = state.elements.filter(e => e.type === 'qr').length;
  assert(dynImages === dynQrs, `dynamic layer must embed only QR images (${dynImages} images vs ${dynQrs} qr elements)`);
  assert(!dynLayer.includes('width="100%" height="100%"'), 'dynamic layer must NOT paint the page background (it would cover the static layer)');
  assert(dynLayer.includes('Layer Alice'), 'dynamic layer must carry the record text');
  assert(dynLayer.includes('href="data:image/'), 'dynamic QR must embed its data URL');
  const composed = renderCertificateSVG(dynLayerRow, 0, dynLayerCtx, { strict: true });
  assert(composed.indexOf('<image') < composed.indexOf('Layer Alice') || composed.includes('Layer Alice'), 'single-document render still composes static + dynamic');
  assert(renderStaticLayerSVG('modern') === staticLayer, 'static layer must be deterministic within a revision');

  // Mutation counter drives autosave's safe dirty-flag clearing
  const countBefore = mutationCount();
  markDirty();
  assert(mutationCount() === countBefore + 1, 'markDirty must advance the mutation counter');
  ok('24. layered batch rendering + mutation counter');

  // 25. Features: key fingerprints, schema-4 registry, revocation, alignment geometry
  // (a) Key fingerprint stability and uniqueness
  const fp1 = await cryptoModule.keyIdFromJwk(pubJWK);
  assert(/^[a-f0-9]{16}$/.test(fp1), 'keyId must be 16 hex chars');
  assert(fp1 === await cryptoModule.keyIdFromJwk(pubJWK), 'keyId must be deterministic');
  const otherFp = await cryptoModule.keyIdFromJwk(await cryptoModule.exportPublicKeyJWK(otherKeyPair.publicKey));
  assert(fp1 !== otherFp, 'different keys must produce different fingerprints');

  // (b) Schema-4 registry: keys map, keyId metadata, revocation entries
  state.registry = [
    { id: 'CERT-ECDSA-1', sig: ecdsaSig, h: testHash },
    { id: 'CERT-REV', sig: 'aabbccdd11223344', revoked: true, revokedAt: '2026-10-22T00:00:00Z' }
  ];
  state._signingPublicKey = pubJWK;
  state._signingKeyProjectName = state.projectName;
  state._signingKeyId = fp1;
  const reg4 = buildPublicRegistry();
  assert(reg4.schema === 4, 'stamped keyId must promote the registry to schema 4');
  assert(reg4.keys && reg4.keys[fp1] && reg4.keys[fp1].kty === 'EC', 'keys map must be keyed by fingerprint');
  assert(reg4.signature.keyId === fp1, 'signature metadata must carry the keyId');
  assert(reg4.certificates[1].revoked === true && reg4.certificates[1].revokedAt === '2026-10-22T00:00:00Z', 'revocation must be exported');
  assert(reg4.certificates[0].revoked === undefined, 'unrevoked entries must carry no revocation fields');
  assert(!JSON.stringify(reg4).includes('Alice'), 'schema-4 registry must not leak participant names');
  state.registry = [{ id: 'CERT-ECDSA-1', sig: ecdsaSig, h: testHash }];

  // (c) Rotated keys stay verifiable via the keys map
  state._rotatedKeys = [{ keyId: otherFp, jwk: await cryptoModule.exportPublicKeyJWK(otherKeyPair.publicKey) }];
  const regRot = buildPublicRegistry();
  assert(Object.keys(regRot.keys).length === 2 && regRot.keys[otherFp], 'rotated keys must remain in the keys map');
  state._rotatedKeys = [];

  // (d) Portal: schema-4 normalization + cryptographic verification
  const reg4n = normalizeRegistry(reg4);
  assert(reg4n.schema === 4 && reg4n.keys && reg4n.keys[fp1], 'schema-4 normalization must keep the keys map');
  assert((await evaluateEcdsaRecord({ id: 'CERT-ECDSA-1', sig: ecdsaSig, h: testHash }, reg4n)).status === 'verified', 'schema-4 registry must verify cryptographically');
  assert(verificationGate({ id: 'CERT-ECDSA-1', sig: ecdsaSig, h: testHash }, reg4n) === 'ecdsa', 'gate must take the ECDSA path for schema 4');

  // (e) Revocation wins on both portal paths
  const badReg = normalizeRegistry({ schema: 4, publicKey: pubJWK, keys: { [fp1]: pubJWK }, certificates: [{ id: 'REV-1', sig: ecdsaSig, h: testHash, revoked: true, revokedAt: '2026-10-01T00:00:00Z' }] });
  const revokedEcdsa = await evaluateEcdsaRecord({ id: 'REV-1', sig: ecdsaSig, h: testHash }, badReg);
  assert(revokedEcdsa.status === 'revoked', 'a revoked entry must return revoked even with valid signature material');
  const hmacReg = normalizeRegistry({ schema: 2, certificates: [{ id: 'H-1', sig: computeVerificationSignature(sampleCert, secret), revoked: true }] });
  const hmacRevoked = evaluateRecord({ id: 'H-1', sig: computeVerificationSignature(sampleCert, secret) }, hmacReg);
  assert(hmacRevoked.status === 'revoked', 'revocation must apply to the pair-match path too');
  const revCard = { innerHTML: '' };
  renderRevoked(revCard, { id: 'REV-1' }, badReg.certificates[0], badReg);
  assert(revCard.innerHTML.includes('Has Been Revoked'), 'REVOKED card must render');
  assert(revCard.innerHTML.includes('2026-10-01T00:00:00Z'), 'REVOKED card must show the revocation date');
  assert(!revCard.innerHTML.includes('Credential Cryptographically Verified') && !revCard.innerHTML.includes('Credential Verified'), 'REVOKED card must never claim verification');

  // (f) Alignment geometry: anchor conventions, distribute spacing
  const { computeAlign, elementBounds } = await import('../js/align.js');
  const rectA = { id: 'a', type: 'shape', shape: 'rect', x: 0, y: 0, w: 100, h: 50 };
  const rectB = { id: 'b', type: 'shape', shape: 'rect', x: 400, y: 300, w: 100, h: 50 };
  const txtA = { id: 't', type: 'text', x: 300, y: 200, w: 100, size: 20 };
  assert(elementBounds(rectA).left === 0 && elementBounds(txtA).left === 250, 'bounds must reflect corner- vs center-anchored elements');
  let patches = computeAlign([rectA, rectB], 'left');
  assert(patches.find(p => p.id === 'b').x === 0, 'align left must move rightmost box to the shared left edge');
  patches = computeAlign([rectA, txtA], 'left');
  assert(patches.find(p => p.id === 't').x === 50, 'center-anchored text must land its left edge at the shared edge (x = 50)');
  patches = computeAlign([rectA, rectB, txtA], 'right');
  assert(patches.find(p => p.id === 'a').x === 400, 'align right must use the max right edge (500) minus width');
  patches = computeAlign([rectA, rectB], 'vcenter');
  assert(patches.find(p => p.id === 'b').y === 150, 'vertical center must use the shared midline');
  const three = [
    { id: 'd1', type: 'shape', shape: 'rect', x: 0, y: 0, w: 100, h: 40 },
    { id: 'd2', type: 'shape', shape: 'rect', x: 150, y: 60, w: 100, h: 40 },
    { id: 'd3', type: 'shape', shape: 'rect', x: 600, y: 120, w: 100, h: 40 }
  ];
  patches = computeAlign(three, 'dist-h');
  assert(patches.find(p => p.id === 'd2').x === 300, 'horizontal distribution must space inner boxes evenly (left edge 300)');
  assert(patches.find(p => p.id === 'd1').x === 0 && patches.find(p => p.id === 'd3').x === 600, 'outermost boxes must stay put on distribution');
  assert(computeAlign([rectA], 'left').length === 0, 'alignment requires at least two elements');
  assert(computeAlign([rectA, rectB], 'unknown-mode').length === 0, 'unknown modes must be a no-op');
  ok('25. features (key fingerprints, schema 4, revocation, alignment)');

  // 26. Studio 2.0 engines: auto-fit, title-case sanitizer, folder-token
  //     filenames, master-PDF export hook, new element schema bits.
  const { fitFontSize } = await import('../js/autofit.js');
  // No measuring canvas in the test harness → the fixed-width estimate fallback:
  // width ≈ chars × size × 0.52.
  const fitsSized = fitFontSize({ text: 'x'.repeat(10), font: 'Arial', weight: 400, size: 44, fitMin: 14, maxWidth: 240 });
  assert(fitsSized.fontSize === 44 && fitsSized.shrunk === false && fitsSized.overflowed === false, 'fitFontSize keeps the target size when it fits');
  const shrunkFit = fitFontSize({ text: 'x'.repeat(100), font: 'Arial', weight: 400, size: 44, fitMin: 14, maxWidth: 300 });
  assert(shrunkFit.shrunk === true, 'fitFontSize must shrink long text below the target size');
  assert(shrunkFit.fontSize >= 14, 'fitFontSize must never go below the floor');
  const floorFit = fitFontSize({ text: 'x'.repeat(200), font: 'Arial', weight: 400, size: 44, fitMin: 14, maxWidth: 300 });
  assert(floorFit.fontSize === 14 && floorFit.overflowed === true, 'unfittable text must clamp to the floor and flag overflow');
  const trivialFit = fitFontSize({ text: '', font: 'Arial', size: 44, fitMin: 14, maxWidth: 300 });
  assert(trivialFit.overflowed === false, 'empty text never overflows');
  ok('26a. auto-fit engine (binary search + telemetry flags)');

  const { toAcademicTitleCase } = await import('../js/utils.js');
  assert(toAcademicTitleCase('dr. aarav sharma, md') === 'Dr. Aarav Sharma, MD', 'title case keeps MD post-nominals uppercase');
  assert(toAcademicTitleCase('prof. venkatasubramanian balasubramanium, FRCS') === 'Prof. Venkatasubramanian Balasubramanium, FRCS', 'FRCS preserved');
  assert(toAcademicTitleCase('dr. alexandria catherine montgomery-walsingham, PhD') === 'Dr. Alexandria Catherine Montgomery-Walsingham, PhD', 'hyphenated surname + PhD');
  assert(toAcademicTitleCase('  rajeshwari   iyer  ') === 'Rajeshwari Iyer', 'title case collapses messy whitespace');
  assert(toAcademicTitleCase('charles the iii') === 'Charles The III', 'roman numerals preserved (III)');
  assert(toAcademicTitleCase('') === '', 'empty input stays empty');
  ok('26b. academic title-case sanitizer');

  // Folder-token filenames: nested ZIP paths are safe and surfaces remove
  // traversal patterns; the default flat pattern is unchanged.
  const { buildMasterPdf } = await import('../js/generator.js');
  assert(typeof buildMasterPdf === 'function', 'master-PDF builder must be exported');
  state.templateId = 'modern';
  state.elements = getTemplate('modern').elements.map(e => ({ ...e }));
  state.globalFields = Object.assign({}, state.globalFields, {
    EVENT: 'Folder Test Conference', DATE: '2026-01-01', ORGANIZATION: 'Test Org'
  });
  state.rows = [
    { 'Full Name': 'Folder Alice', Role: 'Keynote Speaker' },
    { 'Full Name': 'Folder Bob', Role: 'Delegate' },
    { 'Full Name': 'Folder Cathy', Role: 'Panelist & Chair?' }
  ];
  state.columns = ['Full Name', 'Role'];
  autoMap();
  state.settings.verifySecret = 'folder-test-secret';
  state.settings.filename = '{{ROLE}}/{{CERTIFICATE_ID}}_{{NAME}}.pdf';
  const folderResult = await generateAll();
  assert(folderResult.files.length === 3, 'folder-pattern batch still yields one PDF per record');
  const folderNames = folderResult.files.map(f => f.name);
  assert(folderNames.every(n => /(Keynote Speaker|Delegate|Panelist)/.test(n)), `roles became ZIP folders (${JSON.stringify(folderNames)})`);
  assert(!folderNames.some(n => n.includes('..') || n.startsWith('/') || n.endsWith('/')), 'no traversal or empty folder segments');
  assert(folderNames.some(n => /Panelist/.test(n) && n.includes('<>_') === false), 'unsafe filename chars are sanitized inside folders');
  state.settings.filename = '{{CERTIFICATE_ID}}_{{NAME}}.pdf';

  // Schema roundtrip: autoFit/fitMin survive sanitizeProjectState; mergedPdf persists.
  state.elements = [
    getTemplate('modern').elements[0],
    { id: 'fit_el', type: 'text', text: 'Hello', x: 50, y: 50, w: 300, size: 40, autoFit: true, fitMin: 18, shoeSize: '999-big-and-evil' }
  ];
  const roundtrip = sanitizeProjectState(JSON.parse(JSON.stringify(projectData())), defaultState());
  const fitEl = roundtrip.elements.find(e => e.id === 'fit_el');
  assert(fitEl && fitEl.autoFit === true && fitEl.fitMin === 18, 'autoFit + fitMin must survive the sanitizer');
  assert(!('shoeSize' in fitEl), 'unknown element keys must be dropped by the sanitizer');
  assert(roundtrip.settings.mergedPdf === false, 'settings sanitize maps mergedPdf (boolean, default false)');
  ok('26. studio 2.0 engines (fit, sanitizer, folder tokens, schema)');

  // 27. Procedural preset library: 100 zero-asset presets (10 archetypes × 10 palettes)
  const { PRESET_TEMPLATES, PRESET_CATEGORIES, buildPresetTemplate, buildPresetTemplates } = await import('../js/preset-templates.js');
  const DOC_CATEGORIES = ['Academic', 'Medical', 'Tech', 'Corporate', 'Luxury', 'Bauhaus', 'Creative', 'Eco', 'Heritage', 'Competition'];
  const ALLOWED_PRESET_FONTS = ['Cinzel', 'Playfair Display', 'Cormorant Garamond', 'JetBrains Mono', 'Arial'];
  const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
  // Fonts may be declared bare ("Cinzel") or with a CSS fallback ("'Cinzel', serif").
  const fontFamily = value => String(value == null ? '' : value).split(',')[0].replace(/["']/g, '').trim();
  // "none"/"transparent" are paint sentinels, not colours.
  const isPaint = value => value != null && value !== '' && value !== 'none' && value !== 'transparent';

  assert(PRESET_TEMPLATES.length === 100, `Expected 100 preset definitions, found ${PRESET_TEMPLATES.length}`);
  const presetIds = PRESET_TEMPLATES.map(d => d.id);
  assert(new Set(presetIds).size === 100, 'preset ids must be unique');
  presetIds.forEach(id => assert(/^tpl-\d{3}$/.test(id), `preset id must match tpl-NNN: ${id}`));
  assert(
    presetIds.every((id, i) => id === 'tpl-' + String(i + 1).padStart(3, '0')),
    'preset ids must run tpl-001 … tpl-100 in declaration order'
  );

  assert(PRESET_CATEGORIES.length === 10, `Expected 10 preset categories, found ${PRESET_CATEGORIES.length}`);
  assert(
    PRESET_CATEGORIES.join(',') === DOC_CATEGORIES.join(','),
    `Preset categories must be ${DOC_CATEGORIES.join(', ')} — got ${PRESET_CATEGORIES.join(', ')}`
  );
  PRESET_CATEGORIES.forEach(cat => {
    const inCategory = PRESET_TEMPLATES.filter(d => d.category === cat);
    assert(inCategory.length === 10, `Category ${cat} must own exactly 10 presets, found ${inCategory.length}`);
  });

  PRESET_TEMPLATES.forEach(d => {
    assert(PRESET_CATEGORIES.includes(d.category), `Preset ${d.id} must use a declared category (${d.category})`);
    ['name', 'headerText', 'subText'].forEach(key => {
      assert(typeof d[key] === 'string' && d[key].trim() !== '', `Preset ${d.id} must have a non-empty ${key}`);
    });
    ['bg', 'primary', 'secondary', 'accent'].forEach(key => {
      assert(HEX_COLOR.test(String(d[key])), `Preset ${d.id} ${key} must be a hex colour (${d[key]})`);
    });
    assert(typeof d.nameY === 'number' && Number.isFinite(d.nameY), `Preset ${d.id} nameY must be numeric`);
    assert(typeof d.maxWidth === 'number' && Number.isFinite(d.maxWidth) && d.maxWidth > 0, `Preset ${d.id} maxWidth must be a positive number`);
    ['titleFont', 'bodyFont'].forEach(key => {
      assert(
        ALLOWED_PRESET_FONTS.includes(fontFamily(d[key])),
        `Preset ${d.id} ${key} must be one of ${ALLOWED_PRESET_FONTS.join(' / ')} (${d[key]})`
      );
    });
  });

  const builtPresets = buildPresetTemplates();
  assert(Array.isArray(builtPresets) && builtPresets.length === 100, `buildPresetTemplates() must return 100 templates, got ${builtPresets && builtPresets.length}`);
  builtPresets.forEach(t => {
    const page = t.page || {};
    const pageW = page.width != null ? page.width : page.w;
    const pageH = page.height != null ? page.height : page.h;
    assert(pageW === 1123 && pageH === 794 && page.orientation === 'landscape', `Preset template ${t.id} must be a 1123×794 landscape page (${pageW}×${pageH} ${page.orientation})`);
    assert(t.preset === true, `Preset template ${t.id} must be flagged preset === true`);
    assert(Array.isArray(t.elements) && t.elements.length >= 12, `Preset template ${t.id} must carry at least 12 elements, found ${t.elements && t.elements.length}`);
    const elementIds = t.elements.map(e => e.id);
    assert(new Set(elementIds).size === elementIds.length, `Preset template ${t.id} must use unique element ids`);
    const nameLayers = t.elements.filter(e => e.type === 'text' && e.text === '{{NAME}}');
    assert(nameLayers.length === 1, `Preset template ${t.id} must have exactly one {{NAME}} layer, found ${nameLayers.length}`);
    assert(nameLayers[0].autoFit === true, `Preset template ${t.id} name layer must opt into auto-fit`);
    assert(typeof nameLayers[0].fitMin === 'number' && Number.isFinite(nameLayers[0].fitMin), `Preset template ${t.id} name layer must carry a numeric fitMin`);
    const qrLayers = t.elements.filter(e => e.type === 'qr');
    assert(qrLayers.length === 1 && qrLayers[0].text === '{{VERIFY_URL}}', `Preset template ${t.id} must have exactly one {{VERIFY_URL}} QR layer`);
    assert(t.elements.some(e => e.id === 'certificate-id'), `Preset template ${t.id} must keep its certificate-id layer`);
    assert(!t.elements.some(e => e.type === 'image'), `Preset template ${t.id} must be zero-asset (no image elements)`);
    t.elements.forEach(e => {
      // Polygons are positioned by their points string, circles by cx/cy/r, and
      // everything else is x/y anchored.
      if (e.type === 'shape' && e.shape === 'polygon') {
        assert(typeof e.points === 'string' && /\d/.test(e.points), `Preset template ${t.id} polygon ${e.id} needs a points string`);
      } else if (e.type === 'shape' && e.shape === 'circle') {
        assert(typeof e.cx === 'number' && Number.isFinite(e.cx), `Preset template ${t.id} circle ${e.id} needs a finite cx`);
        assert(typeof e.cy === 'number' && Number.isFinite(e.cy), `Preset template ${t.id} circle ${e.id} needs a finite cy`);
        assert(typeof e.r === 'number' && Number.isFinite(e.r), `Preset template ${t.id} circle ${e.id} needs a finite r`);
      } else {
        assert(typeof e.x === 'number' && Number.isFinite(e.x), `Preset template ${t.id} element ${e.id} needs a finite x`);
        assert(typeof e.y === 'number' && Number.isFinite(e.y), `Preset template ${t.id} element ${e.id} needs a finite y`);
      }
      if (e.type === 'shape') {
        assert(['rect', 'circle', 'polygon'].includes(e.shape), `Preset template ${t.id} shape ${e.id} must be rect/circle/polygon (${e.shape})`);
      }
      Object.keys(e).forEach(k => {
        if (typeof e[k] === 'number') assert(Number.isFinite(e[k]), `Preset template ${t.id} ${e.id}.${k} must be a finite number`);
      });
      ['color', 'fill', 'stroke'].forEach(k => {
        if (!isPaint(e[k])) return;
        assert(HEX_COLOR.test(String(e[k])), `Preset template ${t.id} ${e.id}.${k} must be a hex colour (${e[k]})`);
      });
    });
  });

  // Spot check: the builder preserves ids and the source data carries no stray whitespace.
  assert(buildPresetTemplate(PRESET_TEMPLATES[0]).id === 'tpl-001', 'buildPresetTemplate must preserve the definition id (tpl-001)');
  assert(!/^\s/.test(PRESET_TEMPLATES[0].name) && PRESET_TEMPLATES[0].name === PRESET_TEMPLATES[0].name.trim(), `tpl-001 name must not carry leading whitespace (${JSON.stringify(PRESET_TEMPLATES[0].name)})`);

  // Integration: the curated 13 stay separate and the gallery sees all 113.
  const { templates: allTemplates, curatedTemplates } = await import('../js/templates.js');
  assert(curatedTemplates.length === 13, `curatedTemplates must stay at 13, found ${curatedTemplates.length}`);
  assert(allTemplates.length === 113, `templates must expose 13 curated + 100 presets = 113, found ${allTemplates.length}`);
  assert(allTemplates.some(t => t.id === 'tpl-100'), 'templates must include the final preset (tpl-100)');

  // Presets are first-class templates: their geometry must survive the real
  // SVG/PDF renderer (shapes, circles, polygons) and per-record auto-fit, and
  // their ids/layers must survive project sanitisation.
  const savedTemplateId = state.templateId;
  const savedElements = state.elements;
  ['tpl-001', 'tpl-020', 'tpl-081'].forEach(id => {
    const tpl = builtPresets.find(t => t.id === id);
    state.templateId = id;
    state.elements = tpl.elements.map(e => ({ ...e }));
    clearSvgCache();
    const svg = renderCertificateSVG({
      NAME: 'Dr. Bernadette Montgomery-Walsingham-Ferguson III',
      ROLE: 'Keynote Speaker',
      EVENT: 'Preset Test Summit',
      DATE: '2026-01-01',
      VENUE: 'Hall A'
    }, 0);
    assert(svg.includes(`fill="${tpl.background}"`), `preset ${id} background must paint in the SVG renderer`);
    assert(svg.includes('data-el="title"'), `preset ${id} title layer must render`);
    assert(/Montgomery-Walsingham-Ferguson/.test(svg), `preset ${id} must resolve the participant name`);
    const fitTag = svg.match(/<text[^>]*data-el="name"[^>]*font-size="([\d.]+)"/);
    assert(fitTag && Number(fitTag[1]) < 44, `preset ${id} must auto-shrink a long name in the SVG renderer (got ${fitTag && fitTag[1]})`);
    const staticLayer = renderStaticLayerSVG(id);
    assert(/<(rect|circle|polygon)/.test(staticLayer), `preset ${id} static layer must carry its vector frame`);
  });
  const presetRoundtrip = sanitizeProjectState({
    version: 3,
    projectName: 'Preset project',
    templateId: 'tpl-001',
    elements: builtPresets[0].elements
  }, defaultState());
  assert(presetRoundtrip.templateId === 'tpl-001', 'preset template ids must survive project sanitisation');
  assert(presetRoundtrip.elements.length === builtPresets[0].elements.length, 'preset layers must survive project sanitisation');
  state.templateId = savedTemplateId;
  state.elements = savedElements;
  clearSvgCache();

  ok('27. 100 procedural preset templates');

  console.log(`\nCertiForge logic tests: PASS (${passed} sections)`);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
