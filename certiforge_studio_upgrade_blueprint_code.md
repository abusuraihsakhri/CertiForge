# CertiForge 2.0: Studio UI & Functional Upgrade Blueprint

This document contains the complete design specification, step-by-step implementation directions, HTML/CSS architecture for the **3-Pane Studio Workspace**, and production-ready Vanilla JavaScript modules for **Smart Auto-Fit Text Scaling**, the **Stress-Test Record Scrubber**, and the **Client-Side Signature Background Remover**.

---

## 1. Strategic Overview: From Web Form to Precision Studio

Currently, CertiForge operates like a sequential web form. To elevate it to a desktop-class production tool (similar to Figma, Linear, or Canva) tailored for academic conferences, CME workshops, and institutional cohorts, we are upgrading two pillars:

1. **Spatial 3-Pane Studio Architecture:** Keeping the interactive certificate canvas permanently centered while moving navigation/layers to the left rail and contextual typography/coordinate controls to the right inspector.
2. **Zero-Anxiety Batch Automation:** Adding deterministic tools that prevent the most common batch certificate failures (overflowing long names, messy CSV casing, and shadowy WhatsApp signature photos).

---

## 2. Step-by-Step Implementation Directions

### Phase 1: Restructuring the DOM & CSS Shell
1. Replace your existing single-column or 2-column wrapper with the `.certiforge-studio` CSS Grid layout provided in **Section 3**.
2. Move your step navigation (`Template`, `Data`, `Canvas`, `Export`) into the **Top Header Bar** or the upper half of the **Left Rail**, dedicating the bottom half of the Left Rail to the **Layers & Dynamic Variables Tree** (e.g., `{{Participant_Name}}`, `{{Role}}`, `{{Certificate_ID}}`).
3. Keep the `<canvas id="cert-canvas">` permanently mounted inside `.canvas-viewport` so users see real-time changes during every step of the workflow.
4. Mount the **Floating Record Scrubber** at the top of `.canvas-viewport` and the **Zoom Controls** at the bottom right.

### Phase 2: Wiring the Smart Canvas Engine
1. Integrate the `AutoFitTextEngine` (from **Section 4**) into your canvas rendering loop.
2. Instead of drawing text with a single fixed font size, pass each dynamic layer's `maxWidth`, `maxFontSize`, and `minFontSize` to `drawAutoFitText()`.
3. Connect your parsed CSV array to the `RecordScrubber` controller so clicking **⚡ Longest Name** immediately finds the row with the maximum character length in the bound column and renders it on the canvas.

### Phase 3: Adding the Signature Studio Utility
1. In the Left Rail or Inspector, add an **"Add Wet Signature"** file input.
2. Pass the uploaded image file into `processSignatureImage()` (from **Section 5**), which uses an offscreen HTML5 Canvas luminance threshold algorithm to strip gray/yellow paper backgrounds and convert the ink to Crisp Black (`#0f172a`) or Royal Blue (`#1d4ed8`).

---

## 3. Complete HTML & CSS: 3-Pane Studio Layout

Drop this structure into your main application view to establish the high-craft studio aesthetic with tabular coordinate inputs, dot-matrix canvas backdrop, and floating glassmorphic toolbars.

### `index.html` (Studio Workspace Structure)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CertiForge Studio</title>
  <!-- Google Fonts for UI & Ceremonial Certificate Previews -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="studio.css" />
