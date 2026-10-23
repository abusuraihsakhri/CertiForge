/**
 * CertiForge 100 procedural certificate presets.
 *
 * Zero external assets: every layout is generated from palette + geometry into
 * the app's native element schema (rect / polygon / circle / text / qr), so the
 * interactive DOM renderer, the SVG/PDF pipeline, project files and the editor
 * all work without any new raster artwork.
 *
 * 10 architectural archetypes × 10 curated palettes (see PRESET_CATEGORIES).
 */

const CIN = "Cinzel";
const PLA = "Playfair Display";
const COR = "Cormorant Garamond";
const MON = "JetBrains Mono";
const SAN = "Arial";

const PAGE = Object.freeze({ width: 1123, height: 794, orientation: "landscape" });

export const PRESET_CATEGORIES = [
  "Academic", "Medical", "Tech", "Corporate", "Luxury",
  "Bauhaus", "Creative", "Eco", "Heritage", "Competition"
];

const ARCHETYPE_LABELS = {
  classic_double: "ceremonial double frame",
  academic_pillars: "classical pillars",
  swiss_asymmetric: "Swiss grid",
  tech_cyber: "tech circuit frame",
  diploma_filigree: "corner filigree",
  executive_ribbon: "executive ribbon",
  minimal_nordic: "minimal hairline frame",
  guilloche_security: "guilloché security border",
  modern_diagonal: "modern diagonal geometry",
  award_medallion: "medallion frame"
};

/* ==========================================================================
   Preset catalog — transcribed from the 100-template blueprint and normalized
   to plain family names the element sanitizer accepts.
   ========================================================================== */

