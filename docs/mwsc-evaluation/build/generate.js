/* ============================================================================
 * Borehole & Well Evaluation — Authoritative Field & Audit Reference
 * Generator: builds two PDFs (branded "Kayd Solutions" + unbranded) and a
 * Markdown source from a single content model.
 *
 * Setup:  npm i pdfmake@0.3.11
 * Run:    node generate.js
 * ==========================================================================*/
const pdfmake = require('pdfmake');
const fs = require('fs');

pdfmake.addFonts({
  Times:    { normal:'Times-Roman', bold:'Times-Bold', italics:'Times-Italic', bolditalics:'Times-BoldItalic' },
  Helvetica:{ normal:'Helvetica', bold:'Helvetica-Bold', italics:'Helvetica-Oblique', bolditalics:'Helvetica-BoldOblique' },
  Courier:  { normal:'Courier', bold:'Courier-Bold', italics:'Courier-Oblique', bolditalics:'Courier-BoldOblique' }
});

const BLUE='#0b5394', LIGHT='#e8eef6', GREY='#666', DARK='#222', FLAG='#b45309', FLAGBG='#fdf2e2', TIPBG='#eef6ee', TIP='#1f6b32', DEFBG='#eef1f6';
const RUNNING='Borehole & Well Evaluation — Audit Reference';

/* ----------------------------------------------------------------------------
 * CONTENT MODEL  — authored once.
 * Block types:
 *   {h:1|2|3, t}                heading
 *   {p}                         paragraph (string; supports **bold** and _italic_)
 *   {ul:[...]} {ol:[...]}       lists (items support inline emphasis)
 *   {tbl:{head:[...],rows:[[...]],w?:[...]}}   table
 *   {note,kind:'tip'|'flag'|'def',title?}     callout
 *   {form}                      formula / monospace line
 *   {brk:true}                  page break
 *   {sp:n}                      vertical space (pt)
 * --------------------------------------------------------------------------*/