</head>
<body>
  <div class="certiforge-studio">
    
    <!-- TOP BAR: Project Identity, Workflow Switcher & Batch Export -->
    <header class="studio-header">
      <div class="brand-cluster">
        <div class="brand-logo">CF</div>
        <span class="project-title" contenteditable="true">Annual Medical Conference 2026</span>
        <span class="badge-local">100% Client-Side</span>
      </div>

      <nav class="workflow-tabs">
        <button class="tab-btn active">1. Template & Layers</button>
        <button class="tab-btn">2. CSV Data (248 rows)</button>
        <button class="tab-btn">3. Verification & QR</button>
      </nav>

      <div class="header-actions">
        <button id="btn-save-project" class="btn-secondary">Save .certiforge</button>
        <button id="btn-export-batch" class="btn-primary">Export 248 PDFs</button>
      </div>
    </header>

    <!-- LEFT RAIL: Layers & CSV Variable Pills -->
    <aside class="studio-left-rail">
      <div class="panel-section">
        <div class="section-header">
          <span>CSV VARIABLES</span>
          <button id="btn-sanitize-csv" class="btn-micro" title="Convert names to Title Case & trim spaces">Clean Case ✨</button>
        </div>
        <div class="variable-pill-list" id="variable-pills">
          <button class="var-pill var-indigo" data-col="Full_Name">{{Full_Name}}</button>
          <button class="var-pill var-emerald" data-col="Category">{{Category}}</button>
          <button class="var-pill var-amber" data-col="CME_Credits">{{CME_Credits}}</button>
          <button class="var-pill var-slate" data-col="Cert_ID">{{Cert_ID}}</button>
        </div>
      </div>

      <div class="panel-section flex-grow">
        <div class="section-header">
          <span>CANVAS LAYERS</span>
          <button id="btn-add-text" class="btn-micro">+ Text</button>
        </div>
        <ul class="layer-tree" id="layer-tree">
          <li class="layer-item selected" data-layer-id="layer-name">
            <span class="layer-icon">T</span>
            <span class="layer-label">{{Full_Name}}</span>
            <span class="layer-tag">Auto-Fit</span>
          </li>
          <li class="layer-item" data-layer-id="layer-role">
            <span class="layer-icon">T</span>
            <span class="layer-label">{{Category}}</span>
          </li>
          <li class="layer-item" data-layer-id="layer-sig">
            <span class="layer-icon">✒️</span>
            <span class="layer-label">Dean_Signature.png</span>
          </li>
          <li class="layer-item" data-layer-id="layer-bg">
            <span class="layer-icon">🖼️</span>
            <span class="layer-label">A4_Master_Template.png</span>
          </li>
        </ul>
      </div>

      <!-- Signature Auto-Cleaner Dropzone -->
      <div class="panel-section signature-box">
        <div class="section-header">
          <span>SIGNATURE CLEANER</span>
        </div>
        <label class="upload-drop-mini">
          <input type="file" id="sig-upload-input" accept="image/*" hidden />
          <span>+ Strip Paper Background</span>
        </label>
        <div class="sig-controls">
          <label>Ink:</label>
          <button class="ink-swatch active" data-ink="#0f172a" style="background:#0f172a" title="Deep Black"></button>
          <button class="ink-swatch" data-ink="#1d4ed8" style="background:#1d4ed8" title="Royal Blue"></button>
          <input type="range" id="sig-threshold" min="80" max="220" value="165" title="Paper Threshold" />
        </div>
      </div>
    </aside>

    <!-- CENTER STAGE: Infinite Dot-Grid Canvas & Floating Record Scrubber -->
    <main class="canvas-viewport">
      
      <!-- Floating Stress-Test Scrubber Bar -->
      <div class="record-scrubber">
        <button id="btn-prev-row" class="scrubber-btn" title="Previous Record">◀</button>
        <div class="scrubber-status">
          <span id="scrubber-index">Row 1 / 5</span>:
          <strong id="scrubber-preview-name">Dr. Aarav Sharma</strong>
        </div>
        <button id="btn-next-row" class="scrubber-btn" title="Next Record">▶</button>
        <div class="scrubber-divider"></div>
        <button id="btn-longest-name" class="scrubber-stress-btn" title="Jump to the row with the longest character count">
          ⚡ Longest Name
        </button>
        <button id="btn-shortest-name" class="scrubber-stress-btn" title="Jump to shortest name">
          Shortest
        </button>
      </div>

      <!-- The Interactive Certificate Canvas -->
      <div class="canvas-stage-wrapper">
        <canvas id="cert-canvas" width="1123" height="794"></canvas>
      </div>

      <!-- Floating Bottom-Right Zoom Pill -->
      <div class="zoom-controls">
        <button id="zoom-out">−</button>
        <span id="zoom-level">75%</span>
        <button id="zoom-in">+</button>
        <button id="zoom-fit">Fit</button>
      </div>
    </main>

    <!-- RIGHT INSPECTOR: Precision Coordinates & Auto-Fit Typography -->
    <aside class="studio-right-inspector">
      <div class="panel-section">
        <div class="section-header">POSITION & BOUNDING BOX</div>
        <div class="inspector-grid-2col">
          <label class="coord-input">
            <span class="label">X</span>
            <input type="number" id="inp-x" value="561" />
          </label>
          <label class="coord-input">
            <span class="label">Y</span>
            <input type="number" id="inp-y" value="390" />
          </label>
          <label class="coord-input" title="Maximum width before Auto-Fit shrinks the font">
            <span class="label">MaxW</span>
            <input type="number" id="inp-max-w" value="680" />
          </label>
          <label class="coord-input">
            <span class="label">Align</span>
            <select id="inp-align">
              <option value="center" selected>Center</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
        </div>
        <button id="btn-snap-center" class="btn-outline-full">Snap Horizontal Center (561.5 px)</button>
      </div>

      <div class="panel-section">
        <div class="section-header">TYPOGRAPHY & SMART AUTO-FIT</div>
        <div class="form-group">
          <label>Font Family</label>
          <select id="inp-font-family" class="studio-select">
            <option value="'Playfair Display', serif">Playfair Display (Ceremonial)</option>
            <option value="'Cinzel', serif">Cinzel (Academic Capitals)</option>
            <option value="'Cormorant Garamond', serif">Cormorant Garamond</option>
            <option value="'Inter', sans-serif">Inter (Modern Clean)</option>
          </select>
        </div>

        <div class="inspector-grid-2col" style="margin-top: 10px;">
          <label class="coord-input" title="Target Font Size for normal names">
            <span class="label">MaxPt</span>
            <input type="number" id="inp-font-max" value="44" />
          </label>
          <label class="coord-input" title="Minimum Font Size allowed when shrinking long names">
            <span class="label">MinPt</span>
            <input type="number" id="inp-font-min" value="20" />
          </label>
        </div>
        <div class="autofit-telemetry" id="autofit-telemetry">
          Rendered at <strong>44px</strong> (Fits within 680px box)
        </div>
      </div>

      <div class="panel-section">
        <div class="section-header">DATA BINDING & FALLBACK</div>
        <div class="form-group">
          <label>Bound CSV Column</label>
          <select id="inp-data-column" class="studio-select">
            <option value="Full_Name">Full_Name</option>
            <option value="Category">Category</option>
            <option value="CME_Credits">CME_Credits</option>
          </select>
        </div>
        <div class="form-group" style="margin-top: 8px;">
          <label>Prefix / Honorific Rule</label>
          <input type="text" id="inp-prefix" class="studio-input" placeholder="e.g. Ensure 'Dr. ' prefix" />
        </div>
      </div>
    </aside>

  </div>

  <script src="studio-engine.js"></script>
