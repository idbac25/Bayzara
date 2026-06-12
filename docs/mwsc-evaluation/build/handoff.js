/* ============================================================================
 * MWSC × BECO Independent Economic Evaluation — Engagement Context Pack / Handoff
 * Builds ONE branded PDF (Kayd Solutions) capturing the full engagement context,
 * so the conversation can be continued in a desktop Claude session.
 * Setup: npm i pdfmake@0.3.11   Run: node handoff.js <outDir>
 * ==========================================================================*/
const pdfmake = require('pdfmake');
const fs = require('fs');
pdfmake.addFonts({
  Times:    { normal:'Times-Roman', bold:'Times-Bold', italics:'Times-Italic', bolditalics:'Times-BoldItalic' },
  Helvetica:{ normal:'Helvetica', bold:'Helvetica-Bold', italics:'Helvetica-Oblique', bolditalics:'Helvetica-BoldOblique' },
  Courier:  { normal:'Courier', bold:'Courier-Bold', italics:'Courier-Oblique', bolditalics:'Courier-BoldOblique' }
});
const BLUE='#0b5394', GREY='#666', DARK='#222', FLAG='#b45309', FLAGBG='#fdf2e2', TIP='#1f6b32', TIPBG='#eef6ee', DEFBG='#eef1f6';
const RUNNING='MWSC × BECO Evaluation — Engagement Context Pack';

