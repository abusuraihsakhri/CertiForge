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

  const csv = 'Name,Role,Note\n"Doe, Jane",Speaker,"A ""quoted"" note"\nBob,Delegate,OK\n';
  const parsed = parseCSV(csv);
  assert(parsed[0].Name === 'Doe, Jane' && parsed[0].Note === 'A "quoted" note', 'CSV parser failed');

  const v = validateRows();
  assert(v.total === 3 && v.valid === 2 && v.missingName === 1, 'validation failed');

  const svg = renderCertificateSVG(mapped[0], 0);
  assert(svg.includes('Alice Example') && svg.includes('Annual Meeting'), 'SVG render failed');

  state.settings.filename = '{{NAME}}.pdf';
  const result = await generateAll();
  assert(result.files.length === 2 && result.skipped === 1, 'generation skip failed');
  assert(result.files[1].name === 'Alice Example_2.pdf', 'duplicate filename handling failed');

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

  console.log('CertiForge logic tests: PASS');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