</body>
</html>
```

---

### `studio.css` (High-Craft Studio Stylesheet)

```css
:root {
  --bg-app: #f8fafc;
  --bg-panel: #ffffff;
  --bg-canvas: #f1f5f9;
  --border-subtle: #e2e8f0;
  --border-focus: #4f46e5;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent-primary: #4f46e5;
  --accent-hover: #4338ca;
  --accent-soft: #eef2ff;
  --danger-soft: #fef2f2;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-app);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* 3-PANE STUDIO GRID */
.certiforge-studio {
  display: grid;
  grid-template-columns: 250px 1fr 310px;
  grid-template-rows: 54px calc(100vh - 54px);
  height: 100vh;
  width: 100vw;
}

/* TOP HEADER */
.studio-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 10;
}

.brand-cluster {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--accent-primary);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  display: grid;
  place-items: center;
}

.project-title {
  font-weight: 600;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
}
.project-title:focus {
  outline: 2px solid var(--border-focus);
  background: var(--bg-app);
}

.badge-local {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.workflow-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-app);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
}
.tab-btn.active {
  background: var(--bg-panel);
  color: var(--text-primary);
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-primary {
  background: var(--accent-primary);
  color: #fff;
  border: none;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:hover { background: var(--accent-hover); }

.btn-secondary {
  background: var(--bg-panel);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

/* LEFT & RIGHT PANELS */
.studio-left-rail {
  background: var(--bg-panel);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.studio-right-inspector {
  background: var(--bg-panel);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.btn-micro {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-app);
  color: var(--text-secondary);
  cursor: pointer;
}

/* SEMANTIC VARIABLE PILLS */
.variable-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.var-pill {
  font-family: var(--font-mono);
  font-size: 11.5px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 500;
}
.var-indigo { background: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
.var-emerald { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
.var-amber { background: #fffbeb; color: #b45309; border-color: #fde68a; }
.var-slate { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }

/* LAYER TREE */
.layer-tree {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
}
.layer-item.selected {
  background: var(--accent-soft);
  color: var(--accent-primary);
  font-weight: 500;
}
.layer-tag {
  margin-left: auto;
  font-size: 10px;
  background: #e0e7ff;
  color: #4338ca;
  padding: 1px 5px;
  border-radius: 4px;
}

/* CENTER INFINITE CANVAS VIEWPORT */
.canvas-viewport {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-canvas);
  background-image: radial-gradient(#cbd5e1 1.25px, transparent 1.25px);
  background-size: 20px 20px;
  overflow: hidden;
}

.canvas-stage-wrapper {
  box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.14),
              0 0 0 1px rgba(15, 23, 42, 0.08);
  background: #fff;
  transition: transform 0.15s ease;
  transform: scale(0.72);
  transform-origin: center center;
}

#cert-canvas {
  display: block;
}

/* FLOATING STRESS-TEST SCRUBBER BAR */
.record-scrubber {
  position: absolute;
  top: 16px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-subtle);
  border-radius: 9999px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  font-size: 12.5px;
}

.scrubber-btn {
  border: none;
  background: var(--bg-app);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 10px;
}
.scrubber-btn:hover { background: var(--border-subtle); }

.scrubber-divider {
  width: 1px;
  height: 16px;
  background: var(--border-subtle);
  margin: 0 4px;
}

.scrubber-stress-btn {
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #b45309;
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 999px;
  cursor: pointer;
}
.scrubber-stress-btn:hover { background: #fef3c7; }

/* ZOOM CONTROLS */
.zoom-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border-subtle);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-family: var(--font-mono);
}
.zoom-controls button {
  border: none;
  background: transparent;
  padding: 2px 6px;
  cursor: pointer;
  font-weight: 600;
}

/* RIGHT INSPECTOR INPUTS */
.inspector-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.coord-input {
  display: flex;
  align-items: center;
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 5px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.coord-input:focus-within {
  border-color: var(--border-focus);
  background: #fff;
}

.coord-input .label {
  color: var(--text-muted);
  margin-right: 6px;
  font-size: 11px;
  user-select: none;
}

.coord-input input,
.coord-input select {
  width: 100%;
  border: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-primary);
  outline: none;
}

.btn-outline-full {
  margin-top: 10px;
  width: 100%;
  padding: 6px;
  font-size: 12px;
  border: 1px dashed var(--border-subtle);
  background: var(--bg-app);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
}
.btn-outline-full:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.form-group label {
  display: block;
  font-size: 11.5px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.studio-select,
.studio-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  font-size: 12.5px;
  background: var(--bg-app);
}

.autofit-telemetry {
  margin-top: 8px;
  font-size: 11.5px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

/* SIGNATURE UPLOAD BOX */
.upload-drop-mini {
  display: block;
  text-align: center;
  padding: 10px;
  border: 1px dashed #94a3b8;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  background: var(--bg-app);
}
.sig-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 11.5px;
}
.ink-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #cbd5e1;
  cursor: pointer;
}
.ink-swatch.active {
  box-shadow: 0 0 0 2px var(--accent-primary);
}
```

---

## 4. Vanilla JS Engine: Smart Auto-Fit Text, Longest-Name Scrubber & Snap Guides

Save this as `studio-engine.js`. It implements:
1. **Binary-Search Font Auto-Fitting (`fitTextBinarySearch`)**: Calculates the exact largest font size between `minPt` and `maxPt` that fits inside `maxWidth` in $O(\log N)$ steps.
2. **Stress-Test Record Scrubber**: Instantly jumps to the longest or shortest participant name in the dataset so you can verify bounding boxes before exporting 300 PDFs.
3. **CSV Honorific & Title-Case Sanitizer**: Cleans messy spreadsheet exports while preserving medical/academic post-nominals (`MD`, `PhD`, `FRCS`, `AIIMS`).
4. **Client-Side Signature Background Remover**: Converts phone photos of signatures on paper into crisp, transparent PNG layers with custom ink tinting.

### `studio-engine.js`

```javascript
/**
 * CertiForge Studio 2.0 Core Engine
 * Includes:
 * 1. Binary Search Auto-Fit Text Renderer
 * 2. Longest/Shortest Record Scrubber
 * 3. Smart Academic Title-Case Sanitizer
 * 4. Client-Side Wet Signature Background Remover
 */

const canvas = document.getElementById('cert-canvas');
const ctx = canvas.getContext('2d');

// Sample Cohort Data (Simulating a messy conference CSV with extreme name lengths)
let participants = [
  { Full_Name: "dr. aarav sharma, md", Category: "Keynote Speaker", CME_Credits: "6.0 Hours", Cert_ID: "CF-2026-001" },
  { Full_Name: "Prof. Venkatasubramanian Balasubramanium, FRCS", Category: "Panelist & Session Chair", CME_Credits: "6.0 Hours", Cert_ID: "CF-2026-002" },
  { Full_Name: "Dr. Mei Lin", Category: "Delegate", CME_Credits: "4.5 Hours", Cert_ID: "CF-2026-003" },
  { Full_Name: "Dr. Alexandria Catherine Montgomery-Walsingham, MD, PhD", Category: "Best Poster Awardee", CME_Credits: "6.0 Hours", Cert_ID: "CF-2026-004" },
  { Full_Name: "rajeshwari iyer", Category: "Workshop Facilitator", CME_Credits: "8.0 Hours", Cert_ID: "CF-2026-005" }
];

let currentRowIndex = 0;
let showGuides = true;
let cleanedSignatureCanvas = null;

// Active Layer State for {{Full_Name}}
const nameLayer = {
  id: 'layer-name',
  column: 'Full_Name',
  x: 561.5,          // Horizontal Center of A4 Landscape (1123px)
  y: 390,
  maxWidth: 680,     // Bounding box width in pixels
  maxFontSize: 44,   // Preferred font size
  minFontSize: 18,   // Floor font size before ellipsis/warning
  fontFamily: "'Playfair Display', serif",
  fontWeight: "600",
  align: "center",
  color: "#0f172a",
  prefixRule: ""
};

/* ==========================================================================
   1. BINARY-SEARCH SMART AUTO-FIT TEXT ENGINE
   ========================================================================== */

/**
 * Finds the optimal font size within [minSize, maxSize] so that `text` fits inside `maxWidth`.
 */
function calculateOptimalFontSize(context, text, fontFamily, fontWeight, maxWidth, minSize, maxSize) {
  let low = minSize;
  let high = maxSize;
  let bestFit = minSize;

  // Quick check: Does maxSize already fit?
  context.font = `${fontWeight} ${maxSize}px ${fontFamily}`;
  if (context.measureText(text).width <= maxWidth) {
    return { fontSize: maxSize, shrunk: false, overflowed: false };
  }

  // Binary search for largest fitting integer/half-pixel font size
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    context.font = `${fontWeight} ${mid}px ${fontFamily}`;
    const measuredWidth = context.measureText(text).width;

    if (measuredWidth <= maxWidth) {
      bestFit = mid;
      low = mid + 1; // Try to go larger
    } else {
      high = mid - 1; // Too wide, shrink
    }
  }

  // Final check if even minSize overflows
  context.font = `${fontWeight} ${bestFit}px ${fontFamily}`;
  const finalWidth = context.measureText(text).width;

  return {
    fontSize: bestFit,
    shrunk: bestFit < maxSize,
    overflowed: finalWidth > maxWidth,
    measuredWidth: Math.round(finalWidth)
  };
}

/* ==========================================================================
   2. CERTIFICATE CANVAS RENDER PIPELINE
   ========================================================================== */

function renderCertificate() {
  const row = participants[currentRowIndex];
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Ornamental A4 Background Template (Simulated Vector Template)
  drawCeremonialBackground(ctx, canvas.width, canvas.height);

  // 2. Prepare Bound Text with Optional Prefix Rule
  let rawName = row[nameLayer.column] || "";
  if (nameLayer.prefixRule && !rawName.toLowerCase().startsWith(nameLayer.prefixRule.toLowerCase().trim())) {
    rawName = `${nameLayer.prefixRule.trim()} ${rawName}`;
  }

  // 3. Run Auto-Fit Calculation for Participant Name
  const fitResult = calculateOptimalFontSize(
    ctx,
    rawName,
    nameLayer.fontFamily,
    nameLayer.fontWeight,
    nameLayer.maxWidth,
    nameLayer.minFontSize,
    nameLayer.maxFontSize
  );

  // 4. Draw Bounding Box & Center Snap Guide (When inspecting)
  if (showGuides) {
    ctx.save();
    // Horizontal Center Snap Line (Magenta)
    if (Math.abs(nameLayer.x - canvas.width / 2) < 2) {
      ctx.strokeStyle = "#ec4899";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 60);
      ctx.lineTo(canvas.width / 2, canvas.height - 60);
      ctx.stroke();
    }

    // Bounding Box Preview around {{Full_Name}}
    const boxLeft = nameLayer.align === 'center'
      ? nameLayer.x - nameLayer.maxWidth / 2
      : nameLayer.x;
    ctx.strokeStyle = fitResult.shrunk ? "#f59e0b" : "#6366f1";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(
      boxLeft,
      nameLayer.y - fitResult.fontSize,
      nameLayer.maxWidth,
      fitResult.fontSize * 1.35
    );
    ctx.restore();
  }

  // 5. Draw Participant Name
  ctx.save();
  ctx.font = `${nameLayer.fontWeight} ${fitResult.fontSize}px ${nameLayer.fontFamily}`;
  ctx.fillStyle = nameLayer.color;
  ctx.textAlign = nameLayer.align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(rawName, nameLayer.x, nameLayer.y);
  ctx.restore();

  // 6. Draw Secondary Dynamic Fields ({{Category}}, {{CME_Credits}}, {{Cert_ID}})
  ctx.save();
  ctx.font = "500 20px 'Inter', sans-serif";
  ctx.fillStyle = "#334155";
  ctx.textAlign = "center";
  ctx.fillText(
    `for outstanding participation as ${row.Category} (${row.CME_Credits})`,
    canvas.width / 2,
    465
  );

  ctx.font = "500 13px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "left";
  ctx.fillText(`VERIFY ID: ${row.Cert_ID}`, 95, canvas.height - 85);
  ctx.restore();

  // 7. Draw Cleaned Wet Signature (if uploaded)
  if (cleanedSignatureCanvas) {
    ctx.drawImage(cleanedSignatureCanvas, canvas.width - 310, canvas.height - 205, 190, 85);
  }

  // 8. Update UI Telemetry & Scrubber Bar
  updateTelemetryUI(row, rawName, fitResult);
}