/* ------------------------------ CONTENT ----------------------------------- */
const DOC = [
{h:1,t:'0. What this document is'},
{p:'This is a **portable context pack** for the MWSC × BECO independent economic evaluation. Its job is to let you (or any Claude session — desktop, web, CLI) **resume this engagement with full context** without re-explaining anything. It compresses the entire conversation to date: the mandate, the transaction, the unresolved ownership question, the applicable standards, the agreed methodology, the work already delivered, what is queued, and the open questions. Section 13 gives a ready-to-paste kickoff prompt for a fresh desktop conversation.'},
{note:'Why move to desktop: this session runs against a GitHub repo, which is ideal for committing files but awkward for long-form, heavily-annotated document drafting. Carry this pack over to a desktop cloud conversation to continue producing comprehensive, cleanly annotated documents. All work so far is committed in the repo (Section 9).', kind:'tip', title:'Purpose of the move'},

{h:1,t:'1. Engagement snapshot'},
{tbl:{w:['auto','*'],head:['Field','Value'],rows:[
 ['My role','Independent economic evaluator — neutral, loyal to method & standards, NOT an advisor to either party. Symmetric treatment of both sides.'],
 ['Mandate order','Phase 1 = evaluate the evaluation methods vs international standards. Phase 2 = derive/test financial values. Methods first, numbers second.'],
 ['Transaction','Proposed merger/JV: BECO (acquirer) ↔ MWSC (target/operator). Fixed control split 51% BECO / 49% MWSC.'],
 ['Sector','Water utility (Mogadishu); coastal, semi-arid aquifer; MWSC wellfield near Afgooye.'],
 ['Current workstream','Asset evaluation — boreholes & wells (delivered); reservoirs, pumps, generators queued.'],
 ['Provider / author','Kayd Solutions (independent evaluator).'],
 ['Repo / branch','idbac25/Bayzara · branch claude/water-utility-merger-research-Qh7FK'],
 ['Status','Phase 1 in progress. Borehole audit reference delivered 2026-06-12.']
]}},

{h:1,t:'2. My role & mandate'},
{p:'I act as an **independent economic evaluator**, not an advisor to either party. Loyalty is to **method and standards**, applied **symmetrically to both sides**. The mandate has two phases in strict order:'},
{ol:[
 '**Phase 1 — Technical / methodology evaluation:** evaluate the *evaluation methods* against international standards. You do not validate a number produced by a method you have not first validated.',
 '**Phase 2 — Financial evaluation:** only after the method passes Phase 1, derive and test the actual values, ranges and sensitivities, and report an independent range.'
]},
{note:'Guiding principle: **methods first, numbers second.**', kind:'tip'},

{h:1,t:'3. The transaction'},
{h:3,t:'Parties'},
{ul:[
 '**MWSC** — Mogadishu ("Moktoshu") Water Supply Company — the target/operator.',
 '**BECO** — Banadir (Banaadir) Electric Company — the acquirer. (User sometimes writes "BECCO"/"Beko".)'
]},
{h:3,t:'BECO — who they are (web-verified)'},
{ul:[
 'Somalia’s **largest electricity utility**; founded **5 May 2014** by **merging** the major Banadir-region electricity companies → a **serial consolidator with a repeatable absorption playbook**.',
 'Covers ~**80% of Mogadishu** plus Jubaland, Southwest, Hirshabelle; distributes to Kismayo, Barawe, Marka, Balad, Jowhar, Afgooye, Elasha.',
 'Well-capitalized: **$220M green-energy program**, ~30% renewables; solar cut tariff **$0.49 → $0.36/kWh**.',
 '**A power company expanding sideways into water** (new vertical), NOT a water company.'
]},
{h:3,t:'Deal-structure facts (per user — keep neutral)'},
{ul:[
 '**Equity split is a FIXED control rule:** BECO **51%** / MWSC **49%** — **predetermined, NOT derived from the valuation.** (An earlier "control-lever / you’d own 58%" reasoning was **withdrawn** once this was clarified.)',
 'The **49%** sits in a **ring-fenced MWSC subsidiary only** — MWSC shareholders do **not** share in BECO’s wider group upside.',
 'BECO applies a **30% downward "haircut" to MWSC’s assets only** (asymmetric/one-sided) — basis unknown.',
 'BECO offers a discretionary **~$3M "goodwill" sweetener.**',
 '**BECO’s own contribution for its 51% is UNKNOWN** (cash? folded-in assets? capital + management?) — open question.'
]},
{h:3,t:'Strategic / contextual reads (neutral)'},
{ul:[
 'Because the split is fixed, the live question is: **"Since the split is fixed, what does the 30% haircut actually adjust?"** Candidates: (a) recorded capital accounts of the sub, (b) fairness basis for the $3M, (c) a future buyout/exit formula for the 49%. If "nothing, just bookkeeping," it has no analytical basis.',
 '**Related-party risk (neutral disclosure):** BECO would be both **controlling parent AND electricity supplier** to the water sub → transfer-pricing / management-fee channels could move profit from the 49%-shared sub to the 100%-owned parent. Methodology must disclose/handle this.',
 '**Synergy of record:** BECO already powers Afgooye/Elasha (where MWSC’s wellfield sits). Pumping energy (diesel) is a water utility’s biggest OPEX; BECO’s (solar) grid could slash it.',
 'BECO’s template was built to absorb **small diesel gensets** (commodity, replaceable). MWSC is a **strategic, hard-to-replicate aquifer system** — a neutral methodology should not assume the template fits.'
]},

{brk:true},
{h:1,t:'4. Ownership / legal situation (critical scoping fact)'},
{ul:[
 'After the **1991 collapse of central government**, MWSC has for **~35 years** managed, maintained, protected and **added substantial value** to a formerly **public** water system.',
 '**There is NO formal contract/concession** — only **tacit government approval** to operate.',
 'Therefore **legal title is unresolved.** The evaluator must NOT assume either extreme ("all public" vs "all MWSC’s"). (This walked back an earlier "it’s all public / IPSAS governs the lot" framing.)'
]},
{h:3,t:'Neutral valuation treatment agreed'},
{ol:[
 '**Separate value from ownership.** Value the asset base by DRC / income approach regardless of owner; attribute ownership per a **stated special assumption (IVS 101/102)** taken from a **qualified Somali-law title opinion (IVS 104 reliance on a legal specialist)** — the evaluator does not adjudicate title.',
 '**Asset-vintage split:** after 35 years most pre-1991 physical assets are depreciated or replaced; **most in-service assets are likely MWSC-funded.** Date each asset by class; let depreciation reveal the split (evidence-based).',
 '**Quantify "value added" in three buckets:** (a) MWSC self-funded capex/betterment (cost approach); (b) going concern & intangibles — customer base, billing/collections, operating capability, brand (**IVS 210** / income approach); (c) potential **improvement / unjust-enrichment compensation claim** if title reverts (subject to legal opinion).',
 '**Title-risk discount:** a purely tacit, revocable operating right is fragile → reflected **symmetrically** as an income-approach risk input (horizon / discount rate), applied to the whole enterprise regardless of holder.',
 '**Present value under multiple title scenarios** so the conclusion is transparent, not hostage to an unresolved legal question.'
]},
{note:'Open fork: does a written Somali-law title/legal opinion exist, or can one be commissioned? This decides whether the methodology presents a single title basis or a multi-scenario matrix.', kind:'flag', title:'Decision pending'},

{h:1,t:'5. Applicable world standards'},
{h:3,t:'Valuation'},
{ul:[
 '**IVS 2025** (effective 31 Jan 2025): IVS 101 Scope, 102 Bases of Value, 103 Approaches, 104 Data & Inputs, 105 Models, 106 Documentation; **IVS 200 Businesses**, **IVS 210 Intangibles**.',
 '**IVS 102 Equitable Value** likely more appropriate than Market Value (transfer between two specific identified parties).',
 '**IVS 200:** cost approach "rarely applicable" to a cash-generating concession → **income approach (DCF) primary**; **DRC (cost approach)** for specialized physical assets with no active market.',
 '**IPSAS 45 Property, Plant & Equipment** (effective 1 Jan 2025; replaced IPSAS 17): governs public-sector infrastructure (names water supply systems); recognizes **DRC** / current operational value. **Applies only to the genuinely public portion.**',
 '**RICS Red Book Global** — operationalizes IVS.'
]},
{h:3,t:'Borehole / water engineering (Phase-1 technical)'},
{p:'Full, verified citations are in Section 10. Spine: ISO 14686; Kruseman & de Ridder (ILRI 47); AWWA A100 / M21; WHO GDWQ (2022); ISO 5667 sampling; SANS 10299-4; Kenya WRA test-pumping code; US EPA borehole geophysics; USGS groundwater/seawater-intrusion.'},

{h:1,t:'6. Phase-1 methodology-conformance checklist (apply to BOTH parties)'},
{ol:[
 '**Object of valuation (IVS 101):** carve the estate into *original public asset / MWSC-funded improvements / intangibles & going concern.*',
 '**Basis of value (IVS 102):** declare & justify (Equitable Value likely); state title special assumption(s).',
 '**Approach selection (IVS 103/105, 200):** is DRC right per asset class? Income approach for the revenue-earning concession?',
 '**Consistency & symmetry:** are the same methods/assumptions/adjustments applied to both sides? (The **30% one-sided haircut** is a consistency/objectivity test, not a grievance.)',
 '**Data & inputs (IVS 104):** replacement costs, useful lives, depreciation sourced & reliable; reliance on legal title opinion noted.',
 '**Documentation (IVS 106):** transparent, reproducible.',
 '**Independence/objectivity:** disclose related-party features (BECO controlling + supplying; political ties) as risk factors.'
]},
{note:'Phase-1 deliverable: a **methodology-conformance scorecard** rating the approach against IVS 2025 + IPSAS 45 (conforms / partial / non-conforming) with the gap and standard reference for each.', kind:'tip'},

{brk:true},
{h:1,t:'7. Borehole & well evaluation plan'},
{p:'Context: coastal, semi-arid aquifer; MWSC wellfield near Afgooye. Lead value drivers: **(a) sustainable yield vs over-abstraction** and **(b) saltwater intrusion / salinity trend.** A structurally perfect borehole is worth little if water turns brackish or the table is falling. Per-module template: **Authority → Method → Metric → Valuation input.**'},
{tbl:{w:['auto','*','*'],head:['Module','Method / authority','Feeds (valuation input)'],rows:[
 ['M1 Structural integrity','CCTV, caliper, gamma/casing logs, verticality, sanitary-seal inspection (AWWA A100; US EPA geophysics)','Remaining structural life → DRC depreciation; rehab-vs-replace cost'],
 ['M2 Hydraulic performance & yield','Step-drawdown (3+ rates ≥60 min) → efficiency; constant-rate (±5%, 24–72 h) → sustainable yield + T,S; recovery → cross-check T (ISO 14686; Kruseman & de Ridder; Kenya WRA)','Revenue capacity; ageing indicator (specific-capacity decline)'],
 ['M3 Aquifer sustainability','Long-term water-level monitoring; recharge/water balance; well-interference (USGS sustainable-yield framework)','Asset life horizon (income approach); over-abstraction risk → discount-rate driver'],
 ['M4 Water quality','Lab panel, representative + seasonal (WHO GDWQ 2022; Water Safety Plan). E.coli 0/100mL; As 0.01; F 1.5; NO₃ 50; salinity suite TDS/EC/Cl/Na/SO₄','Treatment OPEX; salinity caps price & life'],
 ['M5 Saltwater intrusion (coastal overlay)','EC depth profiling; chloride trend; resistivity interface mapping; Ghyben–Herzberg (USGS seawater intrusion)','Potentially the single largest impairment']
]}},
{h:3,t:'Synthesis → RUL & risk grade per borehole'},
{ul:[
 '**RUL = minimum of** structural life (M1), aquifer life (M3), quality/salinity life (M4–M5).',
 '**Capacity = sustainable yield** (M2), de-rated for blending losses.',
 '**OPEX = pumping energy + treatment** (M4) — note BECO power synergy.',
 'RUL + capacity + OPEX → income approach; RUL + condition → DRC depreciation.'
]},
{h:3,t:'Tiered execution (many boreholes)'},
{ol:[
 '**Tier 1 — Census (all):** ID, location, depth, construction date, casing/screen spec, pump, metered output, static level + EC spot.',
 '**Tier 2 — Rapid field screen (all):** wellhead condition, water level, EC/salinity spot, specific-capacity spot check.',
 '**Tier 3 — Full assessment (representative + critical subset):** CCTV + caliper, full constant-rate test, full WHO lab panel, EC depth profile. Extrapolate to population.'
]},

{brk:true},
{h:1,t:'8. What has been delivered'},
{p:'**Borehole & Well Evaluation Reference** (delivered 2026-06-12) — a standalone authoritative **audit reference** for both non-technical reviewers and technical evaluators. Lens: the user is **auditing the evaluators** (with no instruments), so it states what a competent evaluation must measure, by which method, to which named standard, how it is scored, and the valid **low-/no-cost substitutes** when equipment is missing.'},
{ul:[
 '**Outputs:** branded PDF (Kayd Solutions) + unbranded PDF + Markdown source; single-source generator (pdfmake). 17 pages.',
 '**Contents:** how-to-use; plain-language primer; 4 dimensions (Structural / Yield / Quality / Sustainability & saltwater intrusion) each with terms, gold-standard method, no-equipment fallback, governing standard, "good" thresholds, audit checklist, scoring; a ready-to-use scoring rubric (**BCSI 0–100 + A–E grade + weakest-link RUL ceiling**) with a worked example; the value bridge (RUL/capacity/OPEX → DRC & income approach); auditor red-flags; glossary; verified references.',
 '**Assurance:** all standards & formulas were **verified by two sub-agents** before release.'
]},
{tbl:{w:['auto','*'],head:['Artifact','Repo path'],rows:[
 ['Branded PDF','docs/mwsc-evaluation/pdf/Borehole-Well-Evaluation-Reference_Kayd-Solutions.pdf'],
 ['Unbranded PDF','docs/mwsc-evaluation/pdf/Borehole-Well-Evaluation-Reference.pdf'],
 ['Markdown source','docs/mwsc-evaluation/borehole-well-evaluation-reference.md'],
 ['Generator (single-source)','docs/mwsc-evaluation/build/generate.js (rebuild: npm i pdfmake@0.3.11 && node generate.js ..)'],
 ['This context pack','docs/mwsc-evaluation/pdf/ + build/handoff.js'],
 ['Engagement memory','docs/mwsc-evaluation/ENGAGEMENT-MEMORY.md (the master running record)']
]}},

{h:1,t:'9. Verified standards & formulas (reference)'},
{p:'Locked-in citations (independently verified — supersede any earlier "edition TBC" notes):'},
{tbl:{w:['*','*'],head:['Standard / source','Verified detail'],rows:[
 ['ISO 14686:2003','Hydrometric determinations — Pumping tests for water wells — Considerations and guidelines for design, performance and use. Current; revision ISO/DIS 14686 pending. Supersedes BS 6316:1992.'],
 ['ISO 5667-11:2009','Water quality — Sampling — Part 11: Guidance on sampling of groundwaters.'],
 ['ISO 5667-3:2024','Preservation & handling of water samples (current — NOT 2018).'],
 ['WHO GDWQ','4th ed. incorporating 1st & 2nd addenda (2022). ISBN 9789240045064.'],
 ['ANSI/AWWA A100-20','Water Wells (2020).'],
 ['AWWA M21','5th ed. 2025, retitled "Groundwater Operations" (manual, not a consensus standard).'],
 ['SANS 10299 / -4:2003','Development, maintenance & management of groundwater resources; Part 4 = Test-pumping of water boreholes (SABS).'],
 ['DWAF/DWS (SA)','South African Water Quality Guidelines Vol.1: Domestic Use, 2nd ed. (1996).'],
 ['Kenya WRA','Code of Practice for Test Pumping — posted version is a DRAFT; verify final adoption before formal citation.'],
 ['US EPA','Environmental Geophysics — Borehole Geophysical Methods (caliper, gamma, fluid temp/conductivity, flow).'],
 ['USGS GWPD 4','Electric-tape water-level measurement.'],
 ['Misstear, Banks & Clark (2017)','Water Wells and Boreholes, 2nd ed., Wiley-Blackwell — independent text, NOT a BGS publication.'],
 ['Kruseman & de Ridder','Analysis and Evaluation of Pumping Test Data, ILRI Pub. 47.'],
 ['Healy & Cook (2002)','Using groundwater levels to estimate recharge (WTF method).']
]}},
{p:'**Formulas confirmed:** specific capacity Sc = Q/s; Jacob step-drawdown s = BQ + CQ² and efficiency BQ/(BQ+CQ²); Theis; Cooper–Jacob T = 2.30Q/(4πΔs), S = 2.25T·t₀/r²; Theis recovery; Ghyben–Herzberg z ≈ 40h; WTF recharge R = Sy·Δh; TDS ≈ 0.64×EC (≈0.75 for seawater-intruded).'},

{brk:true},
{h:1,t:'10. Queued workstreams'},
{ol:[
 '**Reservoirs / storage tanks** (concrete + steel) — "Module 6" on the same template. *User will provide photos.* Concrete: structural condition, cracking, spalling, rebar corrosion, leakage, capacity. Steel: corrosion, coating, plate thickness, cathodic protection.',
 '**Pumps & generators** — condition, rating, efficiency, remaining life, replacement cost, energy cost (links to BECO power synergy).',
 '**Field protocol + scoring sheet** — convert the borehole plan into one row per borehole (Tier 1–3 data fields, auto-RUL/risk grade).',
 '**Phase-1 conformance toolkit** — "Methodology Conformance — IVS 2025 / IPSAS 45" scorecard + scoping framework (asset-vintage split, value-added buckets, title-scenario matrix).'
]},

{h:1,t:'11. Open questions to confirm (client / "Mahad")'},
{ol:[
 '**What does BECO contribute for its 51%?** (cash / assets / capital + management)',
 '**Since the split is fixed at 49/51, what does the 30% haircut adjust?** (capital accounts / $3M basis / buyout formula)',
 '**What electricity tariff & related-party terms** will BECO charge the water subsidiary?',
 '**Does a written Somali-law title/legal opinion exist** (or can one be commissioned)?',
 'Confirm any remaining edition/scope points before final report (most now verified in Section 9).'
]},

{h:1,t:'12. Working / admin notes'},
{ul:[
 'Repo: **idbac25/Bayzara**; branch: **claude/water-utility-merger-research-Qh7FK**. Repo is otherwise a Next.js app ("Bayzara"); this is a research/advisory engagement living under docs/mwsc-evaluation/.',
 'Units to standardize: **m, m³/day, L/s, mg/L**. Currency: USD (e.g. $3M) as stated by client.',
 'PDF tooling: environment had no working Chrome/pandoc/LibreOffice → PDFs built with **pdfmake** (pure JS, standard-14 fonts). On desktop you have richer formatting/annotation options.',
 'Master running record = **ENGAGEMENT-MEMORY.md** (keep it updated as the single source of truth).'
]},

{brk:true},
{h:1,t:'13. How to continue on desktop — ready-to-paste kickoff'},
{p:'Start a new desktop conversation and paste the block below (attach this PDF too). It re-establishes the mandate and points to the next task.'},
{form:
'You are continuing an in-progress engagement. Adopt this context fully.\n\n'+
'ROLE: I am an INDEPENDENT economic evaluator (Kayd Solutions) for a proposed\n'+
'merger between BECO (Banadir Electric Company, acquirer, 51%) and MWSC\n'+
'(Mogadishu Water Supply Company, target, 49%). You are neutral, loyal to method\n'+
'and standards, and treat both parties symmetrically. Mandate: PHASE 1 evaluate\n'+
'the evaluation METHODS vs international standards, THEN Phase 2 derive financial\n'+
'values. Methods first, numbers second.\n\n'+
'STANDARDS SPINE: Valuation = IVS 2025 (esp. 101/102/103/104/200/210; Equitable\n'+
'Value) + IPSAS 45 (public portion only). Engineering = ISO 14686:2003, AWWA\n'+
'A100-20 / M21 (2025), WHO GDWQ 2022, ISO 5667-11:2009 & -3:2024, SANS 10299-4,\n'+
'Kenya WRA test-pumping (draft), US EPA geophysics, USGS.\n\n'+
'KEY FACTS: ownership/title is UNRESOLVED (no concession, only tacit approval,\n'+
'~35 yrs MWSC operation) - never assume "all public" or "all MWSC". Split is FIXED\n'+
'51/49 (not derived from valuation). 30% haircut applies to MWSC assets only -\n'+
'basis unknown. ~$3M goodwill sweetener. Coastal semi-arid aquifer near Afgooye;\n'+
'lead risks = sustainable yield + saltwater intrusion.\n\n'+
'DONE: a 17-page Borehole & Well Evaluation audit reference (attached pack has\n'+
'full detail). QUEUED next: reservoirs/tanks (concrete + steel) "Module 6" - I will\n'+
'send photos; then pumps & generators; then the field scoring sheet; then the\n'+
'Phase-1 IVS/IPSAS conformance scorecard.\n\n'+
'TASK NOW: [state what you want - e.g. "build the reservoirs/tanks module from\n'+
'these photos" or "draft the Phase-1 conformance scorecard"].'
},
{note:'Everything referenced here is committed in the repo under docs/mwsc-evaluation/. If you want the desktop session to see the actual files, upload this pack plus ENGAGEMENT-MEMORY.md and the borehole reference PDF.', kind:'tip'},
{sp:6},
{p:'_End of context pack._'}
];

