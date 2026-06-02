/**
 * drugConfig.js — Merkezi İlaç Konfigürasyonu
 * ============================================
 * Tüm tablar bu dosyadan renk, etiket ve meta bilgilerini alır.
 * Yeni ilaç eklemek için yalnızca bu dosyaya ve all_drugs.py'ye ekleme yapılır.
 * Renkler all_drugs.py ile %100 senkronize tutulur.
 */

export const DRUG_PALETTE = {
  // ── ODE modelli ilaçlar ─────────────────────────────────────────────────
  "6mp":          { color:"#3b82f6", label:"6-MP",    labelFull:"6-Mercaptopurine",       ode:true,  peg:false },
  "mtx":          { color:"#10b981", label:"MTX",     labelFull:"Methotrexate",            ode:true,  peg:false },
  "vcr":          { color:"#f59e0b", label:"VCR",     labelFull:"Vincristine",             ode:true,  peg:false },
  "daunorubicin": { color:"#ef4444", label:"DNR",     labelFull:"Daunorubicin",            ode:true,  peg:false },
  // ── Ayrı PK simülatörü ─────────────────────────────────────────────────
  "asparaginase": { color:"#8b5cf6", label:"PEG-ASP", labelFull:"Pegaspargase",           ode:false, peg:true  },
  // ── Yeni ODE modelli ilaçlar (v2 — eklenmiş) ──────────────────────────
  "corticosteroid":   { color:"#ec4899", label:"CS",    labelFull:"Corticosteroid",         ode:true,  peg:false },
  "cytarabine":       { color:"#06b6d4", label:"Ara-C", labelFull:"Cytarabine",             ode:true,  peg:false },
  "cyclophosphamide": { color:"#84cc16", label:"CPM",   labelFull:"Cyclophosphamide",       ode:true,  peg:false },
  "6tg":              { color:"#f97316", label:"6-TG",  labelFull:"6-Thioguanine",          ode:true,  peg:false },
  "copanlisib":       { color:"#14b8a6", label:"COP",   labelFull:"Copanlisib",             ode:true,  peg:false },
  "novobiocin":       { color:"#a855f7", label:"NOV",   labelFull:"Novobiocin",             ode:true,  peg:false },
};

/** Renk döndür — bilinmeyen ilaçlar için gri */
export const drugColor = (key) => DRUG_PALETTE[key]?.color  || "#6b7280";

/** Kısa etiket döndür */
export const drugLabel = (key) => DRUG_PALETTE[key]?.label  || key.toUpperCase();

/** Tam ad döndür */
export const drugFull  = (key) => DRUG_PALETTE[key]?.labelFull || key;

/** ODE modelli ilaç key'leri */
export const ODE_DRUG_KEYS = Object.keys(DRUG_PALETTE).filter(k => DRUG_PALETTE[k].ode);

/** Ayrı PK simülatörlü ilaç key'leri */
export const PEG_DRUG_KEYS = Object.keys(DRUG_PALETTE).filter(k => DRUG_PALETTE[k].peg);

/** Simüle edilebilen tüm ilaçlar */
export const SIMULABLE_DRUG_KEYS = [...ODE_DRUG_KEYS, ...PEG_DRUG_KEYS];