function drawCeremonialBackground(context, w, h) {
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, w, h);

  // Double Ceremonial Gold/Navy Border
  context.strokeStyle = "#1e293b";
  context.lineWidth = 4;
  context.strokeRect(40, 40, w - 80, h - 80);

  context.strokeStyle = "#b45309";
  context.lineWidth = 1.5;
  context.strokeRect(50, 50, w - 100, h - 100);

  // Static Header Text
  context.fillStyle = "#0f172a";
  context.font = "700 34px 'Cinzel', serif";
  context.textAlign = "center";
  context.fillText("CERTIFICATE OF ACCREDITATION", w / 2, 165);

  context.fillStyle = "#64748b";
  context.font = "italic 600 22px 'Cormorant Garamond', serif";
  context.fillText("This is proudly presented to", w / 2, 295);

  // Signature Line
  context.strokeStyle = "#94a3b8";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(w - 320, h - 115);
  context.lineTo(w - 100, h - 115);
  context.stroke();

  context.font = "600 13px 'Inter', sans-serif";
  context.fillStyle = "#334155";
  context.fillText("DEAN OF ACADEMIC AFFAIRS", w - 210, h - 92);
  context.restore();
}

function updateTelemetryUI(row, renderedText, fitResult) {
  document.getElementById('scrubber-index').textContent = `Row ${currentRowIndex + 1} / ${participants.length}`;
  document.getElementById('scrubber-preview-name').textContent =
    renderedText.length > 34 ? renderedText.slice(0, 34) + "…" : renderedText;

  const telemetryEl = document.getElementById('autofit-telemetry');
  if (fitResult.overflowed) {
    telemetryEl.style.background = "#fef2f2";
    telemetryEl.style.color = "#b91c1c";
    telemetryEl.innerHTML = `⚠️ Overflow at <strong>${fitResult.fontSize}px</strong> (${fitResult.measuredWidth}px > ${nameLayer.maxWidth}px)`;
  } else if (fitResult.shrunk) {
    telemetryEl.style.background = "#fffbeb";
    telemetryEl.style.color = "#b45309";
    telemetryEl.innerHTML = `✨ Auto-shrunk to <strong>${fitResult.fontSize}px</strong> to fit ${nameLayer.maxWidth}px box`;
  } else {
    telemetryEl.style.background = "#f8fafc";
    telemetryEl.style.color = "#475569";
    telemetryEl.innerHTML = `✓ Rendered at target <strong>${fitResult.fontSize}px</strong> (${fitResult.measuredWidth}px / ${nameLayer.maxWidth}px)`;
  }
}