const DOC = [
{h:1,t:'1. How to use this document'},
{p:'This is a reference and audit guide for evaluating water boreholes and wells. It is written for two readers at once: a person with **no technical background**, who needs every term explained in plain language; and a **technical reviewer**, who needs the formulas, the named standards, and the scoring detail. Plain-language explanations come first in each section; the technical depth follows.'},
{p:'Its purpose is not to teach you to operate equipment. Its purpose is to let you **judge whether an evaluation was done correctly** — to know what a competent assessment of a borehole must measure, by which method, against which published standard, and how the result should be scored. Where the people doing the work lack instruments, the document tells you what valid lower-cost substitutes exist and what those substitutes can and cannot prove. This lets you challenge a weak or incomplete evaluation on solid, referenced grounds.'},
{p:'The document covers four evaluation dimensions, then gives a ready-to-use scoring rubric, a bridge from technical findings to economic value, an auditor’s red-flag list, a glossary, and the full list of standards relied upon.'},
{note:'Every standard, formula and guideline value in this document was verified against the issuing body’s own publication before release. The reference list in Section 12 gives the exact title, edition and source for each.', kind:'tip', title:'On accuracy'},

{h:1,t:'2. A plain-language primer'},
{p:'A **borehole** (or **well**) is a deep, narrow hole drilled into the ground to reach water held in the rock and sand beneath the surface. That water-bearing layer is called an **aquifer** — think of it as a buried sponge, not an underground lake. A pump lifts the water up the borehole to the surface.'},
{p:'Four simple questions decide whether a borehole is valuable, and they are the four dimensions of this guide:'},
{ol:[
 '**Is the hole itself sound?** — the physical structure: the lining (casing), the slotted section that lets water in (screen), and the seal at the top. (Section 5 — Structural Integrity.)',
 '**How much water can it give, reliably?** — the yield, and whether the pump can keep up without the water level crashing. (Section 6 — Yield.)',
 '**Is the water safe and pleasant to drink?** — the quality: germs, chemicals, and saltiness. (Section 7 — Water Quality.)',
 '**Will it last — or dry up or turn salty?** — the sustainability of the aquifer over time. (Section 8 — Aquifer Sustainability.)'
]},
{p:'Two everyday ideas you must know before going further:'},
{note:'**Static water level** is the natural resting level of water in the borehole when the pump is OFF. **Dynamic (pumping) water level** is how far the water drops while the pump is ON. The difference between them is the **drawdown** — how much the water level falls to deliver a given flow. A small drawdown for a large flow means a strong, healthy borehole; a large drawdown for a small flow is a warning sign.', kind:'def', title:'Static level, pumping level, drawdown'},
{p:'With those ideas, the single most useful number in the whole field becomes easy to understand: **specific capacity** — the flow you get for each metre the water level drops. It is the borehole’s “fuel gauge,” and watching it over the years tells you whether the borehole is ageing.'},

{h:1,t:'3. The four dimensions and the value bridge'},
{p:'Each dimension is assessed on the same pattern, so you can audit it consistently:'},
{ul:[
 '**What it means** — plain language.',
 '**Key terms** — defined.',
 '**How it is measured** — the gold-standard method and equipment.',
 '**If the equipment is missing** — valid substitutes, and their limits.',
 '**The governing standard** — named and cited.',
 '**What “good” looks like** — thresholds.',
 '**Audit checklist** — what a competent evaluation must contain.',
 '**Scoring** — how the dimension converts to a number and a life-ceiling.'
]},
{p:'Crucially, the technical findings are not the end. They feed an economic conclusion — the **value bridge** of Section 11 — because a borehole’s worth depends on how long it will last (its **remaining useful life**), how much it can sell (**sustainable capacity**), and what it costs to run (**operating cost**). A structurally perfect borehole drawing water that is turning salty is, economically, a short-lived asset, and the scoring must capture that.'},

{brk:true},
{h:1,t:'4. Standards and authorities used'},
{p:'The methods below are anchored in international standards, supported by widely used African national codes for practical field procedure, with the World Health Organization as the authority for water quality. Full citations are in Section 12.'},
{tbl:{w:['auto','*','auto'],head:['Topic','Primary authority / standard','Role'],rows:[
 ['Pumping (yield) tests','ISO 14686:2003; SANS 10299-4:2003; Kenya WRA Code of Practice for Test Pumping (draft); Kruseman & de Ridder (ILRI 47)','How to test and analyse yield'],
 ['Well construction & condition','ANSI/AWWA A100-20; AWWA M21 (5th ed., 2025); Misstear, Banks & Clark (2017)','What a sound well is; how to inspect it'],
 ['Borehole geophysics / logging','US EPA Environmental Geophysics','Down-hole condition & salinity logging'],
 ['Water quality (limits)','WHO Guidelines for Drinking-water Quality, 4th ed. + 1st & 2nd addenda (2022)','Pass/fail values'],
 ['Water sampling','ISO 5667-11:2009 (groundwater); ISO 5667-3:2024 (preservation & handling)','How samples must be taken & handled'],
 ['Water-level measurement','USGS GWPD 4 (electric-tape method)','Static & pumping levels'],
 ['Recharge / sustainability','Healy & Cook (2002); chloride mass balance; USGS','Will it dry up?'],
 ['Valuation bridge','IVS 2025; IPSAS 45','Findings → economic value']
]}},

{brk:true},
{h:1,t:'5. Dimension A — Structural Integrity'},
{p:'**What it means.** Is the physical borehole sound? Over years, the steel or plastic **casing** (the lining that keeps the hole open) can corrode or crack; the **screen** (the slotted section that admits water) can clog or collapse; mineral **encrustation** can choke it; and the **sanitary seal** at the top can fail, letting surface filth and germs fall straight into the water. Structural condition sets a ceiling on how long the borehole can serve, no matter how good the water is.'},
{note:'**Casing** — the pipe lining the borehole. **Screen** — the perforated/slotted casing section opposite the aquifer that lets water in while holding back sand. **Gravel/filter pack** — graded gravel around the screen that filters sand. **Sanitary (grout) seal** — the sealed, raised, grouted wellhead that stops surface water entering. **Encrustation** — mineral scale (iron, calcium) clogging the screen. **Plumbness/verticality** — how straight and vertical the hole is (a crooked hole damages pumps).', kind:'def', title:'Key terms'},
{h:3,t:'How it is measured (gold standard)'},
{ul:[
 '**Down-hole CCTV / borehole camera survey** — a waterproof camera is lowered the full depth, giving a direct video record of casing joints, corrosion, screen condition, encrustation, obstructions and the pump setting. It is the single most decisive structural test.',
 '**Caliper log** — a tool with sprung arms measures the internal diameter continuously down the hole, revealing corrosion (over-size), scaling (under-size), deformation and collapse zones.',
 '**Supporting geophysical logs** — natural-gamma (identifies clay vs sand layers and confirms screen placement) and casing-collar/condition logs (US EPA Environmental Geophysics).',
 '**Verticality / plumbness check** and a **wellhead & sanitary-seal inspection** (against ANSI/AWWA A100-20 construction requirements).'
]},
{note:'If there is no CCTV or caliper tool: (1) **Visual wellhead & headworks inspection** — you can see the seal, apron, casing top, corrosion at surface, and whether the installation is sanitary. (2) **A “dummy” / plumb-and-sounder run** — lowering a weighted line of known diameter detects obstructions, the depth to any blockage, and total accessible depth. (3) **Sand content in pumped water** (settle a sample in a clear cone/jar) — sand indicates screen or gravel-pack failure. (4) **Pump-history & drilling records** — frequent pump failures, sand pumping, or falling output point to structural decline. **Limits:** none of these can see the screen or confirm casing-wall thickness; they can flag a problem but cannot clear a borehole as structurally sound. An evaluation that claims structural soundness with no camera/caliper and no records is asserting more than its evidence supports — a red flag.', kind:'flag', title:'If the equipment is missing'},
{h:3,t:'What “good” looks like'},
{ul:[
 'Casing and screen intact; no significant corrosion, cracking or collapse on CCTV.',
 'Caliper diameter close to as-built; no major scaling or deformation.',
 'A sound, raised, grouted **sanitary seal**; clean headworks; no surface-water ingress path.',
 'Negligible sand in pumped water; hole vertical enough for the installed pump.'
]},
{note:'A competent structural evaluation should contain: a dated CCTV video (or a clear written reason it could not be run, with the substitutes used); a caliper or diameter check; confirmation of casing/screen material and condition; a wellhead/sanitary-seal verdict; a sand-content observation; and a stated total accessible depth versus original drilled depth. Missing any of these without explanation weakens the evaluation.', kind:'tip', title:'Audit checklist — Structural'},

{brk:true},
{h:1,t:'6. Dimension B — Yield & Hydraulic Performance'},
{p:'**What it means.** How much water the borehole can deliver, **reliably and indefinitely**, without over-stressing it. A borehole that gushes for an hour then runs the water level down to the pump is not a high-yield borehole — it is being over-pumped. Yield is proven by a controlled **pumping test**, not by a driller’s brief air-lift blow during drilling.'},
{note:'**Yield / abstraction rate (Q)** — flow pumped, in litres/second (L/s) or cubic-metres/day (m³/day). **Pumping test** — a controlled test where the borehole is pumped and water levels recorded. **Specific capacity (Sc)** — yield per metre of drawdown. **Transmissivity (T)** — how easily the whole aquifer thickness transmits water (m²/day). **Storativity (S)** — how much water the aquifer releases per unit area per unit head drop (a small dimensionless number). **Well efficiency** — how much of the drawdown is “honest” aquifer loss versus wasteful losses caused by the well itself.', kind:'def', title:'Key terms'},
{h:3,t:'The three standard tests (ISO 14686 / SANS 10299-4)'},
{ol:[
 '**Step-drawdown test** — the borehole is pumped at three or more increasing rates (“steps”), each held ≥ 60 minutes, recording the drawdown at each. It reveals the borehole’s **efficiency** and the rate beyond which it becomes uneconomic to pump. It is the diagnostic test.',
 '**Constant-rate test** — the borehole is then pumped at one steady rate (held within ± 5%) for an extended period — commonly 24–72 hours — while water levels are logged. This proves the **sustainable yield** and yields the aquifer parameters T and S. It is the proof-of-yield test.',
 '**Recovery test** — the pump is switched off and the water level’s rebound is recorded. Recovery cross-checks transmissivity and confirms the aquifer is replenishing. A borehole that recovers slowly or incompletely is a warning.'
]},
{h:3,t:'The core calculations (with worked examples)'},
{p:'**Specific capacity** — the fuel gauge:'},
{form:'Sc = Q / s        (yield per unit drawdown)'},
{p:'_Example:_ pumping Q = 20 L/s causes a drawdown s = 8 m. Then Sc = 20 / 8 = **2.5 L/s per metre**. (Equivalently 20 L/s = 1 728 m³/day, so Sc ≈ 216 m³/day per metre.) Re-measured years later, a fall in Sc at the same rate signals clogging or ageing — this is the primary **deterioration indicator**.'},
{p:'**Well efficiency** — from the step-drawdown test, Jacob (1947) splits drawdown into honest aquifer loss and wasteful well loss:'},
{form:'s = B·Q + C·Q²     ( B·Q = aquifer loss ; C·Q² = well loss )\nEfficiency Lp = B·Q / (B·Q + C·Q²)'},
{p:'_Example:_ at the working rate the aquifer loss is 6 m and the well loss is 2 m, total drawdown 8 m. Efficiency = 6 / 8 = **75%**. Guide: **> 80% excellent; 70–80% good; ~65% is the usual minimum acceptable; < 65% poor → rehabilitation indicated.** (Note: Rorabaugh (1953) generalised the exponent from 2 to about 2.5; the classic Jacob form uses 2.)'},
{p:'**Transmissivity & storativity** — from the constant-rate test. The rigorous solution is the Theis (1935) equation; the practical straight-line method is Cooper–Jacob (1946):'},
{form:'Theis:        s = (Q / 4πT)·W(u),   u = r²S / (4Tt)\nCooper-Jacob: T = 2.30·Q / (4π·Δs)\n              S = 2.25·T·t₀ / r²   (valid when u is small, <~0.05)'},
{p:'_Where_ Q = pumping rate, Δs = drawdown change per log-cycle of time on a semi-log plot, t₀ = the time-axis intercept, r = distance to the observation well, t = elapsed time. _Example:_ Q = 1 728 m³/day and Δs = 1.5 m per log-cycle give T = 2.30 × 1 728 / (4π × 1.5) ≈ **211 m²/day**. The **recovery** analysis uses the same slope formula on residual drawdown to confirm T (it confirms T reliably, but not S directly).'},
{note:'If there is no test-pump rig or data-logger: (1) **Bucket-and-stopwatch** on the existing pump gives a real flow rate Q (time to fill a known volume). (2) A **water-level dipper** (electric contact tape — USGS GWPD 4) gives static and pumping levels, hence drawdown and a **single-point specific capacity** — the most valuable cheap number you can get. (3) Running the existing pump at a steady rate for several hours while dipping the level is a **poor-man’s constant-rate test** — it will not give clean T and S, but it shows whether the level stabilises (good) or keeps falling (over-pumping). **Limits:** without a proper step test you cannot state efficiency; without a multi-hour constant-rate test at a controlled rate you cannot certify sustainable yield. A yield quoted only from the driller’s air-lift figure, with no drawdown data, is not a proven yield — a red flag.', kind:'flag', title:'If the equipment is missing'},
{note:'A competent yield evaluation should contain: a step-drawdown test (efficiency); a constant-rate test of adequate duration at a stated, steady rate with a full water-level record; a recovery record; the computed specific capacity, well efficiency, T and S; and a stated **recommended sustainable abstraction rate** (not just the maximum the pump can pull). Yield figures with no drawdown data are unverifiable.', kind:'tip', title:'Audit checklist — Yield'},

{brk:true},
{h:1,t:'7. Dimension C — Water Quality'},
{p:'**What it means.** Is the water safe and acceptable to drink? Quality splits into **health-based** limits that must not be breached (germs and toxic chemicals) and **acceptability/operational** limits that affect taste, smell and appearance (such as saltiness) but are not, at moderate levels, directly a health risk. In a coastal setting the saltiness group is the one to watch most closely.'},
{p:'The authority is the **WHO Guidelines for Drinking-water Quality, 4th edition incorporating the 1st & 2nd addenda (2022)**. Samples must be taken and handled to **ISO 5667-11:2009** (groundwater sampling) and **ISO 5667-3:2024** (preservation & handling) — otherwise the laboratory result, however precise, may describe a spoiled sample rather than the water.'},
{tbl:{w:['*','auto','*'],head:['Parameter','WHO value','Type / note'],rows:[
 ['E. coli / thermotolerant coliforms','Not detectable in any 100 mL','Health — microbial. The decisive safety test.'],
 ['Arsenic','0.01 mg/L','Health (provisional)'],
 ['Fluoride','1.5 mg/L','Health'],
 ['Nitrate (as NO₃)','50 mg/L','Health (protects bottle-fed infants)'],
 ['Total Dissolved Solids (TDS)','~600 good; >1000 unpalatable','Acceptability (no health value)'],
 ['Chloride','~200–300 mg/L taste threshold','Acceptability — saltiness'],
 ['Sulfate','~250 mg/L taste; laxative >~1000','Acceptability'],
 ['Sodium','~200 mg/L taste threshold','Acceptability'],
 ['pH','~6.5–8.5 (prefer <8 for chlorination)','Operational'],
 ['Turbidity','<1 NTU for effective disinfection','Operational / acceptability']
]}},
{note:'WHO does **not** set health-based limits for TDS, chloride, sulfate, sodium, pH or turbidity — these are acceptability or operational parameters. They still matter enormously here: rising chloride/TDS is the fingerprint of **seawater intrusion** (Section 8), and high turbidity defeats disinfection.', kind:'def', title:'Health vs acceptability'},
{note:'If there is no accredited laboratory: (1) **Field test kits / hand-held meters** measure pH, electrical conductivity (a fast salinity proxy), turbidity, nitrate, fluoride, free chlorine and arsenic on the spot — indicative, not legally definitive. (2) **Portable microbiology** (membrane-filtration field kits, or H₂S presence/absence vials) screens for faecal contamination. (3) **EC meter** is the cheapest, most important coastal instrument — it tracks salinity continuously and converts roughly to TDS (TDS ≈ 0.64 × EC in µS/cm; use ~0.75 for seawater-affected water). **Limits:** field kits cannot confirm trace metals (arsenic) or speciation to regulatory confidence, and a single grab sample says nothing about seasonal swings. A quality verdict from one sample in one season — especially with no microbiology and no salinity figure — is a red flag.', kind:'flag', title:'If the equipment is missing'},
{note:'A competent quality evaluation should contain: a microbiological result (E. coli); the key health chemicals (arsenic, fluoride, nitrate); the full **salinity suite** (EC, TDS, chloride, sodium, sulfate) in a coastal setting; pH and turbidity; the **sampling method and chain-of-custody** (ISO 5667); and ideally **more than one season** of data. One dry-season grab sample is not a quality assessment.', kind:'tip', title:'Audit checklist — Quality'},

{brk:true},
{h:1,t:'8. Dimension D — Aquifer Sustainability & Saltwater Intrusion'},
{p:'**What it means.** Will the borehole still deliver good water in ten or twenty years — or will the water table fall and the water turn salty? A borehole can pass every structural, yield and quality test today and still be a poor long-term asset if the aquifer is being drawn down faster than nature refills it, or if the sea is creeping in. For a coastal, semi-arid setting this dimension is often the **largest single risk** to value.'},
{note:'**Recharge** — the rate at which rain and rivers refill the aquifer. **Abstraction** — the rate being pumped out. **Sustainable yield** — the rate that can be pumped indefinitely without ongoing decline (this has replaced the older, discredited idea of a fixed “safe yield”). **Seawater / saline intrusion** — salt water moving into a fresh aquifer when over-pumping lowers the freshwater pressure. **Specific yield (Sy)** — the drainable water fraction of an unconfined aquifer.', kind:'def', title:'Key terms'},
{h:3,t:'How it is measured'},
{ul:[
 '**Long-term water-level monitoring** — repeated static-level measurements over seasons and years. A persistent multi-year decline is the clearest “this aquifer is depleting” signal. (Dataloggers ideal; a manual dipper and a logbook suffice.)',
 '**Recharge vs abstraction balance** — estimated by the **Water-Table Fluctuation** method (Healy & Cook, 2002) or the **chloride mass-balance** method; using more than one method raises confidence.',
 '**Salinity trend monitoring** — tracking **chloride** and **electrical conductivity (EC)** over time; a steady rise is the signature of intrusion. **EC depth-profiling** inside the borehole locates the fresh/salt boundary.',
 '**Interference check** — closely spaced boreholes pumping together draw each other down; the combined drawdown can exceed what any single test showed.'
]},
{h:3,t:'The coastal early-warning rule (Ghyben–Herzberg)'},
{p:'In a coastal aquifer, fresh water floats on salt water, and the boundary sits surprisingly deep — and is alarmingly sensitive to the water table:'},
{form:'z ≈ 40 × h\n( z = depth of the fresh/salt interface below sea level ;\n  h = height of the water table above sea level )'},
{p:'_Why it matters:_ for every **1 m** the water table is **above** sea level, the fresh/salt boundary sits about **40 m below** it. So if over-pumping lowers the water table by just **0.5 m**, the salt boundary rises about **20 m** — a small surface change drives a large underground advance of salt toward the screens. This is why modest-looking water-level decline near the coast is a serious warning. _Recharge example (Water-Table Fluctuation):_ R = Sy × Δh; with Sy = 0.10 and a water-table rise of 0.5 m after rains, recharge ≈ 0.05 m = **50 mm**.'},
{note:'If there is no datalogger or geophysics: (1) A **dipper and a dated logbook** build the water-level trend over time — the single most valuable sustainability record, and almost free. (2) An **EC meter reading logged each visit** builds the salinity trend — the cheapest intrusion alarm there is. (3) **Community/operator memory** of boreholes that have already gone salty or dry nearby is real evidence of aquifer stress. **Limits:** without depth-profiling you cannot map the salt boundary precisely, and short records cannot separate a drought dip from true long-term decline — but a multi-year trend, even hand-recorded, is strong evidence. A coastal evaluation with **no water-level history and no salinity trend** has not assessed sustainability at all — a red flag.', kind:'flag', title:'If the equipment is missing'},
{note:'A competent sustainability evaluation should contain: a water-level record over time (the longer the better) with a stated trend; a recharge-vs-abstraction view; a **chloride/EC trend** in any coastal setting; an interference consideration where boreholes are clustered; and an explicit **sustainable abstraction recommendation** with the intrusion risk stated. Absence of any time-series is the tell-tale of a snapshot dressed up as an assessment.', kind:'tip', title:'Audit checklist — Sustainability'},

{brk:true},
{h:1,t:'9. The scoring rubric'},
{p:'This rubric turns the four dimensions into numbers you can defend. It does two things: it produces an overall **Borehole Condition & Sustainability Index (BCSI, 0–100)** with a letter grade, and it sets a **remaining-useful-life (RUL) ceiling** using a “weakest-link” rule — because a borehole is only as long-lived as its worst dimension.'},
{h:3,t:'Step 1 — Score each dimension 0–100'},
{p:'Within each dimension, score each indicator on the band it falls in, then average the indicators to get the dimension score.'},
{tbl:{w:['*','auto','auto','auto','auto'],head:['Indicator','100','75','50','25 / 0'],rows:[
 ['A. Casing & screen (CCTV/caliper or proxy)','Intact','Minor corrosion / scale','Significant','Severe / collapse / failed'],
 ['A. Sanitary seal & headworks','Sound, sealed','Minor defect','Poor','None / contaminating'],
 ['A. Sand in water / obstruction','None','Trace','Noticeable','Heavy / blocked'],
 ['B. Well efficiency','>80%','70–80%','65–70%','<65%'],
 ['B. Specific-capacity decline vs baseline','<10%','10–25%','25–40%','>40%'],
 ['B. Sustainable yield vs demand','Surplus','Meets','Marginal','Deficit'],
 ['C. Microbial (E. coli)','Absent','—','—','Present (=0 untreated)'],
 ['C. Health chemicals (As/F/NO₃)','All pass','—','One exceedance','Multiple exceedances'],
 ['C. Salinity (chloride/TDS)','Fresh','Marginal','Brackish','Saline'],
 ['D. Water-level trend','Stable / rising','Slight decline','Moderate decline','Steep decline'],
 ['D. Salinity trend over time','Stable','—','Slow rise','Rapid rise'],
 ['D. Recharge vs abstraction','Surplus','Balanced','Tight','Deficit']
]}},
{h:3,t:'Step 2 — Combine into the BCSI and grade'},
{p:'Average the four dimension scores (equal weight) for the overall index, then read the grade:'},
{tbl:{w:['auto','auto','*'],head:['BCSI','Grade','Meaning'],rows:[
 ['85–100','A — Excellent','Sound on all four dimensions; long life expected.'],
 ['70–84','B — Good','Minor issues; routine maintenance.'],
 ['55–69','C — Fair','Real weaknesses; plan rehabilitation / monitoring.'],
 ['40–54','D — Poor','Major weakness in at least one dimension; near-term action.'],
 ['<40','E — Critical','Failing or unsustainable; replacement likely.']
]}},
{note:'The index can hide a fatal flaw — a borehole scoring well on three dimensions but **“Saline / rapid salinity rise”** on the fourth is not a “good” borehole. Always apply the **weakest-link override**: any dimension in the 0–25 band caps the overall grade at D or below, regardless of the average.', kind:'flag', title:'Weakest-link override'},
{h:3,t:'Step 3 — Remaining Useful Life (RUL) ceiling'},
{p:'Each dimension’s worst indicator implies a life ceiling. The borehole’s RUL is the **minimum** of the four — the weakest link.'},
{tbl:{w:['*','auto','auto','auto'],head:['Dimension worst-case','Healthy','Caution','Critical'],rows:[
 ['Structural (casing/screen)','>15 yr','5–15 yr','<5 yr'],
 ['Yield (efficiency / Sc decline)','>15 yr','7–15 yr','<7 yr'],
 ['Quality (salinity / chemicals)','>15 yr','5–15 yr','<5 yr'],
 ['Sustainability (level/salinity trend)','>15 yr','5–15 yr','<5 yr (depleting)']
]}},
{form:'RUL = minimum( structural life, yield life, quality life, sustainability life )'},

{brk:true},
{h:1,t:'10. Worked example — scoring one borehole'},
{p:'_Borehole BH-07 (illustrative)._ CCTV shows minor screen encrustation but intact casing; sanitary seal sound; trace sand. Step test gives 72% efficiency; specific capacity has fallen ~20% from the original; sustainable yield meets current demand. Quality: E. coli absent, arsenic/fluoride/nitrate pass, but chloride is in the marginal–brackish range. Water-level trend shows a slight multi-year decline; EC is rising slowly; abstraction is tight against recharge.'},
{tbl:{w:['*','auto','auto'],head:['Dimension','Indicator scores','Dimension score'],rows:[
 ['A. Structural','75, 100, 75','83'],
 ['B. Yield','75, 75, 75','75'],
 ['C. Quality','100, 100, 50','83'],
 ['D. Sustainability','75, 50, 50','58']
]}},
{p:'**BCSI** = (83 + 75 + 83 + 58) / 4 = **75 → Grade B (Good).** But the **sustainability** dimension (rising salinity, declining level, tight recharge) carries the lowest score and the real risk. **RUL ceiling** is set by sustainability — in the “caution” band, say **8–10 years** — not by the healthier structural/quality dimensions. The verdict: a presently good borehole whose **economic life is governed by a salinising, stressed aquifer** — exactly the nuance a single headline number would miss.'},

{h:1,t:'11. The value bridge — from findings to economic value'},
{p:'For an economic evaluation, each technical finding maps to a value driver. This is how the borehole assessment feeds a depreciated-replacement-cost (cost approach) and a discounted-cash-flow (income approach) valuation.'},
{tbl:{w:['*','*'],head:['Technical finding','Economic effect'],rows:[
 ['Remaining Useful Life (RUL)','Sets the depreciation in the cost approach and the cash-flow horizon in the income approach.'],
 ['Sustainable yield (m³/day)','Sets revenue capacity (volume × tariff).'],
 ['Well efficiency & pumping level','Sets pumping energy cost — the largest operating cost (and the point where cheaper power changes the economics).'],
 ['Water quality / salinity','Sets treatment cost; brackish water may need blending or desalination, or caps the price.'],
 ['Condition grade & risk','Informs the discount rate / risk premium.']
]}},
{form:'Cost approach:   Remaining value ≈ Replacement-cost-new × (RUL / total economic life) × condition factor\nIncome approach: Value ≈ NPV over RUL of [ (sustainable yield × tariff) − (energy + treatment + O&M) ]'},
{note:'The weakest-link rule carries straight into value: a borehole’s worth is anchored to its **shortest-lived dimension**. This is why a structurally perfect borehole over a salinising aquifer is valued as a short-life asset — and why the salinity and water-level trends, not the steel, often drive the number.', kind:'tip', title:'The key valuation principle'},

{brk:true},
{h:1,t:'12. Auditor’s red flags — signs of a weak evaluation'},
{p:'When reviewing someone else’s borehole evaluation, treat any of the following as a reason to question the conclusion:'},
{ul:[
 'Yield quoted from the driller’s **air-lift** figure, or from the pump’s rating, with **no drawdown data** and no constant-rate test.',
 'A constant-rate test far **shorter** than the standard guidance (commonly 24–72 h per SANS 10299-4 / ISO 14686), or with no stated, steady rate.',
 'Specific capacity stated **without** the drawdown and flow it was derived from.',
 'No **recovery** measurement after pumping.',
 'Water quality from a **single grab sample**, one season, with no microbiology and — in a coastal setting — no salinity figures.',
 'Sampling with **no method or chain-of-custody** (ISO 5667), so the result may describe a degraded sample.',
 'In a coastal/semi-arid setting, **no water-level time-series and no chloride/EC trend** — sustainability simply not assessed.',
 'A claim of **structural soundness** with no CCTV, no caliper and no records.',
 'A single headline grade with **no weakest-link check** — hiding a fatal salinity or depletion problem behind three healthy dimensions.',
 'Treating **old, depreciated public-era assets as new**, or ignoring **interference** between clustered boreholes.'
]},

{h:1,t:'13. Glossary'},
{tbl:{w:['auto','*'],head:['Term','Plain meaning'],rows:[
 ['Aquifer','Underground water-bearing layer of rock/sand — a buried “sponge.”'],
 ['Confined / unconfined','Confined: aquifer trapped under an impermeable layer, under pressure. Unconfined: open to the surface, with a free water table.'],
 ['Water table','The top surface of the saturated zone in an unconfined aquifer.'],
 ['Static water level','Resting water level with the pump OFF.'],
 ['Dynamic / pumping level','Water level while the pump is ON.'],
 ['Drawdown (s)','How far the level falls under pumping = pumping level − static level.'],
 ['Yield / abstraction (Q)','Flow pumped (L/s or m³/day).'],
 ['Specific capacity (Sc)','Yield per metre of drawdown (Q/s) — the “fuel gauge.”'],
 ['Transmissivity (T)','How readily the full aquifer thickness transmits water (m²/day).'],
 ['Storativity (S)','Water released per unit area per unit head drop (dimensionless).'],
 ['Specific yield (Sy)','Drainable water fraction of an unconfined aquifer.'],
 ['Well efficiency','Share of drawdown that is honest aquifer loss vs wasteful well loss.'],
 ['Casing / screen','The lining pipe / the slotted section that admits water.'],
 ['Gravel pack','Graded gravel around the screen that filters out sand.'],
 ['Sanitary seal','Sealed, grouted wellhead that stops surface water entering.'],
 ['Encrustation','Mineral scale clogging the screen.'],
 ['EC','Electrical conductivity — a fast salinity proxy (µS/cm).'],
 ['TDS','Total dissolved solids — dissolved mineral content (mg/L).'],
 ['Turbidity (NTU)','Cloudiness of water; high NTU defeats disinfection.'],
 ['Recharge','Rate at which the aquifer is naturally refilled.'],
 ['Sustainable yield','Rate that can be pumped indefinitely without ongoing decline.'],
 ['Saline / seawater intrusion','Salt water moving into a fresh aquifer when over-pumped.'],
 ['Ghyben–Herzberg','Coastal rule: fresh/salt interface sits ~40× the water-table height below sea level.'],
 ['RUL','Remaining useful life — years of productive service left.'],
 ['DRC','Depreciated replacement cost — replacement cost adjusted for age/condition.']
]}},

{brk:true},
{h:1,t:'14. References (verified)'},
{ol:[
 'International Organization for Standardization. **ISO 14686:2003** — _Hydrometric determinations — Pumping tests for water wells — Considerations and guidelines for design, performance and use._ (Current edition; revision ISO/DIS 14686 in progress. Supersedes BS 6316:1992.) iso.org/standard/20977.html',
 'ISO. **ISO 5667-11:2009** — _Water quality — Sampling — Part 11: Guidance on sampling of groundwaters._ iso.org/standard/42990.html',
 'ISO. **ISO 5667-3:2024** — _Water quality — Sampling — Part 3: Preservation and handling of water samples._ iso.org/standard/82273.html',
 'World Health Organization. **Guidelines for Drinking-water Quality, 4th ed. incorporating the 1st & 2nd addenda** (2022). ISBN 9789240045064. who.int',
 'American Water Works Association. **ANSI/AWWA A100-20** — _Water Wells_ (2020). awwa.org',
 'AWWA. **Manual M21 — Groundwater Operations**, 5th ed. (2025). awwa.org',
 'South African Bureau of Standards. **SANS 10299** — _Development, maintenance and management of groundwater resources_; in particular **SANS 10299-4:2003 — Test-pumping of water boreholes._',
 'Department of Water Affairs & Forestry (now DWS), South Africa. **South African Water Quality Guidelines, Vol. 1: Domestic Use**, 2nd ed. (1996).',
 'Water Resources Authority (Kenya). **Code of Practice for Test Pumping of Boreholes** (publicly posted version is a DRAFT — confirm final adoption before formal citation). waterauthority.go.ke',
 'US Environmental Protection Agency. **Environmental Geophysics — Borehole Geophysical Methods** (caliper, gamma, fluid temperature & conductivity, flow logging). epa.gov/environmental-geophysics',
 'US Geological Survey. **GWPD 4 — Measuring water levels by use of an electric tape.** pubs.usgs.gov',
 'Misstear, B., Banks, D. & Clark, L. **Water Wells and Boreholes**, 2nd ed., Wiley-Blackwell (2017; 1st ed. 2006). _(Independent reference text — not a BGS publication.)_',
 'Kruseman, G.P. & de Ridder, N.A. **Analysis and Evaluation of Pumping Test Data**, 2nd ed., ILRI Publication 47.',
 'Healy, R.W. & Cook, P.G. (2002). _Using groundwater levels to estimate recharge._ Hydrogeology Journal.',
 'Foundational methods: Theis (1935); Cooper & Jacob (1946); Jacob (1947, step-drawdown); Rorabaugh (1953); Badon-Ghijben (1888) & Herzberg (1901).',
 'Valuation bridge: **International Valuation Standards (IVS) 2025**; **IPSAS 45 — Property, Plant and Equipment** (infrastructure / depreciated replacement cost).'
]},
{sp:8},
{p:'_End of document._'}
];

