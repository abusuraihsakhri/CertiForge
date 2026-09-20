import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
eval(fs.readFileSync(path.join(__dirname, '../vendor/qrcode.min.js'), 'utf8'));

global.window = global;
global.document = {
  createElement: () => ({
    getContext: () => ({ fillRect: () => {}, drawImage: () => {} }),
    toDataURL: () => 'data:image/png;base64,mock'
  }),
  getElementById: () => null,
  querySelectorAll: () => []
};
global.Blob = class Blob { constructor(parts, opts) { this.parts = parts; this.opts = opts; } };
global.URL = { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
global.Image = class Image {
  set src(v) { setTimeout(() => { if (this.onload) this.onload(); }, 0); }
};
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.window.jspdf = {
  jsPDF: class {
    constructor() {}
    addImage() {}
    output() { return new global.Blob(['mock-pdf'], { type: 'application/pdf' }); }
  }
};

function assert(x, msg) { if (!x) throw new Error(msg); }

(async () => {
  const { state } = await import('../js/state.js');
  const { getTemplate } = await import('../js/templates.js');
  const { autoMap, mappedRows } = await import('../js/mapping.js');
  const { parseCSV } = await import('../js/spreadsheet.js');
  const { validateRows } = await import('../js/validator.js');
  const { renderCertificateSVG } = await import('../js/pdf.js');
  const { generateAll } = await import('../js/generator.js');
  const { loadProjectFile } = await import('../js/project.js');
  const {
    extractConferencePrefix,
    extractConferenceYear,
    computeVerificationSignature,
    getVerificationUrl,
    resolveText
  } = await import('../js/variables.js');

  // 1. Test Conference Prefix & Year Derivation
  assert(extractConferencePrefix('International Conference on Machine Learning 2026') === 'ICML', 'ICML prefix failed');
  assert(extractConferenceYear('International Conference on Machine Learning 2026') === '2026', 'Year extraction failed');
  assert(extractConferencePrefix('DevOps World 2026') === 'DW', 'DW prefix failed');
  assert(extractConferencePrefix('PyCon 2026') === 'PYCON', 'PyCon prefix failed');
  assert(extractConferencePrefix('10th International Conference on Computational Science') === 'ICCS', 'Ordinal stripping prefix failed');
  assert(extractConferencePrefix('') === 'CONF', 'Empty fallback failed');

  // 2. Test Cryptographic Verification Signature
  const sampleCert = {
    CERTIFICATE_ID: 'ICML-2026-0001',
    NAME: 'Alice Example',
    ROLE: 'Speaker',
    EVENT: 'ICML 2026',
    DATE: '18 Sep 2026',
    ORGANIZATION: 'Society'
  };
  const sig1 = computeVerificationSignature(sampleCert, 'test-secret');
  assert(sig1 && sig1.length === 16, 'Signature length invalid');
  const sig1Repeat = computeVerificationSignature(sampleCert, 'test-secret');
  assert(sig1 === sig1Repeat, 'Signature not deterministic');
  const tamperedCert = { ...sampleCert, NAME: 'Bob Tampered' };
  const sigTampered = computeVerificationSignature(tamperedCert, 'test-secret');
  assert(sig1 !== sigTampered, 'Tampered certificate must produce different signature');
  const roleTampered = { ...sampleCert, ROLE: 'Delegate' };
  assert(sig1 !== computeVerificationSignature(roleTampered, 'test-secret'), 'Role tampering must change v2 signature');

  const verifyUrl = getVerificationUrl(sampleCert, 'test-secret');
  assert(verifyUrl.includes('v=2') && verifyUrl.includes('id=ICML-2026-0001') && verifyUrl.includes('sig=') && verifyUrl.includes('name=Alice+Example'), 'Verification URL malformed');

  // 3. Test Template and Mapping
  state.elements = structuredClone(getTemplate('modern').elements);
  state.templateId = 'modern';
  state.rows = [
    { 'Participant Name': 'Alice Example', 'Role': 'Speaker', 'Registration ID': 'R001' },
    { 'Participant Name': '', 'Role': 'Delegate', 'Registration ID': 'R002' },
    { 'Participant Name': 'Alice Example', 'Role': 'Speaker', 'Registration ID': 'R003' }
  ];
  state.columns = Object.keys(state.rows[0]);
  state.globalFields = { EVENT: 'Annual Meeting', DATE: '18 Sep 2026', VENUE: 'Hall A', ORGANIZATION: 'Society' };
  autoMap();
  assert(state.mappings.NAME === 'Participant Name', 'NAME auto-map failed');
  assert(state.mappings.ROLE === 'Role', 'ROLE auto-map failed');

  const mapped = mappedRows();
  assert(mapped[0].EVENT === 'Annual Meeting' && mapped[0].REGISTRATION_ID === 'R001', 'mapping/global/custom token failed');
  assert(resolveText('{{PAPER_TITLE}}', mapped[0], 0) === '', 'Production resolution leaked sample/demo data');

  // 4. Test QR Code Element Dynamic Per-Participant Rendering
  state.elements.push({
    id: 'qr_test',
    type: 'qr',
    text: '{{VERIFY_URL}}',
    x: 100,
    y: 100,
    w: 80
  });

  const svg = renderCertificateSVG(mapped[0], 0);
  assert(svg.includes('Alice Example') && svg.includes('Annual Meeting'), 'SVG text render failed');
  assert(svg.includes('data-el="qr_test"'), 'SVG QR element render failed');
  assert(svg.includes('href="data:image/'), 'SVG QR data URL missing');

  // 5. Test Batch Generation and Registry Output
  state.settings.filename = '{{NAME}}.pdf';
  const result = await generateAll();
  assert(result.files.length === 2 && result.skipped === 1, 'generation skip failed');
  assert(result.files[1].name === 'Alice Example_2.pdf', 'duplicate filename handling failed');
  assert(result.registry && result.registry.length === 2, 'registry missing or incorrect length');
  assert(result.registry[0].name === 'Alice Example' && result.registry[0].sig, 'registry data invalid');

  // 6. Test CSV Parser
  const csv = 'Name,Role,Note\n"Doe, Jane",Speaker,"A ""quoted"" note"\nBob,Delegate,OK\n';
  const parsed = parseCSV(csv);
  assert(parsed[0].Name === 'Doe, Jane' && parsed[0].Note === 'A "quoted" note', 'CSV parser failed');

  // 7. Test Validation
  const v = validateRows();
  assert(v.total === 3 && v.valid === 2 && v.missingName === 1, 'validation failed');

  // 8. Test Project Persistence
  const snapshot = {
    version: 2, projectName: 'Saved', templateId: 'modern',
    elements: [{ id: 'x', type: 'text', text: 'Edited', x: 1, y: 2, w: 3, size: 12 }],
    mappings: { NAME: 'Name' },
    globalFields: { EVENT: 'Saved event' },
    certificate: { prefix: 'ABC' },
    settings: { filename: '{{NAME}}.pdf' }
  };
  await loadProjectFile({ text: async () => JSON.stringify(snapshot) });
  assert(state.elements[0].text === 'Edited' && state.globalFields.EVENT === 'Saved event', 'project import failed');

  // 9. Test Indian Templates Catalog and Rendering
  const { templates } = await import('../js/templates.js');
  assert(templates.length === 13, `Expected 13 templates, found ${templates.length}`);
  const medConf = getTemplate('indian-medical-conf');
  assert(medConf && medConf.name === 'Indian Medical Conference', 'Indian Medical Conf template missing');
  const medAward = getTemplate('indian-medical-award');
  assert(medAward && medAward.name === 'Indian Conference Merit & Award', 'Indian Medical Award template missing');
  
  state.templateId = 'indian-medical-conf';
  state.elements = structuredClone(medConf.elements);
  const indianSvg = renderCertificateSVG({
    NAME: 'Dr Abu Suraih Sakhri. E.P',
    ROLE: 'Delegate',
    ORGANIZATION: 'Delhi Society of Haematology',
    EVENT: '32nd Annual Conference',
    VENUE: 'Maulana Azad Medical College, New Delhi',
    DATE: '8th October 2026'
  }, 0);
  assert(indianSvg.includes('Dr Abu Suraih Sakhri. E.P'), 'Indian recipient name missing in SVG');
  assert(indianSvg.includes('Delhi Society of Haematology'), 'Indian organization missing in SVG');
  assert(indianSvg.includes('data-el="logo-soc"') && indianSvg.includes('data-el="logo-col"'), 'Indian dual crests missing in SVG');
  assert(indianSvg.includes('data-el="sig1-img"') && indianSvg.includes('data-el="sig4-img"'), 'Indian 4-column signatures missing in SVG');

  console.log('CertiForge logic tests: PASS');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
