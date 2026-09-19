/**
 * CertiForge — High-Resolution Vector Assets & Signatures
 * Self-contained SVG Data URIs for Indian Medical, Academic, CME, and Tech Templates
 */

function svgToDataUri(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const ASSETS = {
  // 1. Haematology & Medical Society Crest (matches pp1.png left logo)
  medicalSocietyLogo: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <rect x="6" y="6" width="108" height="108" rx="16" fill="#8B1D1D" stroke="#D4AF37" stroke-width="2.5"/>
      <rect x="11" y="11" width="98" height="98" rx="12" fill="#701212" stroke="#B8860B" stroke-width="1"/>
      <circle cx="60" cy="56" r="38" fill="#FBF8F3" stroke="#D4AF37" stroke-width="2"/>
      <circle cx="60" cy="56" r="34" fill="#8B1D1D"/>
      <!-- Stylized Blood Droplet -->
      <path d="M 60 28 C 60 28, 41 52, 41 64 C 41 74.5, 49.5 83, 60 83 C 70.5 83, 79 74.5, 79 64 C 79 52, 60 28, 60 28 Z" fill="#E62E2E" stroke="#FFFFFF" stroke-width="1.5"/>
      <!-- Specular Highlight -->
      <path d="M 48 57 C 46 62, 48 72, 54 75" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.9"/>
      <!-- Foundation Year Banner -->
      <rect x="34" y="95" width="52" height="14" rx="3" fill="#1E293B" stroke="#D4AF37" stroke-width="1"/>
      <text x="60" y="105.5" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="8.5" font-weight="700" fill="#FEF08A">ESTD 1989</text>
    </svg>
  `),

  // 2. Medical College & Hospital Crest (matches pp1.png right logo - MAMC Delhi style)
  medicalCollegeCrest: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <path d="M 22 22 L 98 22 C 98 68, 60 102, 60 102 C 60 102, 22 68, 22 22 Z" fill="#0E2A54" stroke="#D4AF37" stroke-width="2.5"/>
      <path d="M 27 26 L 93 26 C 93 65, 60 95, 60 95 C 60 95, 27 65, 27 26 Z" fill="#15376C"/>
      <!-- Caduceus & Torch of Knowledge -->
      <path d="M 60 30 C 53 40, 67 44, 60 54 C 53 46, 67 36, 60 30 Z" fill="#EF4444"/>
      <rect x="58" y="52" width="4" height="32" rx="2" fill="#D4AF37"/>
      <!-- Symmetrical Wings -->
      <path d="M 60 48 C 45 42, 35 34, 30 46 C 36 50, 48 52, 60 52 C 72 52, 84 50, 90 46 C 85 34, 75 42, 60 48 Z" fill="#E2E8F0" opacity="0.9"/>
      <!-- Laurel Wreath Leaves -->
      <path d="M 38 65 Q 48 76 60 84 Q 72 76 82 65" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round"/>
      <!-- Lower Scroll / City Banner -->
      <path d="M 18 103 L 102 103 L 95 116 L 25 116 Z" fill="#8B1D1D" stroke="#D4AF37" stroke-width="1.2"/>
      <text x="60" y="112.5" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="8" font-weight="700" fill="#FFFFFF" letter-spacing="0.5">NEW DELHI</text>
    </svg>
  `),

  // 3. Indian University & Institute Seal (IIT / NIT / Central University style)
  universitySeal: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <circle cx="60" cy="60" r="54" fill="#0F172A" stroke="#B45309" stroke-width="3"/>
      <circle cx="60" cy="60" r="48" fill="none" stroke="#FDE68A" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle cx="60" cy="60" r="42" fill="#1E293B" stroke="#B45309" stroke-width="1"/>
      <!-- Open Book of Knowledge -->
      <path d="M 38 64 C 48 60, 58 63, 60 68 C 62 63, 72 60, 82 64 L 82 78 C 72 74, 62 77, 60 82 C 58 77, 48 74, 38 78 Z" fill="#F8FAFC" stroke="#B45309" stroke-width="1.2"/>
      <!-- Radiating Golden Rays / Rising Sun -->
      <path d="M 60 48 L 60 38 M 52 50 L 44 42 M 68 50 L 76 42 M 46 56 L 37 53 M 74 56 L 83 53" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
      <circle cx="60" cy="54" r="7" fill="#F59E0B"/>
      <!-- Motto Ribbon -->
      <text x="60" y="100" text-anchor="middle" font-family="Georgia, serif" font-size="7" font-weight="700" fill="#FDE68A" letter-spacing="1">VIDYA • SEVA • GYANA</text>
    </svg>
  `),

  // 4. State Medical Council CME Crest
  cmeCouncilCrest: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <circle cx="60" cy="60" r="54" fill="#14532D" stroke="#CA8A04" stroke-width="3"/>
      <circle cx="60" cy="60" r="46" fill="#166534" stroke="#FEF08A" stroke-width="1.5"/>
      <!-- Staff of Asclepius with coiled serpent -->
      <rect x="58.5" y="24" width="3" height="72" rx="1.5" fill="#FEF08A"/>
      <path d="M 60 28 C 68 34, 52 42, 60 50 C 68 58, 52 66, 60 74 C 68 82, 55 88, 60 92" fill="none" stroke="#CA8A04" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="24" r="5" fill="#FEF08A"/>
      <!-- CME Text Arc -->
      <text x="60" y="104" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" fill="#FEF08A" letter-spacing="0.5">CME ACCREDITED</text>
    </svg>
  `),

  // 5. Tech Chapter / IEEE Student Branch Crest
  techSymposiumLogo: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <polygon points="60,8 108,34 108,86 60,112 12,86 12,34" fill="#1E3A8A" stroke="#38BDF8" stroke-width="3"/>
      <polygon points="60,16 100,38 100,82 60,104 20,82 20,38" fill="#0F172A" stroke="#F59E0B" stroke-width="1.5"/>
      <!-- Integrated Microchip Node -->
      <rect x="46" y="46" width="28" height="28" rx="4" fill="#1E40AF" stroke="#38BDF8" stroke-width="2"/>
      <circle cx="60" cy="60" r="6" fill="#F59E0B"/>
      <!-- Pin Traces -->
      <line x1="36" y1="52" x2="46" y2="52" stroke="#38BDF8" stroke-width="2"/>
      <line x1="36" y1="68" x2="46" y2="68" stroke="#38BDF8" stroke-width="2"/>
      <line x1="74" y1="52" x2="84" y2="52" stroke="#38BDF8" stroke-width="2"/>
      <line x1="74" y1="68" x2="84" y2="68" stroke="#38BDF8" stroke-width="2"/>
      <line x1="52" y1="36" x2="52" y2="46" stroke="#38BDF8" stroke-width="2"/>
      <line x1="68" y1="36" x2="68" y2="46" stroke="#38BDF8" stroke-width="2"/>
      <line x1="52" y1="74" x2="52" y2="84" stroke="#38BDF8" stroke-width="2"/>
      <line x1="68" y1="74" x2="68" y2="84" stroke="#38BDF8" stroke-width="2"/>
      <text x="60" y="98" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" fill="#38BDF8" letter-spacing="1">TECH CHAPTER</text>
    </svg>
  `),

  // 6. Signatures (Vector Calligraphy curves matching official conference documents)
  // Signatory 1: Dr. Nita Khurana (Patron)
  sigKhurana: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
      <path d="M 12 42 Q 22 12 28 40 Q 32 18 38 38 Q 44 26 48 38 Q 54 28 62 36 Q 74 34 85 36 M 34 26 L 82 26 M 88 38 Q 98 16 108 36 Q 116 28 126 36 Q 134 32 144 38 Q 148 24 154 40" 
            fill="none" stroke="#111827" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 8 46 Q 45 42 152 44" fill="none" stroke="#111827" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
    </svg>
  `),

  // Signatory 2: Dr. JM Khunger (President)
  sigKhunger: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
      <path d="M 15 44 Q 24 10 32 38 Q 38 18 45 36 Q 50 22 58 36 Q 64 28 72 38 M 22 28 L 76 28 Q 88 36 98 22 Q 106 38 116 28 Q 124 38 135 30 Q 142 36 150 28" 
            fill="none" stroke="#111827" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 10 48 Q 65 43 148 46" fill="none" stroke="#111827" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>
    </svg>
  `),

  // Signatory 3: Dr. Sabina Langer (Secretary)
  sigLanger: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
      <path d="M 16 38 C 22 18, 30 14, 34 38 C 38 22, 46 20, 50 36 C 56 26, 62 26, 68 36 M 74 38 C 82 12, 90 10, 94 36 C 100 24, 108 24, 114 36 C 120 28, 128 30, 134 36 C 140 24, 148 28, 152 38" 
            fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 14 44 Q 70 41 150 43" fill="none" stroke="#111827" stroke-width="1.1" stroke-linecap="round" opacity="0.5"/>
    </svg>
  `),

  // Signatory 4: Dr. Sarika Singh (Organising Secretary)
  sigSingh: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
      <path d="M 18 42 C 24 16, 32 14, 36 38 C 42 22, 50 20, 56 36 C 64 24, 72 26, 80 36 M 86 36 C 96 14, 106 14, 112 36 C 118 24, 126 26, 134 36 C 142 20, 150 24, 154 38" 
            fill="none" stroke="#111827" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 32 46 C 60 48, 110 46, 148 45" fill="none" stroke="#111827" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>
    </svg>
  `),

  // Convener / Dean signature
  sigConvener: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
      <path d="M 20 40 Q 32 12 42 38 Q 50 20 58 36 Q 66 26 78 38 Q 92 16 102 36 Q 112 24 124 38 Q 136 28 148 38" 
            fill="none" stroke="#0F172A" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 16 45 Q 60 42 145 44" fill="none" stroke="#0F172A" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
    </svg>
  `),

  // Principal / Director signature
  sigPrincipal: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60" width="160" height="60">
      <path d="M 18 36 Q 30 10 38 34 Q 48 16 56 36 Q 68 18 76 34 Q 88 22 98 36 Q 110 14 122 36 Q 134 26 148 36" 
            fill="none" stroke="#0F172A" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 12 42 Q 65 40 152 41" fill="none" stroke="#0F172A" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>
    </svg>
  `)
};