/* ==========================================================================
   3. STRESS-TEST RECORD SCRUBBER (JUMP TO LONGEST / SHORTEST NAME)
   ========================================================================== */

document.getElementById('btn-prev-row').addEventListener('click', () => {
  currentRowIndex = (currentRowIndex - 1 + participants.length) % participants.length;
  renderCertificate();
});

document.getElementById('btn-next-row').addEventListener('click', () => {
  currentRowIndex = (currentRowIndex + 1) % participants.length;
  renderCertificate();
});

document.getElementById('btn-longest-name').addEventListener('click', () => {
  const col = nameLayer.column;
  let maxIndex = 0;
  let maxLen = 0;

  participants.forEach((row, idx) => {
    const len = (row[col] || "").length;
    if (len > maxLen) {
      maxLen = len;
      maxIndex = idx;
    }
  });

  currentRowIndex = maxIndex;
  renderCertificate();
});

document.getElementById('btn-shortest-name').addEventListener('click', () => {
  const col = nameLayer.column;
  let minIndex = 0;
  let minLen = Infinity;

  participants.forEach((row, idx) => {
    const len = (row[col] || "").length;
    if (len < minLen) {
      minLen = len;
      minIndex = idx;
    }
  });

  currentRowIndex = minIndex;
  renderCertificate();
});