/* ======================= INLINE PARSER (for PDF) ===========================*/
function parseInline(s){
  if(typeof s!=='string') return s;
  const out=[]; const re=/(\*\*[^*]+\*\*|_[^_]+_)/g; let last=0,m;
  while((m=re.exec(s))){
    if(m.index>last) out.push({text:s.slice(last,m.index)});
    const tok=m[0];
    if(tok.startsWith('**')) out.push({text:tok.slice(2,-2),bold:true});
    else out.push({text:tok.slice(1,-1),italics:true});
    last=re.lastIndex;
  }
  if(last<s.length) out.push({text:s.slice(last)});
  return out.length?out:[{text:s}];
}

/* ======================= PDF RENDERER ======================================*/
const tableLayout = {
  hLineWidth:(i,node)=> (i===0||i===node.table.body.length||i===1)?0.8:0.4,
  vLineWidth:()=>0.4,
  hLineColor:(i)=> i===1?BLUE:'#bbb',
  vLineColor:()=>'#bbb',
  fillColor:(rowIndex)=> rowIndex===0?BLUE:(rowIndex%2===0?'#f4f7fb':null),
  paddingTop:()=>3, paddingBottom:()=>3, paddingLeft:()=>5, paddingRight:()=>5
};

function calloutColors(kind){
  if(kind==='flag') return {bg:FLAGBG, bar:FLAG, label:FLAG};
  if(kind==='tip') return {bg:TIPBG, bar:TIP, label:TIP};
  return {bg:DEFBG, bar:BLUE, label:BLUE};
}