export const PRESET_TEMPLATES = [
  // Academic
  { id: "tpl-001", name: "Oxford Imperial Navy", category: "Academic", archetype: "classic_double", bg: "#ffffff", primary: "#0f172a", secondary: "#b45309", accent: "#fef3c7", titleFont: CIN, bodyFont: COR, headerText: "CERTIFICATE OF ACCREDITATION", subText: "This is proudly presented to", seal: "gold-star", nameY: 390, maxWidth: 680 },
  { id: "tpl-002", name: "Cambridge Crimson Charter", category: "Academic", archetype: "academic_pillars", bg: "#fffdf9", primary: "#7f1d1d", secondary: "#d97706", accent: "#fef2f2", titleFont: PLA, bodyFont: COR, headerText: "DIPLOMA OF DISTINCTION", subText: "By authority of the Academic Senate, awarded to", seal: "wax-red", nameY: 395, maxWidth: 640 },
  { id: "tpl-003", name: "Sorbonne Parchment Classic", category: "Academic", archetype: "diploma_filigree", bg: "#faf6ee", primary: "#1e293b", secondary: "#92400e", accent: "#f5ebe0", titleFont: CIN, bodyFont: PLA, headerText: "FELLOWSHIP CERTIFICATE", subText: "In recognition of scholarly excellence, conferred upon", seal: "gold-star", nameY: 385, maxWidth: 660 },
  { id: "tpl-004", name: "Heidelberg Senate Gold", category: "Academic", archetype: "guilloche_security", bg: "#ffffff", primary: "#1c1917", secondary: "#a16207", accent: "#fefce8", titleFont: CIN, bodyFont: COR, headerText: "HONORARY CONVOCATION AWARD", subText: "Presented with high academic commendation to", seal: "rosette", nameY: 390, maxWidth: 680 },
  { id: "tpl-005", name: "Yale Cobalt Scholastic", category: "Academic", archetype: "classic_double", bg: "#f8fafc", primary: "#1e3a8a", secondary: "#64748b", accent: "#eff6ff", titleFont: PLA, bodyFont: SAN, headerText: "CERTIFICATE OF MERIT", subText: "Awarded for outstanding academic achievement to", seal: "navy-crest", nameY: 390, maxWidth: 700 },
  { id: "tpl-006", name: "Princeton Amber Laureate", category: "Academic", archetype: "award_medallion", bg: "#fffbeb", primary: "#0f172a", secondary: "#ea580c", accent: "#ffedd5", titleFont: CIN, bodyFont: COR, headerText: "LAUREATE OF EXCELLENCE", subText: "This scroll of honor is bestowed upon", seal: "gold-star", nameY: 410, maxWidth: 660 },
  { id: "tpl-007", name: "Dartmouth Evergreen Thesis", category: "Academic", archetype: "diploma_filigree", bg: "#f9fbf9", primary: "#064e3b", secondary: "#b45309", accent: "#ecfdf5", titleFont: CIN, bodyFont: COR, headerText: "DOCTORAL COLLOQUIUM", subText: "Certifying successful research presentation by", seal: "emerald-crest", nameY: 390, maxWidth: 660 },
  { id: "tpl-008", name: "Bologna Archival Ivory", category: "Academic", archetype: "academic_pillars", bg: "#fcfaf2", primary: "#27272a", secondary: "#78350f", accent: "#f5f5f4", titleFont: CIN, bodyFont: COR, headerText: "MAGNA CUM LAUDE", subText: "With the rights and privileges appertaining thereto", seal: "wax-red", nameY: 395, maxWidth: 620 },
  { id: "tpl-009", name: "ETH Zurich Precision", category: "Academic", archetype: "swiss_asymmetric", bg: "#ffffff", primary: "#090d16", secondary: "#2563eb", accent: "#eff6ff", titleFont: SAN, bodyFont: SAN, headerText: "RESEARCH SYMPOSIUM", subText: "Confirmed scientific contribution by", seal: "none", nameY: 380, maxWidth: 620 },
  { id: "tpl-010", name: "Kyoto Imperial Plum", category: "Academic", archetype: "minimal_nordic", bg: "#fdfaff", primary: "#3b0764", secondary: "#c084fc", accent: "#f3e8ff", titleFont: PLA, bodyFont: COR, headerText: "SCHOLARLY COMMENDATION", subText: "Presented in recognition of distinction to", seal: "rosette", nameY: 390, maxWidth: 700 },

  // Medical
  { id: "tpl-011", name: "CME Royal Clinical Blue", category: "Medical", archetype: "executive_ribbon", bg: "#ffffff", primary: "#0c4a6e", secondary: "#0284c7", accent: "#e0f2fe", titleFont: CIN, bodyFont: SAN, headerText: "CONTINUING MEDICAL EDUCATION", subText: "Certifying accredited clinical participation by", seal: "caduceus-blue", nameY: 395, maxWidth: 680 },
  { id: "tpl-012", name: "Surgical Cross Emerald", category: "Medical", archetype: "classic_double", bg: "#ffffff", primary: "#065f46", secondary: "#10b981", accent: "#d1fae5", titleFont: PLA, bodyFont: SAN, headerText: "SURGICAL SKILL WORKSHOP", subText: "This credential of clinical competency is awarded to", seal: "emerald-crest", nameY: 390, maxWidth: 680 },
  { id: "tpl-013", name: "Cardiology Summit Crimson", category: "Medical", archetype: "modern_diagonal", bg: "#ffffff", primary: "#881337", secondary: "#e11d48", accent: "#ffe4e6", titleFont: SAN, bodyFont: SAN, headerText: "CARDIOVASCULAR CONGRESS", subText: "Presented for active scientific fellowship to", seal: "wax-red", nameY: 390, maxWidth: 660 },
  { id: "tpl-014", name: "Geneva Health Directorate", category: "Medical", archetype: "swiss_asymmetric", bg: "#f8fafc", primary: "#0f172a", secondary: "#0ea5e9", accent: "#e0f2fe", titleFont: SAN, bodyFont: SAN, headerText: "GLOBAL HEALTH FELLOWSHIP", subText: "Accredited medical board certification for", seal: "navy-crest", nameY: 380, maxWidth: 620 },
  { id: "tpl-015", name: "Osler Grand Rounds Gold", category: "Medical", archetype: "diploma_filigree", bg: "#fffdf7", primary: "#1e293b", secondary: "#ca8a04", accent: "#fef9c3", titleFont: CIN, bodyFont: COR, headerText: "GRAND ROUNDS KEYNOTE", subText: "In appreciation of clinical teaching excellence by", seal: "gold-star", nameY: 390, maxWidth: 660 },
  { id: "tpl-016", name: "Neurology Board Teal", category: "Medical", archetype: "guilloche_security", bg: "#ffffff", primary: "#134e4a", secondary: "#14b8a6", accent: "#ccfbf1", titleFont: CIN, bodyFont: SAN, headerText: "BOARD OF NEUROLOGICAL SCIENCES", subText: "Verified specialist credit certificate issued to", seal: "rosette", nameY: 390, maxWidth: 680 },
  { id: "tpl-017", name: "Pediatric Care Soft Indigo", category: "Medical", archetype: "award_medallion", bg: "#f8faff", primary: "#312e81", secondary: "#6366f1", accent: "#e0e7ff", titleFont: PLA, bodyFont: SAN, headerText: "PEDIATRIC SYMPOSIUM", subText: "Gratefully acknowledging the participation of", seal: "navy-crest", nameY: 410, maxWidth: 660 },
  { id: "tpl-018", name: "Oncology Research Slate", category: "Medical", archetype: "minimal_nordic", bg: "#ffffff", primary: "#1e293b", secondary: "#3b82f6", accent: "#dbeafe", titleFont: SAN, bodyFont: SAN, headerText: "ONCOLOGY RESEARCH CONSORTIUM", subText: "Awarded for translational research excellence to", seal: "none", nameY: 390, maxWidth: 700 },
  { id: "tpl-019", name: "Dental & Maxillofacial Silver", category: "Medical", archetype: "classic_double", bg: "#fafafa", primary: "#18181b", secondary: "#71717a", accent: "#f4f4f5", titleFont: CIN, bodyFont: SAN, headerText: "ACADEMY OF DENTAL IMPLANTOLOGY", subText: "Hands-on masterclass completed by", seal: "rosette", nameY: 390, maxWidth: 680 },
  { id: "tpl-020", name: "Radiology Darkroom Cyan", category: "Medical", archetype: "tech_cyber", bg: "#090d16", primary: "#f8fafc", secondary: "#38bdf8", accent: "#0c4a6e", titleFont: SAN, bodyFont: SAN, headerText: "DIAGNOSTIC IMAGING SUMMIT", subText: "Advanced AI & Radiological credential awarded to", seal: "caduceus-blue", nameY: 390, maxWidth: 680 },

  // Tech
  { id: "tpl-021", name: "Cyberpunk Neon Matrix", category: "Tech", archetype: "tech_cyber", bg: "#090a0f", primary: "#f8fafc", secondary: "#10b981", accent: "#064e3b", titleFont: MON, bodyFont: SAN, headerText: "HACKATHON GRAND WINNER", subText: "// Proof of build & deployment awarded to", seal: "hex-badge", nameY: 390, maxWidth: 680 },
  { id: "tpl-022", name: "Neural Network Violet Dark", category: "Tech", archetype: "tech_cyber", bg: "#0f0720", primary: "#ffffff", secondary: "#a855f7", accent: "#3b0764", titleFont: SAN, bodyFont: MON, headerText: "GENERATIVE AI ENGINEERING", subText: "Verified model architecture & training credential for", seal: "hex-badge", nameY: 390, maxWidth: 680 },
  { id: "tpl-023", name: "Cloud Native Kubernetes Blue", category: "Tech", archetype: "modern_diagonal", bg: "#f8fafc", primary: "#0f172a", secondary: "#2563eb", accent: "#dbeafe", titleFont: SAN, bodyFont: SAN, headerText: "CLOUD ARCHITECT CERTIFIED", subText: "For mastering distributed infrastructure, awarded to", seal: "navy-crest", nameY: 390, maxWidth: 660 },
  { id: "tpl-024", name: "Open Source Contributor Terminal", category: "Tech", archetype: "swiss_asymmetric", bg: "#111827", primary: "#f9fafb", secondary: "#f59e0b", accent: "#1f2937", titleFont: MON, bodyFont: SAN, headerText: "OPEN SOURCE MAINTAINER", subText: "git commit --signoff verified for contributor", seal: "none", nameY: 380, maxWidth: 620 },
  { id: "tpl-025", name: "Quantum Computing Obsidian", category: "Tech", archetype: "guilloche_security", bg: "#090d16", primary: "#e2e8f0", secondary: "#06b6d4", accent: "#164e63", titleFont: CIN, bodyFont: MON, headerText: "QUANTUM ALGORITHMS LAB", subText: "Fellowship in quantum information science awarded to", seal: "rosette", nameY: 390, maxWidth: 680 },
  { id: "tpl-026", name: "DevOps Pipeline Orange", category: "Tech", archetype: "executive_ribbon", bg: "#ffffff", primary: "#18181b", secondary: "#f97316", accent: "#ffedd5", titleFont: SAN, bodyFont: SAN, headerText: "SITE RELIABILITY ENGINEERING", subText: "Production readiness & zero-downtime award for", seal: "hex-badge", nameY: 395, maxWidth: 680 },
  { id: "tpl-027", name: "Zero-Knowledge Infosec Red", category: "Tech", archetype: "tech_cyber", bg: "#0a0a0a", primary: "#fafafa", secondary: "#ef4444", accent: "#450a0a", titleFont: MON, bodyFont: SAN, headerText: "OFFENSIVE SECURITY CTF", subText: "Penetration testing & exploit mastery demonstrated by", seal: "hex-badge", nameY: 390, maxWidth: 680 },
  { id: "tpl-028", name: "Silicon Valley Founder Minimal", category: "Tech", archetype: "minimal_nordic", bg: "#ffffff", primary: "#09090b", secondary: "#18181b", accent: "#f4f4f5", titleFont: SAN, bodyFont: SAN, headerText: "DEMO DAY COHORT W26", subText: "Successfully graduated from the accelerator cohort", seal: "none", nameY: 390, maxWidth: 700 },
  { id: "tpl-029", name: "Data Science Prism", category: "Tech", archetype: "modern_diagonal", bg: "#ffffff", primary: "#1e1b4b", secondary: "#4f46e5", accent: "#e0e7ff", titleFont: SAN, bodyFont: SAN, headerText: "APPLIED MACHINE LEARNING", subText: "Awarded for high-dimensional statistical modeling to", seal: "hex-badge", nameY: 390, maxWidth: 660 },
  { id: "tpl-030", name: "Web3 & Cryptography Gold", category: "Tech", archetype: "tech_cyber", bg: "#0c0a09", primary: "#fafaf9", secondary: "#eab308", accent: "#422006", titleFont: MON, bodyFont: SAN, headerText: "ZERO-KNOWLEDGE PROOFS", subText: "Cryptographic protocol engineering verified for", seal: "gold-star", nameY: 390, maxWidth: 680 },

  // Corporate
  { id: "tpl-031", name: "McKinsey Midnight Executive", category: "Corporate", archetype: "executive_ribbon", bg: "#ffffff", primary: "#0f172a", secondary: "#3b82f6", accent: "#f1f5f9", titleFont: PLA, bodyFont: SAN, headerText: "EXECUTIVE LEADERSHIP PROGRAM", subText: "For strategic vision and organizational impact by", seal: "navy-crest", nameY: 395, maxWidth: 680 },
  { id: "tpl-032", name: "Boardroom Platinum & Slate", category: "Corporate", archetype: "classic_double", bg: "#f8fafc", primary: "#1e293b", secondary: "#64748b", accent: "#e2e8f0", titleFont: CIN, bodyFont: SAN, headerText: "CHAIRMAN'S AWARD FOR EXCELLENCE", subText: "Presented with the highest corporate distinction to", seal: "rosette", nameY: 390, maxWidth: 680 },
  { id: "tpl-033", name: "FinTech Sovereign Emerald", category: "Corporate", archetype: "swiss_asymmetric", bg: "#ffffff", primary: "#022c22", secondary: "#059669", accent: "#ecfdf5", titleFont: SAN, bodyFont: SAN, headerText: "QUANTITATIVE FINANCE SUMMIT", subText: "Institutional leadership & compliance certification for", seal: "emerald-crest", nameY: 380, maxWidth: 620 },
  { id: "tpl-034", name: "Davos Global Forum", category: "Corporate", archetype: "minimal_nordic", bg: "#ffffff", primary: "#0f172a", secondary: "#0284c7", accent: "#f0f9ff", titleFont: SAN, bodyFont: SAN, headerText: "GLOBAL ECONOMIC DIALOGUE", subText: "Acknowledging the distinguished keynote address by", seal: "none", nameY: 390, maxWidth: 700 },
  { id: "tpl-035", name: "Six Sigma Black Belt", category: "Corporate", archetype: "modern_diagonal", bg: "#ffffff", primary: "#18181b", secondary: "#dc2626", accent: "#fef2f2", titleFont: SAN, bodyFont: SAN, headerText: "LEAN SIX SIGMA MASTER", subText: "Operational excellence and quality management by", seal: "wax-red", nameY: 390, maxWidth: 660 },
  { id: "tpl-036", name: "Venture Capital Partner Gold", category: "Corporate", archetype: "academic_pillars", bg: "#fffdf9", primary: "#1c1917", secondary: "#d97706", accent: "#fef3c7", titleFont: PLA, bodyFont: COR, headerText: "LIMITED PARTNER ANNUAL SUMMIT", subText: "In recognition of enduring partnership with", seal: "gold-star", nameY: 395, maxWidth: 640 },
  { id: "tpl-037", name: "Deloitte Forest & Lime", category: "Corporate", archetype: "swiss_asymmetric", bg: "#ffffff", primary: "#111827", secondary: "#65a30d", accent: "#f7fee7", titleFont: SAN, bodyFont: SAN, headerText: "ENTERPRISE TRANSFORMATION", subText: "Advisory mastery & client delivery demonstrated by", seal: "none", nameY: 380, maxWidth: 620 },
  { id: "tpl-038", name: "Legal Counsel Burgundy", category: "Corporate", archetype: "classic_double", bg: "#fdfbfb", primary: "#450a0a", secondary: "#991b1b", accent: "#fef2f2", titleFont: CIN, bodyFont: COR, headerText: "INTERNATIONAL ARBITRATION BAR", subText: "Continuing legal education credit conferred upon", seal: "wax-red", nameY: 390, maxWidth: 680 },
  { id: "tpl-039", name: "Supply Chain Logistics Cobalt", category: "Corporate", archetype: "executive_ribbon", bg: "#ffffff", primary: "#1e3a8a", secondary: "#3b82f6", accent: "#eff6ff", titleFont: SAN, bodyFont: SAN, headerText: "GLOBAL SUPPLY CHAIN EXCELLENCE", subText: "Awarded for operational resilience to", seal: "navy-crest", nameY: 395, maxWidth: 680 },
  { id: "tpl-040", name: "HR People First Coral", category: "Corporate", archetype: "award_medallion", bg: "#fffafa", primary: "#1f2937", secondary: "#f43f5e", accent: "#ffe4e6", titleFont: PLA, bodyFont: SAN, headerText: "CULTURE & LEADERSHIP AWARD", subText: "Celebrating extraordinary mentorship and team spirit by", seal: "gold-star", nameY: 410, maxWidth: 660 },

  // Luxury
  { id: "tpl-041", name: "Obsidian & 24K Gold Leaf", category: "Luxury", archetype: "diploma_filigree", bg: "#090a0f", primary: "#fef08a", secondary: "#eab308", accent: "#1e1b18", titleFont: CIN, bodyFont: COR, headerText: "GRAND GALA OF EXCELLENCE", subText: "This supreme accolade of distinction is presented to", seal: "gold-star", nameY: 390, maxWidth: 660 },
  { id: "tpl-042", name: "Midnight Velvet & Champagne", category: "Luxury", archetype: "classic_double", bg: "#0f172a", primary: "#f8fafc", secondary: "#fbbf24", accent: "#1e293b", titleFont: PLA, bodyFont: COR, headerText: "LIFETIME ACHIEVEMENT AWARD", subText: "With profound gratitude, the board honors", seal: "gold-star", nameY: 390, maxWidth: 680 },
  { id: "tpl-043", name: "Royal Emerald Night", category: "Luxury", archetype: "academic_pillars", bg: "#022c22", primary: "#ecfdf5", secondary: "#f59e0b", accent: "#064e3b", titleFont: CIN, bodyFont: COR, headerText: "SOVEREIGN ORDER OF MERIT", subText: "Bestowed in recognition of exemplary service upon", seal: "gold-star", nameY: 395, maxWidth: 640 },
  { id: "tpl-044", name: "Imperial Crimson & Gold Dark", category: "Luxury", archetype: "diploma_filigree", bg: "#2a0808", primary: "#fef2f2", secondary: "#f59e0b", accent: "#450a0a", titleFont: CIN, bodyFont: PLA, headerText: "CHANCELLOR'S MEDAL OF HONOR", subText: "Conferred at the annual royal banquet upon", seal: "gold-star", nameY: 390, maxWidth: 660 },
  { id: "tpl-045", name: "Carbon & Rose Gold", category: "Luxury", archetype: "modern_diagonal", bg: "#18181b", primary: "#fafafa", secondary: "#fb7185", accent: "#27272a", titleFont: PLA, bodyFont: SAN, headerText: "VISIONARY DESIGN LAB", subText: "Presented for pioneering luxury craftsmanship to", seal: "rosette", nameY: 390, maxWidth: 660 },
  { id: "tpl-046", name: "Amethyst & Silver Filigree", category: "Luxury", archetype: "guilloche_security", bg: "#1e1b4b", primary: "#f8fafc", secondary: "#cbd5e1", accent: "#312e81", titleFont: CIN, bodyFont: COR, headerText: "PLATINUM JUBILEE FELLOW", subText: "Inducted into the circle of distinguished fellows", seal: "rosette", nameY: 390, maxWidth: 680 },
  { id: "tpl-047", name: "Art Deco Gatsby Gold", category: "Luxury", archetype: "academic_pillars", bg: "#111111", primary: "#fde047", secondary: "#ca8a04", accent: "#1f1f1f", titleFont: CIN, bodyFont: SAN, headerText: "CONCOURS D'ELEGANCE", subText: "First prize trophy certificate awarded to", seal: "gold-star", nameY: 395, maxWidth: 640 },
  { id: "tpl-048", name: "Espresso & Copper Reserve", category: "Luxury", archetype: "classic_double", bg: "#1c1917", primary: "#f5f5f4", secondary: "#ea580c", accent: "#292524", titleFont: PLA, bodyFont: COR, headerText: "MASTER SOMMELIER GUILD", subText: "Certified sensory & vintage mastery achieved by", seal: "gold-star", nameY: 390, maxWidth: 680 },
  { id: "tpl-049", name: "Deep Sapphire & Platinum", category: "Luxury", archetype: "award_medallion", bg: "#08142c", primary: "#ffffff", secondary: "#93c5fd", accent: "#1e3a8a", titleFont: CIN, bodyFont: COR, headerText: "STAR OF EXCELLENCE", subText: "Shining recognition of extraordinary dedication by", seal: "navy-crest", nameY: 410, maxWidth: 660 },
  { id: "tpl-050", name: "Titanium & Bronze Monolith", category: "Luxury", archetype: "minimal_nordic", bg: "#141417", primary: "#f4f4f5", secondary: "#d97706", accent: "#27272a", titleFont: SAN, bodyFont: SAN, headerText: "ARCHITECTURAL BIENNALE", subText: "Jury special mention awarded to principal architect", seal: "none", nameY: 390, maxWidth: 700 },

  // Bauhaus
  { id: "tpl-051", name: "Weimar Bauhaus Primary", category: "Bauhaus", archetype: "swiss_asymmetric", bg: "#faf8f5", primary: "#111111", secondary: "#dc2626", accent: "#fef08a", titleFont: SAN, bodyFont: SAN, headerText: "BAUHAUS DESIGN ARCHIVE", subText: "Form follows function — awarded to designer", seal: "none", nameY: 380, maxWidth: 620 },
  { id: "tpl-052", name: "Zurich International Typographic", category: "Bauhaus", archetype: "swiss_asymmetric", bg: "#ffffff", primary: "#000000", secondary: "#ff3300", accent: "#f4f4f5", titleFont: SAN, bodyFont: MON, headerText: "HELVETICA GRID SYMPOSIUM", subText: "01 // Typographic excellence demonstrated by", seal: "none", nameY: 380, maxWidth: 620 },
  { id: "tpl-053", name: "Nordic Birch & Charcoal", category: "Bauhaus", archetype: "minimal_nordic", bg: "#f9f8f6", primary: "#1c1917", secondary: "#57534e", accent: "#e7e5e4", titleFont: SAN, bodyFont: SAN, headerText: "SCANDINAVIAN DESIGN COUNCIL", subText: "Minimalist product sustainability award presented to", seal: "none", nameY: 390, maxWidth: 700 },
  { id: "tpl-054", name: "Brutalist Concrete & Acid", category: "Bauhaus", archetype: "swiss_asymmetric", bg: "#e5e5e5", primary: "#0a0a0a", secondary: "#4f46e5", accent: "#d4d4d4", titleFont: MON, bodyFont: MON, headerText: "MONOGRAPH EXHIBITION", subText: "ARCHIVE_ID_2026 // CONTRIBUTOR:", seal: "hex-badge", nameY: 380, maxWidth: 620 },
  { id: "tpl-055", name: "Milan Salone Terracotta", category: "Bauhaus", archetype: "modern_diagonal", bg: "#fffaf5", primary: "#292524", secondary: "#c2410c", accent: "#ffedd5", titleFont: PLA, bodyFont: SAN, headerText: "SALONE DEL MOBILE", subText: "Industrial & furniture design commendation for", seal: "rosette", nameY: 390, maxWidth: 660 },
  { id: "tpl-056", name: "Copenhagen Ultramarine", category: "Bauhaus", archetype: "minimal_nordic", bg: "#ffffff", primary: "#1e3a8a", secondary: "#1d4ed8", accent: "#dbeafe", titleFont: SAN, bodyFont: SAN, headerText: "URBAN MOBILITY LAB", subText: "Civic architecture fellowship completed by", seal: "none", nameY: 390, maxWidth: 700 },
  { id: "tpl-057", name: "Kyoto Tatami & Sumi Ink", category: "Bauhaus", archetype: "minimal_nordic", bg: "#f5f2eb", primary: "#171717", secondary: "#991b1b", accent: "#e5e0d5", titleFont: CIN, bodyFont: COR, headerText: "WABI-SABI AESTHETICS", subText: "Mastery of spatial harmony recognized in", seal: "wax-red", nameY: 390, maxWidth: 700 },
  { id: "tpl-058", name: "Rotterdam De Stijl Grid", category: "Bauhaus", archetype: "swiss_asymmetric", bg: "#ffffff", primary: "#0f172a", secondary: "#eab308", accent: "#eff6ff", titleFont: SAN, bodyFont: SAN, headerText: "DUTCH MODERNISM LECTURE", subText: "Presented to guest architectural critic", seal: "none", nameY: 380, maxWidth: 620 },
  { id: "tpl-059", name: "Berlin Werkbund Graphite", category: "Bauhaus", archetype: "executive_ribbon", bg: "#f4f4f5", primary: "#18181b", secondary: "#52525b", accent: "#e4e4e7", titleFont: SAN, bodyFont: MON, headerText: "INDUSTRIAL DESIGN FORUM", subText: "Engineering precision certificate awarded to", seal: "hex-badge", nameY: 395, maxWidth: 680 },
  { id: "tpl-060", name: "Oslo Fjord Minimal", category: "Bauhaus", archetype: "minimal_nordic", bg: "#f8fafc", primary: "#0f172a", secondary: "#0d9488", accent: "#ccfbf1", titleFont: SAN, bodyFont: SAN, headerText: "NORDIC INNOVATION SUMMIT", subText: "Presented for clean-tech systems design to", seal: "none", nameY: 390, maxWidth: 700 },

  // Creative
  { id: "tpl-061", name: "Cannes Golden Palm", category: "Creative", archetype: "award_medallion", bg: "#fffdf9", primary: "#1c1917", secondary: "#ca8a04", accent: "#fef9c3", titleFont: CIN, bodyFont: COR, headerText: "OFFICIAL FILM SELECTION", subText: "In recognition of cinematic direction by", seal: "gold-star", nameY: 410, maxWidth: 660 },
  { id: "tpl-062", name: "Venice Biennale Magenta", category: "Creative", archetype: "modern_diagonal", bg: "#fffbfd", primary: "#4a044e", secondary: "#db2777", accent: "#fce7f3", titleFont: PLA, bodyFont: COR, headerText: "CONTEMPORARY ART PAVILION", subText: "Curatorial excellence certificate presented to", seal: "rosette", nameY: 390, maxWidth: 660 },
  { id: "tpl-063", name: "Royal Conservatory Symphony", category: "Creative", archetype: "diploma_filigree", bg: "#fdfaf6", primary: "#27272a", secondary: "#b45309", accent: "#fef3c7", titleFont: CIN, bodyFont: COR, headerText: "CONSERVATORY OF MUSIC", subText: "Virtuoso recital performance diploma awarded to", seal: "gold-star", nameY: 390, maxWidth: 660 },
  { id: "tpl-064", name: "Pulitzer Literary Review", category: "Creative", archetype: "classic_double", bg: "#faf8f5", primary: "#1e293b", secondary: "#475569", accent: "#e2e8f0", titleFont: PLA, bodyFont: COR, headerText: "FELLOWSHIP IN LETTERS", subText: "For distinguished prose and literary criticism by", seal: "wax-red", nameY: 390, maxWidth: 680 },
  { id: "tpl-065", name: "Broadway Stage Spotlight", category: "Creative", archetype: "executive_ribbon", bg: "#18181b", primary: "#fef08a", secondary: "#ef4444", accent: "#27272a", titleFont: CIN, bodyFont: SAN, headerText: "THEATRICAL ARTS GUILD", subText: "Outstanding dramatic ensemble performance by", seal: "gold-star", nameY: 395, maxWidth: 680 },
  { id: "tpl-066", name: "Aperture Photography Silver", category: "Creative", archetype: "minimal_nordic", bg: "#ffffff", primary: "#171717", secondary: "#737373", accent: "#f5f5f5", titleFont: SAN, bodyFont: COR, headerText: "MONOGRAPH PHOTOGRAPHY PRIZE", subText: "Exhibited in the annual visual storytelling gallery", seal: "none", nameY: 390, maxWidth: 700 },
  { id: "tpl-067", name: "Culinary Michelin Star", category: "Creative", archetype: "award_medallion", bg: "#ffffff", primary: "#991b1b", secondary: "#dc2626", accent: "#fef2f2", titleFont: CIN, bodyFont: COR, headerText: "GASTRONOMY MASTERCLASS", subText: "Awarded for culinary artistry and technique to", seal: "wax-red", nameY: 410, maxWidth: 660 },
  { id: "tpl-068", name: "Haute Couture Paris", category: "Creative", archetype: "minimal_nordic", bg: "#fffcfc", primary: "#09090b", secondary: "#be185d", accent: "#fce7f3", titleFont: PLA, bodyFont: COR, headerText: "ATELIER DE HAUTE COUTURE", subText: "Diplôme de création textile décerné à", seal: "rosette", nameY: 390, maxWidth: 700 },
  { id: "tpl-069", name: "Calligraphy & Illumination", category: "Creative", archetype: "diploma_filigree", bg: "#fcf8f2", primary: "#451a03", secondary: "#d97706", accent: "#fde68a", titleFont: CIN, bodyFont: COR, headerText: "SOCIETY OF SCRIBES", subText: "In recognition of master penmanship by", seal: "wax-red", nameY: 390, maxWidth: 660 },
  { id: "tpl-070", name: "Animation & VFX Studio", category: "Creative", archetype: "tech_cyber", bg: "#0f172a", primary: "#f8fafc", secondary: "#f43f5e", accent: "#1e293b", titleFont: SAN, bodyFont: SAN, headerText: "DIGITAL ARTS & VFX FESTIVAL", subText: "Best real-time rendering & character rigging by", seal: "hex-badge", nameY: 390, maxWidth: 680 },

  // Eco
  { id: "tpl-071", name: "Kyoto Protocol Forest", category: "Eco", archetype: "classic_double", bg: "#f7fee7", primary: "#14532d", secondary: "#16a34a", accent: "#dcfce7", titleFont: PLA, bodyFont: COR, headerText: "CLIMATE ACTION FELLOWSHIP", subText: "For leadership in carbon neutrality, presented to", seal: "emerald-crest", nameY: 390, maxWidth: 680 },
  { id: "tpl-072", name: "Botanical Kew Gardens", category: "Eco", archetype: "diploma_filigree", bg: "#fafaf5", primary: "#1b4332", secondary: "#52b788", accent: "#d8f3dc", titleFont: CIN, bodyFont: COR, headerText: "ROYAL BOTANICAL SOCIETY", subText: "Certifying biodiversity conservation research by", seal: "emerald-crest", nameY: 390, maxWidth: 660 },
  { id: "tpl-073", name: "Oceanic Marine Conservation", category: "Eco", archetype: "modern_diagonal", bg: "#f0fdfa", primary: "#134e4a", secondary: "#0d9488", accent: "#99f6e4", titleFont: SAN, bodyFont: SAN, headerText: "MARINE ECOSYSTEM INITIATIVE", subText: "Presented for coral & ocean preservation to", seal: "rosette", nameY: 390, maxWidth: 660 },
  { id: "tpl-074", name: "Solar Horizon Amber", category: "Eco", archetype: "award_medallion", bg: "#fffbeb", primary: "#78350f", secondary: "#f59e0b", accent: "#fde68a", titleFont: CIN, bodyFont: SAN, headerText: "RENEWABLE ENERGY ALLIANCE", subText: "Clean grid transition engineering award for", seal: "gold-star", nameY: 410, maxWidth: 660 },
  { id: "tpl-075", name: "Circular Economy Sage", category: "Eco", archetype: "minimal_nordic", bg: "#f4f7f4", primary: "#1c2e24", secondary: "#4d7c0f", accent: "#ecfccb", titleFont: SAN, bodyFont: SAN, headerText: "ZERO-WASTE DESIGN CHALLENGE", subText: "Regenerative materials innovation by", seal: "none", nameY: 390, maxWidth: 700 },
  { id: "tpl-076", name: "Agritech Permaculture Earth", category: "Eco", archetype: "academic_pillars", bg: "#fbf9f5", primary: "#422006", secondary: "#65a30d", accent: "#fef3c7", titleFont: PLA, bodyFont: COR, headerText: "SUSTAINABLE AGRICULTURE", subText: "Soil health & food security research presented by", seal: "emerald-crest", nameY: 395, maxWidth: 640 },
  { id: "tpl-077", name: "Alpine Glacier Pure", category: "Eco", archetype: "swiss_asymmetric", bg: "#f8fafc", primary: "#0f172a", secondary: "#38bdf8", accent: "#e0f2fe", titleFont: SAN, bodyFont: SAN, headerText: "CRYOSPHERE & HYDROLOGY", subText: "Glaciological field expedition member", seal: "none", nameY: 380, maxWidth: 620 },
  { id: "tpl-078", name: "LEED Green Building", category: "Eco", archetype: "executive_ribbon", bg: "#ffffff", primary: "#064e3b", secondary: "#10b981", accent: "#ecfdf5", titleFont: SAN, bodyFont: SAN, headerText: "NET-ZERO ARCHITECTURE", subText: "High-performance sustainable building certification for", seal: "emerald-crest", nameY: 395, maxWidth: 680 },
  { id: "tpl-079", name: "Wildlife Sanctuary Olive", category: "Eco", archetype: "classic_double", bg: "#fafaf9", primary: "#365314", secondary: "#84cc16", accent: "#f7fee7", titleFont: CIN, bodyFont: COR, headerText: "WILDLIFE RANGER COMMENDATION", subText: "In grateful recognition of habitat protection by", seal: "emerald-crest", nameY: 390, maxWidth: 680 },
  { id: "tpl-080", name: "ESG Impact Governance", category: "Eco", archetype: "guilloche_security", bg: "#ffffff", primary: "#065f46", secondary: "#059669", accent: "#d1fae5", titleFont: CIN, bodyFont: SAN, headerText: "SUSTAINABLE FINANCE & ESG", subText: "Verified green bond & impact audit completed by", seal: "rosette", nameY: 390, maxWidth: 680 },

  // Heritage
  { id: "tpl-081", name: "Banknote Guilloché Emerald", category: "Heritage", archetype: "guilloche_security", bg: "#fcfdfa", primary: "#064e3b", secondary: "#047857", accent: "#ecfdf5", titleFont: CIN, bodyFont: COR, headerText: "TREASURY OF CREDENTIALS", subText: "Bearer is hereby certified in full standing", seal: "rosette", nameY: 390, maxWidth: 680 },
  { id: "tpl-082", name: "Royal Charter Wax Seal", category: "Heritage", archetype: "academic_pillars", bg: "#fdfaf3", primary: "#1e1b18", secondary: "#991b1b", accent: "#fef2f2", titleFont: CIN, bodyFont: COR, headerText: "LETTERS PATENT", subText: "Know all men by these presents that we appoint", seal: "wax-red", nameY: 395, maxWidth: 640 },
  { id: "tpl-083", name: "Consular Diplomatic Blue", category: "Heritage", archetype: "guilloche_security", bg: "#f8fafc", primary: "#1e3a8a", secondary: "#b45309", accent: "#eff6ff", titleFont: CIN, bodyFont: COR, headerText: "DIPLOMATIC CORPS COMMENDATION", subText: "For distinguished service in international relations by", seal: "navy-crest", nameY: 390, maxWidth: 680 },
  { id: "tpl-084", name: "Victorian Engraved Sepia", category: "Heritage", archetype: "diploma_filigree", bg: "#f7f3e8", primary: "#292524", secondary: "#78350f", accent: "#ede6d6", titleFont: PLA, bodyFont: COR, headerText: "SOCIETY OF ANTIQUARIES", subText: "Elected as a Fellow of the Historical Society", seal: "gold-star", nameY: 390, maxWidth: 660 },
  { id: "tpl-085", name: "Guildhall Master Craftsman", category: "Heritage", archetype: "classic_double", bg: "#fffdf9", primary: "#451a03", secondary: "#b45309", accent: "#fef3c7", titleFont: CIN, bodyFont: COR, headerText: "WORSHIPFUL COMPANY OF CRAFTS", subText: "Admitted to the Freedom of the Guild", seal: "wax-red", nameY: 390, maxWidth: 680 },
  { id: "tpl-086", name: "Admiralty Maritime Gold", category: "Heritage", archetype: "academic_pillars", bg: "#f8fafc", primary: "#0f172a", secondary: "#ca8a04", accent: "#f1f5f9", titleFont: CIN, bodyFont: COR, headerText: "MARITIME NAVIGATION BOARD", subText: "Master Mariner proficiency demonstrated by", seal: "navy-crest", nameY: 395, maxWidth: 640 },
  { id: "tpl-087", name: "Cartographer's Meridian", category: "Heritage", archetype: "diploma_filigree", bg: "#faf6ed", primary: "#1c1917", secondary: "#0369a1", accent: "#e0f2fe", titleFont: CIN, bodyFont: COR, headerText: "ROYAL GEOGRAPHICAL FELLOW", subText: "For exploration and spatial sciences, awarded to", seal: "rosette", nameY: 390, maxWidth: 660 },
  { id: "tpl-088", name: "Renaissance Florentine Lily", category: "Heritage", archetype: "diploma_filigree", bg: "#fffcf5", primary: "#7f1d1d", secondary: "#d97706", accent: "#fef3c7", titleFont: PLA, bodyFont: COR, headerText: "ACCADEMIA DELLE ARTI", subText: "Conferito con lode al maestro", seal: "wax-red", nameY: 390, maxWidth: 660 },
  { id: "tpl-089", name: "Archival Notary Bond", category: "Heritage", archetype: "guilloche_security", bg: "#ffffff", primary: "#111827", secondary: "#4b5563", accent: "#f3f4f6", titleFont: CIN, bodyFont: MON, headerText: "CERTIFICATE OF AUTHENTICITY", subText: "Registered and notarized in the permanent ledger for", seal: "rosette", nameY: 390, maxWidth: 680 },
  { id: "tpl-090", name: "Centennial Founders Scroll", category: "Heritage", archetype: "award_medallion", bg: "#fcfaf5", primary: "#0f172a", secondary: "#b45309", accent: "#fef3c7", titleFont: CIN, bodyFont: COR, headerText: "CENTENNIAL FOUNDERS CIRCLE", subText: "Inscribed in the benefactors roll of honor", seal: "gold-star", nameY: 410, maxWidth: 660 },

  // Competition
  { id: "tpl-091", name: "Olympiad Gold Medalist", category: "Competition", archetype: "award_medallion", bg: "#ffffff", primary: "#0f172a", secondary: "#eab308", accent: "#fef9c3", titleFont: CIN, bodyFont: SAN, headerText: "CHAMPIONSHIP GOLD MEDALIST", subText: "First place podium victory achieved by", seal: "gold-star", nameY: 410, maxWidth: 660 },
  { id: "tpl-092", name: "Olympiad Silver Podium", category: "Competition", archetype: "award_medallion", bg: "#f8fafc", primary: "#1e293b", secondary: "#64748b", accent: "#e2e8f0", titleFont: CIN, bodyFont: SAN, headerText: "CHAMPIONSHIP SILVER MEDALIST", subText: "Second place distinction achieved by", seal: "rosette", nameY: 410, maxWidth: 660 },
  { id: "tpl-093", name: "Olympiad Bronze Podium", category: "Competition", archetype: "award_medallion", bg: "#fffaf5", primary: "#431407", secondary: "#ea580c", accent: "#ffedd5", titleFont: CIN, bodyFont: SAN, headerText: "CHAMPIONSHIP BRONZE MEDALIST", subText: "Third place podium honors awarded to", seal: "wax-red", nameY: 410, maxWidth: 660 },
  { id: "tpl-094", name: "Esports Arena Apex", category: "Competition", archetype: "tech_cyber", bg: "#090d16", primary: "#ffffff", secondary: "#f43f5e", accent: "#881337", titleFont: SAN, bodyFont: MON, headerText: "VALORCHAMPIONS TOURNAMENT", subText: "MVP & Grand Finalist recognition for player", seal: "hex-badge", nameY: 390, maxWidth: 680 },
  { id: "tpl-095", name: "Marathon Finisher Velocity", category: "Competition", archetype: "modern_diagonal", bg: "#ffffff", primary: "#0f172a", secondary: "#ef4444", accent: "#fee2e2", titleFont: SAN, bodyFont: SAN, headerText: "42.195 KM MARATHON FINISHER", subText: "Official chip-timed endurance completion by", seal: "wax-red", nameY: 390, maxWidth: 660 },
  { id: "tpl-096", name: "Grandmaster Chess Royale", category: "Competition", archetype: "academic_pillars", bg: "#faf8f5", primary: "#18181b", secondary: "#b45309", accent: "#f4f4f5", titleFont: CIN, bodyFont: COR, headerText: "FIDE MASTERS INVITATIONAL", subText: "Awarded for tactical brilliance at the board to", seal: "gold-star", nameY: 395, maxWidth: 640 },
  { id: "tpl-097", name: "Motorsport Telemetry Carbon", category: "Competition", archetype: "tech_cyber", bg: "#111113", primary: "#fafafa", secondary: "#dc2626", accent: "#27272a", titleFont: MON, bodyFont: SAN, headerText: "FORMULA STUDENT ENGINEERING", subText: "Paddock & track scrutiny passed by team member", seal: "hex-badge", nameY: 390, maxWidth: 680 },
  { id: "tpl-098", name: "Debate & Model UN Gavel", category: "Competition", archetype: "classic_double", bg: "#ffffff", primary: "#1e3a8a", secondary: "#ca8a04", accent: "#eff6ff", titleFont: PLA, bodyFont: COR, headerText: "BEST DELEGATE AWARD", subText: "For parliamentary eloquence and diplomacy by", seal: "navy-crest", nameY: 390, maxWidth: 680 },
  { id: "tpl-099", name: "Robotics First Alliance", category: "Competition", archetype: "modern_diagonal", bg: "#f8fafc", primary: "#0f172a", secondary: "#0284c7", accent: "#e0f2fe", titleFont: SAN, bodyFont: MON, headerText: "AUTONOMOUS ROBOTICS CUP", subText: "Mechatronics & control systems excellence by", seal: "hex-badge", nameY: 390, maxWidth: 660 },
  { id: "tpl-100", name: "Centurion Hall of Fame", category: "Competition", archetype: "diploma_filigree", bg: "#090a0f", primary: "#fef08a", secondary: "#f59e0b", accent: "#1e293b", titleFont: CIN, bodyFont: COR, headerText: "HALL OF FAME INDUCTEE", subText: "Immortalized among the top 100 champions", seal: "gold-star", nameY: 390, maxWidth: 660 }
];