// ── Klinik bilgi — Tab2 açıklama paneli ────────────────────────────────────
export const DRUG_CLINICAL_INFO = {
  "6mp": {
    mechanism_tr:"Tiopürin antimetabolit. HGPRT ile 6-TGN'ye dönüşür; DNA sentezini inhibe eder.",
    mechanism_en:"Thiopurine antimetabolite. Converted to 6-TGN by HGPRT; inhibits DNA synthesis.",
    dose_info_tr:"75 mg/m²/gün oral. TPMT poor metabolizer: %50 doz azaltımı zorunludur.",
    dose_info_en:"75 mg/m²/day oral. TPMT poor metabolizer: mandatory 50% dose reduction.",
    monitoring_tr:"Haftalık CBC (başlangıç), aylık CBC (idame); karaciğer fonksiyon testleri.",
    monitoring_en:"Weekly CBC (start), monthly CBC (maintenance); liver function tests.",
    ref:"Lennard, L. (2014). Pharmacogenetics of acute lymphoblastic leukaemia. British Journal of Clinical Pharmacology, 77(4), 624–635. https://doi.org/10.1111/bcp.12248",
  },
  "mtx": {
    mechanism_tr:"Folat antagonisti. DHFR inhibisyonu ile pürin ve pirimidin sentezini bloke eder.",
    mechanism_en:"Folate antagonist. Blocks purine/pyrimidine synthesis via DHFR inhibition.",
    dose_info_tr:"İdame: 20 mg/m²/hafta oral. HD-MTX: 2–5 g/m² IV (konsolidasyon).",
    dose_info_en:"Maintenance: 20 mg/m²/week oral. HD-MTX: 2–5 g/m² IV (consolidation).",
    monitoring_tr:"Karaciğer enzimleri, mukozit takibi; HD protokolde MTX düzeyleri.",
    monitoring_en:"Liver enzymes, mucositis; MTX levels required in HD protocol.",
    ref:"Pui, C. H., Carroll, W. L., Meshinchi, S., & Arceci, R. J. (2011). Biology, risk stratification, and therapy of pediatric acute leukemias. Journal of Clinical Oncology, 29(5), 551–565. https://doi.org/10.1200/JCO.2010.30.1382",
  },
  "vcr": {
    mechanism_tr:"Vinka alkaloid. Tübülin polimerizasyonunu inhibe ederek mitoz durdurur (metafaz blok).",
    mechanism_en:"Vinca alkaloid. Halts mitosis at metaphase by inhibiting tubulin polymerization.",
    dose_info_tr:"1.5 mg/m² IV bolus (max 2 mg). İndüksiyonda haftalık; idarede 28 günde bir.",
    dose_info_en:"1.5 mg/m² IV bolus (max 2 mg). Weekly in induction; every 28d in maintenance.",
    monitoring_tr:"VIPN (nöropati skoru), DTR kaybı, konstipasyon, ileus.",
    monitoring_en:"VIPN (neuropathy score), DTR loss, constipation, ileus.",
    ref:"Gidding, C. E., Kellie, S. J., Kamps, W. A., & de Graaf, S. S. (1999). Vincristine revisited. Critical Reviews in Oncology/Hematology, 29(3), 267–287. https://doi.org/10.1016/S1040-8428(98)00036-4",
  },
  "daunorubicin": {
    mechanism_tr:"Antrasiklik. DNA interkalasyonu + topoizomeraz II inhibisyonu ile sitotoksiktir.",
    mechanism_en:"Anthracycline. Cytotoxic via DNA intercalation and topoisomerase II inhibition.",
    dose_info_tr:"25 mg/m² IV bolus. İndüksiyon G1,8,15,22 + Re-indüksiyon G84,91.",
    dose_info_en:"25 mg/m² IV bolus. Induction D1,8,15,22 + Re-induction D84,91.",
    monitoring_tr:"Kardiyotoksisite (EKO), kümülatif doz ≤300 mg/m² sınırına dikkat.",
    monitoring_en:"Cardiotoxicity (ECHO), cumulative dose limit ≤300 mg/m².",
    ref:"Möricke, A., Reiter, A., Zimmermann, M., Gadner, H., Stanulla, M., Dördelmann, M., ... & Schrappe, M. (2008). Risk-adjusted therapy of acute lymphoblastic leukemia. Blood, 111(9), 4477–4489. https://doi.org/10.1182/blood-2007-09-112920",
  },
  "asparaginase": {
    mechanism_tr:"L-asparaginazı hidrolize ederek tümör hücrelerini asparaginden mahrum bırakır.",
    mechanism_en:"Hydrolyzes L-asparagine, depriving tumor cells of this essential amino acid.",
    dose_info_tr:"PEG-ASP 2500 IU/m² IM/IV. G4 (İnd), G36+G57 (Kons), G91 (Re-ind). İdarede verilmez.",
    dose_info_en:"PEG-ASP 2500 IU/m² IM/IV. D4 (Ind), D36+D57 (Cons), D91 (Re-ind). Not in maintenance.",
    monitoring_tr:"Asparagin düzeyleri, pankreatit, alerji, sessiz inaktivasyon, koagülasyon.",
    monitoring_en:"Asparagine levels, pancreatitis, allergy, silent inactivation, coagulation.",
    ref:"Asselin, B. L., & Rizzari, C. (2015). Asparaginase pharmacokinetics and implications of therapeutic drug monitoring. Leukemia & Lymphoma, 56(8), 2273–2280. https://doi.org/10.3109/10428194.2014.1003056",
  },
  "corticosteroid": {
    mechanism_tr:"Glukokortikoid. Lenfosit apoptozunu tetikler; anti-inflamatuvar ve anti-lösemik.",
    mechanism_en:"Glucocorticoid. Triggers lymphocyte apoptosis; anti-inflammatory and anti-leukemic.",
    dose_info_tr:"Prednizon 40 mg/m²/g ×28 (İnd); Deksametazon 6 mg/m²/g ×7+7 (Re-ind).",
    dose_info_en:"Prednisone 40 mg/m²/d ×28 (Ind); Dexamethasone 6 mg/m²/d ×7+7 (Re-ind).",
    monitoring_tr:"Kan şekeri, kemik yoğunluğu, enfeksiyon riski, mood değişiklikleri.",
    monitoring_en:"Blood glucose, bone density, infection risk, mood changes.",
    ref:"Pui, C. H., Campana, D., Pei, D., Bowman, W. P., Sandlund, J. T., Kaste, S. C., ... & Evans, W. E. (2009). Treating childhood acute lymphoblastic leukemia without cranial irradiation. New England Journal of Medicine, 360(26), 2730–2741. https://doi.org/10.1056/NEJMoa0900386",
  },
  "cytarabine": {
    mechanism_tr:"Pirimidin antimetaboliti. DNA polimeraz inhibisyonu ve zincir sonlandırma.",
    mechanism_en:"Pyrimidine antimetabolite. DNA polymerase inhibition and chain termination.",
    dose_info_tr:"75 mg/m²/g SC ×4 (4 kür, konsolidasyon); İT: 30–70 mg.",
    dose_info_en:"75 mg/m²/d SC ×4 (4 courses, consolidation); IT: 30–70 mg.",
    monitoring_tr:"CBC, konjunktivit (HD dozda), nörotoksisite.",
    monitoring_en:"CBC, conjunctivitis (HD dose), neurotoxicity.",
    ref:"Lange, B. J., Gerbing, R. B., Feusner, J., Skolnik, J., Sacks, N., Smith, F. O., & Alonzo, T. A. (2008). Cytarabine dosage for childhood acute myeloid leukemia. Blood, 111(7), 3511–3521. https://doi.org/10.1182/blood-2007-12-129833",
  },
};