function blockToPdf(b){
  if(b.brk) return {text:'', pageBreak:'after'};
  if(b.sp!==undefined) return {text:'', margin:[0,b.sp/2,0,0]};
  if(b.h){
    if(b.h===1) return {stack:[
      {text:b.t, font:'Helvetica', bold:true, fontSize:15, color:BLUE, margin:[0,4,0,3]},
      {canvas:[{type:'line',x1:0,y1:0,x2:485,y2:0,lineWidth:1.1,lineColor:BLUE}]}
    ], margin:[0,6,0,8]};
    if(b.h===2) return {text:b.t, font:'Helvetica', bold:true, fontSize:12.5, color:BLUE, margin:[0,8,0,4]};
    return {text:b.t, font:'Helvetica', bold:true, fontSize:10.5, color:DARK, margin:[0,7,0,3]};
  }
  if(b.p) return {text:parseInline(b.p), margin:[0,0,0,6], alignment:'justify', lineHeight:1.18};
  if(b.ul) return {ul:b.ul.map(parseInline), margin:[6,0,0,7], lineHeight:1.16};
  if(b.ol) return {ol:b.ol.map(parseInline), margin:[6,0,0,7], lineHeight:1.16};
  if(b.form) return {table:{widths:['*'],body:[[{text:b.form, font:'Courier', fontSize:9, color:'#0a3d62', margin:[6,5,6,5]}]]},
                     layout:{hLineWidth:()=>0.5,vLineWidth:()=>0.5,hLineColor:()=>'#cfd9e6',vLineColor:()=>'#cfd9e6',fillColor:()=>'#f3f6fb'}, margin:[0,2,0,8]};
  if(b.tbl){
    const head=b.tbl.head.map(h=>({text:h, bold:true, color:'white', font:'Helvetica', fontSize:9}));
    const body=[head, ...b.tbl.rows.map(r=>r.map(c=>({text:parseInline(String(c)), fontSize:9})))];
    return {table:{headerRows:1, widths:b.tbl.w||b.tbl.head.map(()=> '*'), body, dontBreakRows:true}, layout:tableLayout, margin:[0,2,0,9], fontSize:9};
  }
  if(b.note){
    const c=calloutColors(b.kind);
    const inner=[];
    if(b.title) inner.push({text:b.title.toUpperCase(), bold:true, font:'Helvetica', fontSize:8, color:c.label, margin:[0,0,0,2]});
    inner.push({text:parseInline(b.note), fontSize:9.5, color:DARK, lineHeight:1.15});
    return {table:{widths:['*'], body:[[{stack:inner, margin:[8,6,8,6], fillColor:c.bg}]]},
            layout:{hLineWidth:()=>0,vLineWidth:(i)=> i===0?2.5:0, vLineColor:()=>c.bar, paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0},
            margin:[0,2,0,9]};
  }
  return {text:''};
}