/* ------------------------------ RENDERER (PDF) ---------------------------- */
function parseInline(s){
  if(typeof s!=='string') return s;
  const out=[]; const re=/(\*\*[^*]+\*\*|_[^_]+_)/g; let last=0,m;
  while((m=re.exec(s))){ if(m.index>last) out.push({text:s.slice(last,m.index)});
    const tok=m[0]; if(tok.startsWith('**')) out.push({text:tok.slice(2,-2),bold:true}); else out.push({text:tok.slice(1,-1),italics:true});
    last=re.lastIndex; }
  if(last<s.length) out.push({text:s.slice(last)});
  return out.length?out:[{text:s}];
}
const tableLayout = {
  hLineWidth:(i,node)=> (i===0||i===node.table.body.length||i===1)?0.8:0.4,
  vLineWidth:()=>0.4, hLineColor:(i)=> i===1?BLUE:'#bbb', vLineColor:()=>'#bbb',
  fillColor:(r)=> r===0?BLUE:(r%2===0?'#f4f7fb':null),
  paddingTop:()=>2.5, paddingBottom:()=>2.5, paddingLeft:()=>5, paddingRight:()=>5
};
function calloutColors(k){ if(k==='flag') return {bg:FLAGBG,bar:FLAG,label:FLAG}; if(k==='tip') return {bg:TIPBG,bar:TIP,label:TIP}; return {bg:DEFBG,bar:BLUE,label:BLUE}; }
function blockToPdf(b){
  if(b.brk) return {text:'', pageBreak:'after'};
  if(b.sp!==undefined) return {text:'', margin:[0,b.sp/2,0,0]};
  if(b.h){
    if(b.h===1) return {stack:[{text:b.t,font:'Helvetica',bold:true,fontSize:14,color:BLUE,margin:[0,3,0,3]},
      {canvas:[{type:'line',x1:0,y1:0,x2:485,y2:0,lineWidth:1.1,lineColor:BLUE}]}], margin:[0,5,0,7]};
    if(b.h===2) return {text:b.t,font:'Helvetica',bold:true,fontSize:12,color:BLUE,margin:[0,7,0,4]};
    return {text:b.t,font:'Helvetica',bold:true,fontSize:10.5,color:DARK,margin:[0,6,0,3]};
  }
  if(b.p) return {text:parseInline(b.p),margin:[0,0,0,5],alignment:'justify',lineHeight:1.16};
  if(b.ul) return {ul:b.ul.map(parseInline),margin:[6,0,0,6],lineHeight:1.14};
  if(b.ol) return {ol:b.ol.map(parseInline),margin:[6,0,0,6],lineHeight:1.14};
  if(b.form) return {table:{widths:['*'],body:[[{text:b.form,font:'Courier',fontSize:8,color:'#0a3d62',margin:[6,5,6,5]}]]},
    layout:{hLineWidth:()=>0.5,vLineWidth:()=>0.5,hLineColor:()=>'#cfd9e6',vLineColor:()=>'#cfd9e6',fillColor:()=>'#f3f6fb'},margin:[0,2,0,7]};
  if(b.tbl){ const head=b.tbl.head.map(h=>({text:h,bold:true,color:'white',font:'Helvetica',fontSize:8.5}));
    const body=[head,...b.tbl.rows.map(r=>r.map(c=>({text:parseInline(String(c)),fontSize:8.5})))];
    return {table:{headerRows:1,widths:b.tbl.w||b.tbl.head.map(()=> '*'),body,dontBreakRows:true},layout:tableLayout,margin:[0,2,0,8]}; }
  if(b.note){ const c=calloutColors(b.kind); const inner=[];
    if(b.title) inner.push({text:b.title.toUpperCase(),bold:true,font:'Helvetica',fontSize:7.5,color:c.label,margin:[0,0,0,2]});
    inner.push({text:parseInline(b.note),fontSize:9,color:DARK,lineHeight:1.13});
    return {table:{widths:['*'],body:[[{stack:inner,margin:[8,5,8,5],fillColor:c.bg}]]},
      layout:{hLineWidth:()=>0,vLineWidth:(i)=> i===0?2.5:0,vLineColor:()=>c.bar,paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0},margin:[0,2,0,8]}; }
  return {text:''};
}
function cover(){
  const s=[];
  s.push({text:'',margin:[0,80,0,0]});
  s.push({text:'KAYD SOLUTIONS',font:'Helvetica',bold:true,fontSize:18,color:BLUE,alignment:'center',characterSpacing:3,margin:[0,0,0,4]});
  s.push({text:'Independent Economic & Technical Evaluation',font:'Helvetica',fontSize:9,color:GREY,alignment:'center',characterSpacing:1,margin:[0,0,0,26]});
  s.push({canvas:[{type:'line',x1:60,y1:0,x2:425,y2:0,lineWidth:1.2,lineColor:BLUE}],margin:[0,0,0,18]});
  s.push({text:'Engagement Context Pack',font:'Helvetica',bold:true,fontSize:26,color:DARK,alignment:'center',margin:[0,0,0,6]});
  s.push({text:'Full handoff record — for continuation in a desktop session',font:'Helvetica',fontSize:13,color:BLUE,alignment:'center',margin:[0,0,0,16]});
  s.push({text:'MWSC × BECO — proposed water-utility merger / joint venture.\nEverything needed to resume the engagement with full context:\nmandate, transaction, ownership question, standards, methodology,\ndelivered work, queued workstreams, open questions, and a\nready-to-paste kickoff prompt for desktop.',
    fontSize:10.5,color:GREY,alignment:'center',italics:true,lineHeight:1.3,margin:[0,0,0,28]});
  s.push({canvas:[{type:'line',x1:140,y1:0,x2:345,y2:0,lineWidth:0.6,lineColor:'#cccccc'}],margin:[0,0,0,12]});
  const meta=[['Prepared by','Kayd Solutions (independent evaluator)'],
    ['Repo / branch','idbac25/Bayzara · claude/water-utility-merger-research-Qh7FK'],
    ['Date','2026-06-12'],
    ['Status','Phase 1 in progress; borehole audit reference delivered'],
    ['Use','Carry to desktop cloud conversation to continue detailed document work']];
  s.push({table:{widths:['auto','*'],body:meta.map(r=>[
    {text:r[0],bold:true,fontSize:9,color:BLUE,margin:[0,2,0,2]},
    {text:r[1],fontSize:9,color:DARK,margin:[0,2,0,2]}])},layout:'noBorders',margin:[60,0,60,0]});
  s.push({text:'',pageBreak:'after'});
  return s;
}
function docDef(){
  return { pageSize:'A4', pageMargins:[55,62,55,50],
    info:{title:'MWSC × BECO Evaluation — Engagement Context Pack', author:'Kayd Solutions', subject:'Engagement handoff / context pack'},
    defaultStyle:{font:'Times',fontSize:10,color:DARK,lineHeight:1.13},
    header:(cur)=> cur===1?null:{columns:[
      {text:RUNNING,fontSize:7.5,color:'#aaa',margin:[55,18,0,0]},
      {text:'Kayd Solutions',alignment:'right',fontSize:7.5,color:'#aaa',margin:[0,18,55,0]}]},
    footer:(cur,tot)=> cur===1?null:{columns:[
      {text:'© Kayd Solutions — Confidential',fontSize:7.5,color:'#aaa',margin:[55,0,0,0]},
      {text:`${cur} / ${tot}`,alignment:'right',fontSize:7.5,color:'#aaa',margin:[0,0,55,0]}],margin:[0,10,0,0]},
    content:[...cover(),...DOC.map(blockToPdf)] };
}
(async()=>{ const out=process.argv[2]||'.';
  await pdfmake.createPdf(docDef()).write(`${out}/MWSC-BECO-Engagement-Context-Pack_Kayd-Solutions.pdf`);
  console.log('Built context pack PDF in',out);
})().catch(e=>{console.error('BUILD ERROR:',e);process.exit(1);});