/* ==========================================================================
   4. ACADEMIC / MEDICAL CSV CASE SANITIZER
   ========================================================================== */

const PRESERVED_ACRONYMS = new Set(["MD", "PHD", "DM", "MCH", "FRCS", "MRCP", "MBBS", "AIIMS", "II", "III"]);

function toAcademicTitleCase(rawStr) {
  return rawStr
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(token => {
      const cleanToken = token.replace(/[^a-zA-Z]/g, "").toUpperCase();
      if (PRESERVED_ACRONYMS.has(cleanToken)) {
        return token.toUpperCase();
      }
      // Handle hyphenated surnames like Montgomery-Walsingham
      return token
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join("-");
    })
    .join(" ");
}

document.getElementById('btn-sanitize-csv').addEventListener('click', () => {
  participants = participants.map(row => ({
    ...row,
    Full_Name: toAcademicTitleCase(row.Full_Name)
  }));
  renderCertificate();
});

/* ==========================================================================
   5. CLIENT-SIDE WET SIGNATURE BACKGROUND REMOVER & INK TINTER
   ========================================================================== */

let uploadedSignatureImg = null;
let selectedInkHex = "#0f172a";

function hexToRgb(hex) {
  const num = parseInt(hex.replace("#", ""), 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/**
 * Strips paper background using luminance thresholding and alpha feathering,
 * and re-tints all ink pixels to the chosen ceremonial ink color.
 */
function processSignatureImage(imgElement, threshold = 165, inkHex = "#0f172a") {
  const offCanvas = document.createElement('canvas');
  const w = imgElement.naturalWidth || imgElement.width;
  const h = imgElement.naturalHeight || imgElement.height;
  offCanvas.width = w;
  offCanvas.height = h;

  const offCtx = offCanvas.getContext('2d');
  offCtx.drawImage(imgElement, 0, 0);

  const imgData = offCtx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const ink = hexToRgb(inkHex);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Perceived luminance formula (ITU-R BT.601)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum >= threshold) {
      // Paper background -> Make 100% transparent
      data[i + 3] = 0;
    } else {
      // Ink stroke -> Re-tint to selected ink color with smooth anti-aliased alpha
      const normalizedDarkness = (threshold - lum) / threshold;
      const smoothAlpha = Math.min(255, Math.round(Math.pow(normalizedDarkness, 0.7) * 255));
      data[i] = ink.r;
      data[i + 1] = ink.g;
      data[i + 2] = ink.b;
      data[i + 3] = smoothAlpha;
    }
  }

  offCtx.putImageData(imgData, 0, 0);
  return offCanvas;
}