/* ==========================================================================
   Element helpers (schema-compatible with js/templates.js)
   ========================================================================== */

const rect = (id, x, y, w, h, fill = "none", stroke = "none", strokeWidth = 0) => ({
  id, type: "shape", shape: "rect", x, y, w, h, fill, stroke, strokeWidth, locked: true
});

const polygon = (id, points, fill = "none", stroke = "none", strokeWidth = 0) => ({
  id, type: "shape", shape: "polygon", points, fill, stroke, strokeWidth, locked: true
});

const circle = (id, cx, cy, r, fill = "none", stroke = "none", strokeWidth = 0) => ({
  id, type: "shape", shape: "circle", cx, cy, r, fill, stroke, strokeWidth, locked: true
});

const text = (id, value, x, y, w, size, weight, font, color, align = "center", extra = {}) => ({
  id, type: "text", text: value, x, y, w, size, weight, align, font, color, lineHeight: 1.25, ...extra
});

const diamond = (id, cx, cy, radius, color) => polygon(
  id,
  [cx + "," + (cy - radius), (cx + radius) + "," + cy, cx + "," + (cy + radius), (cx - radius) + "," + cy].join(" "),
  color
);

/* ==========================================================================
   Archetype geometry
   ========================================================================== */

function frameElements(tpl) {
  const { width: w, height: h } = PAGE;

  switch (tpl.archetype) {
    case "classic_double":
      return [
        rect("frame-outer", 40, 40, w - 80, h - 80, "none", tpl.primary, 4),
        rect("frame-inner", 52, 52, w - 104, h - 104, "none", tpl.secondary, 1.5),
        rect("corner-0", 40, 40, 12, 12, tpl.secondary),
        rect("corner-1", w - 52, 40, 12, 12, tpl.secondary),
        rect("corner-2", 40, h - 52, 12, 12, tpl.secondary),
        rect("corner-3", w - 52, h - 52, 12, 12, tpl.secondary)
      ];

    case "academic_pillars":
      return [
        rect("pillar-backdrop", 45, 45, w - 90, h - 90, tpl.accent),
        rect("pillar-paper", 65, 65, w - 130, h - 130, tpl.bg),
        rect("pillar-frame", 45, 45, w - 90, h - 90, "none", tpl.primary, 3),
        rect("pillar-line-0", 82, 65, 2, h - 130, tpl.secondary),
        rect("pillar-line-1", 90, 65, 2, h - 130, tpl.secondary),
        rect("pillar-line-2", w - 82, 65, 2, h - 130, tpl.secondary),
        rect("pillar-line-3", w - 90, 65, 2, h - 130, tpl.secondary)
      ];

    case "swiss_asymmetric":
      return [
        rect("spine", 0, 0, 95, h, tpl.primary),
        rect("spine-accent", 95, 0, 12, h, tpl.secondary),
        rect("grid-top", 107, 220, w - 107, 1, tpl.secondary),
        rect("grid-bottom", 107, h - 180, w - 107, 1, tpl.secondary)
      ];

    case "tech_cyber": {
      const pad = 45, cut = 28;
      const frame = [
        `${pad + cut},${pad}`, `${w - pad - cut},${pad}`, `${w - pad},${pad + cut}`,
        `${w - pad},${h - pad - cut}`, `${w - pad - cut},${h - pad}`, `${pad + cut},${h - pad}`,
        `${pad},${h - pad - cut}`, `${pad},${pad + cut}`
      ].join(" ");
      const parts = [
        polygon("tech-frame", frame, "none", tpl.secondary, 2.5)
      ];
      // Lightweight circuit grid (approx. the doc's 40px field without 50+ nodes).
      for (let i = 0; i < 8; i++) {
        const x = 150 + i * 130;
        if (x > w - 60) break;
        parts.push(rect(`grid-v-${i}`, x, 70, 1, h - 140, tpl.accent));
      }
      for (let i = 0; i < 5; i++) {
        const y = 150 + i * 130;
        parts.push(rect(`grid-h-${i}`, 107, y, w - 214, 1, tpl.accent));
      }
      return parts;
    }

    case "diploma_filigree":
      return [
        rect("filigree-outer", 42, 42, w - 84, h - 84, "none", tpl.secondary, 2),
        rect("filigree-inner", 54, 54, w - 108, h - 108, "none", tpl.primary, 1),
        diamond("filigree-corner-0", 42, 42, 10, tpl.secondary),
        diamond("filigree-corner-1", w - 42, 42, 10, tpl.secondary),
        diamond("filigree-corner-2", w - 42, h - 42, 10, tpl.secondary),
        diamond("filigree-corner-3", 42, h - 42, 10, tpl.secondary)
      ];

    case "executive_ribbon":
      return [
        rect("ribbon-top", 0, 0, w, 28, tpl.primary),
        rect("ribbon-band", 0, 28, w, 8, tpl.secondary),
        rect("ribbon-bottom", 0, h - 24, w, 24, tpl.primary),
        rect("ribbon-frame", 48, 60, w - 96, h - 108, "none", tpl.accent, 2)
      ];

    case "minimal_nordic":
      return [
        rect("nordic-frame", 56, 56, w - 112, h - 112, "none", tpl.primary, 1),
        rect("nordic-accent", w / 2 - 40, 54, 80, 5, tpl.secondary)
      ];

    case "guilloche_security": {
      const parts = [];
      for (let phase = 0; phase < 2; phase++) {
        const top = [];
        const bottom = [];
        for (let x = 45; x <= w - 45; x += 4) {
          top.push(`${x},${(52 + Math.sin(x * 0.08 + phase * Math.PI) * 8).toFixed(2)}`);
          bottom.push(`${x},${(h - 52 + Math.sin(x * 0.08 + phase * Math.PI) * 8).toFixed(2)}`);
        }
        parts.push(polygon(`guilloche-top-${phase}`, top.join(" "), "none", tpl.secondary, 1));
        parts.push(polygon(`guilloche-bottom-${phase}`, bottom.join(" "), "none", tpl.secondary, 1));
      }
      parts.push(rect("guilloche-frame", 40, 40, w - 80, h - 80, "none", tpl.primary, 2));
      return parts;
    }

    case "modern_diagonal":
      return [
        polygon("diagonal-tl", `0,0 260,0 0,260`, tpl.accent),
        polygon("diagonal-br", `${w},${h} ${w - 220},${h} ${w},${h - 220}`, tpl.secondary),
        rect("diagonal-frame", 48, 48, w - 96, h - 96, "none", tpl.primary, 2)
      ];

    case "award_medallion":
    default:
      return [
        rect("medallion-outer", 44, 44, w - 88, h - 88, "none", tpl.secondary, 3),
        rect("medallion-inner", 52, 52, w - 104, h - 104, "none", tpl.primary, 1)
      ];
  }
}