function coverStack(branded){
  const s=[];
  s.push({text:'', margin:[0,90,0,0]});
  if(branded){
    s.push({text:'KAYD SOLUTIONS', font:'Helvetica', bold:true, fontSize:20, color:BLUE, alignment:'center', characterSpacing:3, margin:[0,0,0,4]});
    s.push({text:'Independent Economic & Technical Evaluation', font:'Helvetica', fontSize:9.5, color:GREY, alignment:'center', characterSpacing:1, margin:[0,0,0,26]});
  } else {
    s.push({text:'', margin:[0,20,0,0]});
  }
  s.push({canvas:[{type:'line',x1:60,y1:0,x2:425,y2:0,lineWidth:1.2,lineColor:BLUE}], margin:[0,0,0,18]});
  s.push({text:'Borehole & Well Evaluation', font:'Helvetica', bold:true, fontSize:27, color:DARK, alignment:'center', margin:[0,0,0,6]});
  s.push({text:'An Authoritative Field & Audit Reference', font:'Helvetica', fontSize:14, color:BLUE, alignment:'center', margin:[0,0,0,16]});
  s.push({text:'How to measure, verify and score the structural integrity, yield,\nwater quality and longevity of water boreholes — with the governing\nstandards, calculation methods, equipment (and no-equipment\nalternatives), and a ready-to-use scoring rubric.',
          fontSize:10.5, color:GREY, alignment:'center', italics:true, lineHeight:1.3, margin:[0,0,0,30]});
  s.push({canvas:[{type:'line',x1:140,y1:0,x2:345,y2:0,lineWidth:0.6,lineColor:'#cccccc'}], margin:[0,0,0,12]});
  const meta=[
    ['Document','Boreholes & Wells (Module A–D). Reservoirs, pumps & generators follow separately.'],
    ['Standards spine','International (ISO, AWWA, WHO) + African field codes (SANS, Kenya WRA).'],
    ['Audience','Non-technical reviewers and technical evaluators.'],
    ['Status','Reference / audit guide. Standards citations independently verified.']
  ];
  s.push({table:{widths:['auto','*'], body:meta.map(r=>[
    {text:r[0], bold:true, fontSize:9, color:BLUE, margin:[0,2,0,2]},
    {text:r[1], fontSize:9, color:DARK, margin:[0,2,0,2]}
  ])}, layout:'noBorders', margin:[70,0,70,0]});
  s.push({text:'', pageBreak:'after'});
  return s;
}