document.getElementById('sig-upload-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      uploadedSignatureImg = img;
      const threshold = parseInt(document.getElementById('sig-threshold').value, 10);
      cleanedSignatureCanvas = processSignatureImage(uploadedSignatureImg, threshold, selectedInkHex);
      renderCertificate();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('sig-threshold').addEventListener('input', (e) => {
  if (!uploadedSignatureImg) return;
  const threshold = parseInt(e.target.value, 10);
  cleanedSignatureCanvas = processSignatureImage(uploadedSignatureImg, threshold, selectedInkHex);
  renderCertificate();
});

document.querySelectorAll('.ink-swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ink-swatch').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedInkHex = btn.dataset.ink;
    if (uploadedSignatureImg) {
      const threshold = parseInt(document.getElementById('sig-threshold').value, 10);
      cleanedSignatureCanvas = processSignatureImage(uploadedSignatureImg, threshold, selectedInkHex);
      renderCertificate();
    }
  });
});

/* ==========================================================================
   6. RIGHT INSPECTOR TWO-WAY BINDING
   ========================================================================== */

function bindInspectorInputs() {
  const bind = (id, prop, isNumeric = true) => {
    const el = document.getElementById(id);
    el.addEventListener('input', (e) => {
      nameLayer[prop] = isNumeric ? parseFloat(e.target.value) || 0 : e.target.value;
      renderCertificate();
    });
  };

  bind('inp-x', 'x', true);
  bind('inp-y', 'y', true);
  bind('inp-max-w', 'maxWidth', true);
  bind('inp-font-max', 'maxFontSize', true);
  bind('inp-font-min', 'minFontSize', true);
  bind('inp-align', 'align', false);
  bind('inp-font-family', 'fontFamily', false);
  bind('inp-data-column', 'column', false);
  bind('inp-prefix', 'prefixRule', false);

  document.getElementById('btn-snap-center').addEventListener('click', () => {
    nameLayer.x = canvas.width / 2;
    document.getElementById('inp-x').value = nameLayer.x;
    renderCertificate();
  });
}