/* ==========================================================================
   Vector seal
   ========================================================================== */

const SEAL_COLORS = {
  "gold-star": tpl => tpl.secondary,
  "rosette": tpl => tpl.secondary,
  "hex-badge": tpl => tpl.secondary,
  "wax-red": () => "#991b1b",
  "emerald-crest": () => "#047857",
  "navy-crest": () => "#1e3a8a",
  "caduceus-blue": () => "#0369a1"
};

function starburstPoints(cx, cy, outer, inner, spikes = 24) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / spikes;
    pts.push(`${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`);
  }
  return pts.join(" ");
}

function sealElements(tpl) {
  const cx = 195, cy = 649, radius = 44;
  const fill = (SEAL_COLORS[tpl.seal] || SEAL_COLORS.rosette)(tpl);
  return [
    polygon("seal-ribbon-l", `${cx - 18},${cy + 20} ${cx - 32},${cy + 72} ${cx - 12},${cy + 62} ${cx - 4},${cy + 76}`, tpl.primary),
    polygon("seal-ribbon-r", `${cx + 18},${cy + 20} ${cx + 32},${cy + 72} ${cx + 12},${cy + 62} ${cx + 4},${cy + 76}`, tpl.primary),
    polygon("seal-burst", starburstPoints(cx, cy, radius, radius * 0.86), fill),
    circle("seal-ring", cx, cy, radius * 0.68, "none", tpl.bg, 2),
    text("seal-label", "VERIFIED", cx, cy + 4, 90, 10, "700", SAN, tpl.bg)
  ];
}