function buildDocDef(branded){
  return {
    pageSize:'A4', pageMargins:[55,64,55,52],
    info:{ title:'Borehole & Well Evaluation — Audit Reference', author: branded?'Kayd Solutions':'', subject:'Borehole and well technical evaluation reference' },
    defaultStyle:{ font:'Times', fontSize:10.5, color:DARK, lineHeight:1.15 },
    header:(cur)=> cur===1?null:{ columns:[
        {text:RUNNING, fontSize:7.5, color:'#aaa', margin:[55,20,0,0]},
        {text: branded?'Kayd Solutions':'', alignment:'right', fontSize:7.5, color:'#aaa', margin:[0,20,55,0]}
      ]},
    footer:(cur,tot)=> cur===1?null:{ columns:[
        {text: branded?'© Kayd Solutions — Confidential':'', fontSize:7.5, color:'#aaa', margin:[55,0,0,0]},
        {text:`${cur} / ${tot}`, alignment:'right', fontSize:7.5, color:'#aaa', margin:[0,0,55,0]}
      ], margin:[0,12,0,0]},
    content:[ ...coverStack(branded), ...DOC.map(blockToPdf) ]
  };
}

/* ======================= MARKDOWN RENDERER =================================*/
function blockToMd(b){
  if(b.brk) return '\n---\n';
  if(b.sp!==undefined) return '';
  if(b.h) return `${'#'.repeat(b.h+1)} ${b.t}`;
  if(b.p) return b.p;
  if(b.ul) return b.ul.map(i=>`- ${i}`).join('\n');
  if(b.ol) return b.ol.map((i,n)=>`${n+1}. ${i}`).join('\n');
  if(b.form) return '```\n'+b.form+'\n```';
  if(b.note){ const tag=b.kind==='flag'?'⚠️':(b.kind==='tip'?'✅':'ℹ️');
    return `> ${tag} **${b.title||(b.kind==='flag'?'Watch out':'Note')}** — ${b.note}`; }
  if(b.tbl){
    const head='| '+b.tbl.head.join(' | ')+' |';
    const sep='| '+b.tbl.head.map(()=>'---').join(' | ')+' |';
    const rows=b.tbl.rows.map(r=>'| '+r.map(c=>String(c).replace(/\n/g,' ')).join(' | ')+' |');
    return [head,sep,...rows].join('\n');
  }
  return '';
}
function buildMarkdown(){
  const title='# Borehole & Well Evaluation — An Authoritative Field & Audit Reference\n\n'+
    '_How to measure, verify and score the structural integrity, yield, water quality and longevity of water boreholes._\n\n'+
    '_Standards spine: International (ISO, AWWA, WHO) + African field codes (SANS, Kenya WRA). All standard citations independently verified._\n';
  return title+'\n'+DOC.map(b=>blockToMd(b)).filter(x=>x!=='').join('\n\n')+'\n';
}

/* ======================= BUILD ============================================*/
(async()=>{
  const outDir = process.argv[2] || '.';
  await pdfmake.createPdf(buildDocDef(true)).write(`${outDir}/Borehole-Well-Evaluation-Reference_Kayd-Solutions.pdf`);
  await pdfmake.createPdf(buildDocDef(false)).write(`${outDir}/Borehole-Well-Evaluation-Reference.pdf`);
  fs.writeFileSync(`${outDir}/borehole-well-evaluation-reference.md`, buildMarkdown());
  console.log('Built: branded PDF, unbranded PDF, and Markdown source in', outDir);
})().catch(e=>{ console.error('BUILD ERROR:', e); process.exit(1); });