// Initialize Studio on Load
document.fonts.ready.then(() => {
  bindInspectorInputs();
  renderCertificate();
});
```

---

## 5. Additional Functional Upgrades Roadmap

Once the 3-Pane Studio and Auto-Fit Engine are live, here are the next high-value capabilities to add:

1. **Deterministic Verification Hash & SVG QR Generator:**
   - Use the native Web Crypto API (`crypto.subtle.digest('SHA-256', new TextEncoder().encode(row.Full_Name + projectSecret))`) to generate tamper-evident 8-character IDs (`CF-9A84F21B`) automatically when a CSV lacks an ID column.
2. **Subfolder Token Naming for ZIP Exports:**
   - Allow users to specify an export pattern like `{{Category}}/{{Cert_ID}}_{{Full_Name}}.pdf`. When generating the JSZip archive, automatically create folders for `Keynote Speaker/`, `Delegate/`, and `Panelist/` so the secretariat can distribute them effortlessly.
3. **Dual Export Mode (Individual ZIP vs. Print-Shop Master PDF):**
   - Provide a toggle in the export modal:
     - **Individual PDFs (`.zip`)**: For emailing or uploading to a portal.
     - **Single Merged PDF (`.pdf`)**: A single 250-page PDF document formatted with bleed marks for physical offset printing.