/* ==========================================================================
   Builder
   ========================================================================== */

export function buildPresetTemplate(def) {
  const centerX = def.archetype === "swiss_asymmetric" ? 606 : 561;

  const elements = [
    ...frameElements(def),
    text("overline", `CERTIFORGE VERIFIED SERIES • ${def.category.toUpperCase()}`, centerX, 122, 900, 12, "600", MON, def.secondary),
    text("title", def.headerText, centerX, 172, 950, 33, "700", def.titleFont, def.primary),
    rect("title-divider", centerX - 90, 195, 180, 1.5, def.secondary),
    text("subtext", def.subText, centerX, 295, 900, 21, "600", def.bodyFont, def.primary),
    text("name", "{{NAME}}", centerX, def.nameY, def.maxWidth, 44, "600", def.bodyFont, def.primary, "center", {
      lineHeight: 1.15, autoFit: true, fitMin: 16
    }),
    rect("name-rule", centerX - 260, def.nameY + 34, 520, 1, def.secondary),
    text("role-line", "for {{ROLE}} · {{EVENT}}", centerX, def.nameY + 90, 860, 16, "400", def.bodyFont, def.primary),
    text("details", "{{DATE}} · {{VENUE}}", 561, 552, 760, 12, "600", SAN, def.secondary)
  ];

  if (def.seal !== "none") elements.push(...sealElements(def));

  elements.push(
    rect("sig-line", 793, 660, 225, 1, def.secondary),
    text("sig-label", "AUTHORIZED SIGNATORY", 906, 681, 240, 11, "600", SAN, def.primary),
    { id: "qr", type: "qr", text: "{{VERIFY_URL}}", x: 561, y: 700, w: 44, h: 44 },
    text("certificate-id", "Nº {{CERTIFICATE_ID}}", 561, 736, 400, 9.5, "600", SAN, def.secondary)
  );

  return {
    id: def.id,
    name: def.name,
    category: def.category,
    description: `${def.category} preset · ${ARCHETYPE_LABELS[def.archetype] || def.archetype}.`,
    page: { ...PAGE },
    background: def.bg,
    elements,
    preset: true,
    archetype: def.archetype
  };
}

export function buildPresetTemplates() {
  return PRESET_TEMPLATES.map(buildPresetTemplate);
}
