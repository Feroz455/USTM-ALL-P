// TabReferences.jsx — STING DSS Kaynakça & Yayınlar
import { useState } from "react";
import { useLang } from "../../i18n/LangContext";

const REFERENCES = [
  // ── Model ve yöntem referansları ─────────────────────────────────────────
  {
    category: "model",
    authors: "Lennard L.",
    year: 2014,
    title: "Pharmacogenetics of acute lymphoblastic leukaemia",
    journal: "Br J Clin Pharmacol",
    doi: "10.1111/bcp.12248",
    pmid: "24637277",
    drug: "6mp",
    note_tr: "6-MP ve TPMT farmakokinetik modeli için temel referans.",
    note_en: "Key reference for 6-MP and TPMT pharmacokinetic model.",
  },
  {
    category: "model",
    authors: "Pui C.H., Carroll W.L., Meshinchi S., Arceci R.J.",
    year: 2012,
    title: "Biology, risk stratification, and therapy of pediatric acute leukemias: an update",
    journal: "J Clin Oncol",
    doi: "10.1200/JCO.2011.39.5509",
    pmid: "22393022",
    drug: "mtx",
    note_tr: "MTX ve genel ALL tedavi protokolü referansı.",
    note_en: "MTX and general ALL treatment protocol reference.",
  },
  {
    category: "model",
    authors: "Gidding C.E., Kellie S.J., Kamps W.A., de Graaf S.S.",
    year: 1999,
    title: "Vincristine revisited",
    journal: "Crit Rev Oncol Hematol",
    doi: "10.1016/S1040-8428(98)00036-4",
    pmid: "10052812",
    drug: "vcr",
    note_tr: "VCR PK/PD modeli ve VIPN nörotoksisite parametreleri.",
    note_en: "VCR PK/PD model and VIPN neurotoxicity parameters.",
  },
  {
    category: "model",
    authors: "Möricke A. et al.",
    year: 2008,
    title: "Risk-adjusted therapy of acute lymphoblastic leukemia: BFM 95 results",
    journal: "Blood",
    doi: "10.1182/blood-2007-09-112920",
    pmid: "18490709",
    drug: "daunorubicin",
    note_tr: "Daunorubicin protokolü ve BFM 2009 tedavi şeması.",
    note_en: "Daunorubicin protocol and BFM 2009 treatment scheme.",
  },
  {
    category: "model",
    authors: "Asselin B.L., Rizzari C.",
    year: 2015,
    title: "Asparaginase pharmacokinetics and implications of therapeutic drug monitoring",
    journal: "Leuk Lymphoma",
    doi: "10.3109/10428194.2014.1003056",
    pmid: "25832093",
    drug: "asparaginase",
    note_tr: "PEG-ASP PK modeli, TAD-bağımlı CL ve asparagin depletion.",
    note_en: "PEG-ASP PK model, TAD-dependent CL, and asparagine depletion.",
  },
  {
    category: "protocol",
    authors: "Children's Oncology Group",
    year: 2021,
    title: "AALL0331: Risk-Based Treatment for Pediatric ALL",
    journal: "COG Protocol",
    doi: null,
    pmid: null,
    drug: null,
    note_tr: "STING sisteminde kullanılan 4 fazlı ALL protokolünün ana referansı.",
    note_en: "Main reference for the 4-phase ALL protocol used in STING.",
  },
  {
    category: "protocol",
    authors: "Schrappe M. et al.",
    year: 2012,
    title: "ALL-BFM 2009: International BFM Protocol for ALL",
    journal: "AIEOP-BFM ALL 2009",
    doi: "10.1200/JCO.2011.36.7326",
    pmid: "22393052",
    drug: null,
    note_tr: "PEG-ASP doz günleri ve konsolidasyon protokolü için BFM referansı.",
    note_en: "BFM reference for PEG-ASP dose days and consolidation protocol.",
  },
  {
    category: "vipn",
    authors: "Köse U.",
    year: 2025,
    title: "VIPN Neural Toxicity Model: dS/dt = Ce − λ·S (t½=14 days, STING protocol)",
    journal: "STING Project Technical Report — TÜBİTAK 123E383",
    doi: null,
    pmid: null,
    drug: "vcr",
    note_tr: "STING VIPN modeli: VCR kümülatif maruziyet ve sinir hasarı dinamiği.",
    note_en: "STING VIPN model: VCR cumulative exposure and nerve damage dynamics.",
  },
  {
    category: "xai",
    authors: "Jost C.R. et al.",
    year: 2020,
    title: "Explainability methods for drug repositioning in pediatric ALL",
    journal: "Comput Biol Med",
    doi: "10.1016/j.compbiomed.2020.103725",
    pmid: null,
    drug: null,
    note_tr: "İlaç yeniden konumlandırma XAI referansı.",
    note_en: "Drug repositioning XAI reference.",
  },
  {
    category: "xai",
    authors: "Le T.T. et al.",
    year: 2019,
    title: "Scaling tree-based automated machine learning to biomedical big data",
    journal: "Bioinformatics",
    doi: "10.1093/bioinformatics/btz107",
    pmid: null,
    drug: null,
    note_tr: "Biyomedikal ML pipeline referansı.",
    note_en: "Biomedical ML pipeline reference.",
  },
];

const PUBLICATIONS = [
  {
    authors: "Köse U., et al.",
    year: 2025,
    title: "STING: A Decision Support System for Pediatric ALL Drug Repositioning Using Deep Learning and Digital Twins",
    journal: "TÜBİTAK 123E383 Project",
    status: "in_progress",
    note_tr: "Proje ana yayını — hazırlanıyor.",
    note_en: "Main project publication — in preparation.",
  },
];

const CATEGORY_LABELS = {
  model:    { tr:"PK/PD Model",     en:"PK/PD Model",     color:"#3b82f6" },
  protocol: { tr:"Tedavi Protokolü",en:"Treatment Protocol",color:"#10b981" },
  vipn:     { tr:"VIPN Modeli",     en:"VIPN Model",       color:"#f59e0b" },
  xai:      { tr:"XAI & ML",        en:"XAI & ML",         color:"#a855f7" },
};

const DRUG_COLORS = {
  "6mp":"#3b82f6","mtx":"#10b981","vcr":"#f59e0b",
  "daunorubicin":"#ef4444","asparaginase":"#8b5cf6",
};
const DRUG_LABELS = {
  "6mp":"6-MP","mtx":"MTX","vcr":"VCR",
  "daunorubicin":"DNR","asparaginase":"PEG-ASP",
};

export default function TabReferences({ dark }) {
  const { lang } = useLang();
  const d = dark;
  const isEN = lang === "en";
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const card = `rounded-2xl border p-5 ${d?"bg-gray-900 border-gray-800":"bg-white border-gray-200"}`;

  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];
  const filtered = REFERENCES.filter(r => {
    const matchCat = filter === "all" || r.category === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || r.authors.toLowerCase().includes(q)
      || r.title.toLowerCase().includes(q)
      || r.journal.toLowerCase().includes(q)
      || (r.pmid||"").includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className={card}>
        <h2 className={`text-base font-bold mb-1 ${d?"text-gray-100":"text-gray-800"}`}>
          📚 {isEN?"References & Publications":"Kaynakça & Yayınlar"}
        </h2>
        <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>
          {isEN
            ?"All pharmacokinetic/pharmacodynamic models, treatment protocols and XAI methods used in STING DSS."
            :"STING DSS'te kullanılan tüm farmakokinetik/farmakodinamik modeller, tedavi protokolleri ve XAI yöntemleri için kaynaklar."}
        </p>
      </div>

      {/* Filtre + Arama */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={()=>setFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                filter===cat
                  ?(d?"border-blue-500/40 bg-blue-500/20 text-blue-300":"border-blue-300 bg-blue-100 text-blue-700")
                  :(d?"border-gray-700 text-gray-500":"border-gray-200 text-gray-400")
              }`}>
              {cat==="all"
                ?(isEN?"All":"Tümü")
                :(isEN?CATEGORY_LABELS[cat].en:CATEGORY_LABELS[cat].tr)}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={isEN?"Search references…":"Kaynak ara…"}
          className={`flex-1 min-w-40 border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            d?"bg-gray-800 border-gray-700 text-gray-300 placeholder-gray-600"
             :"bg-white border-gray-200 text-gray-700 placeholder-gray-400"
          }`}/>
      </div>

      {/* Referans listesi */}
      <div className="space-y-3">
        {filtered.map((ref, i) => {
          const catInfo = CATEGORY_LABELS[ref.category];
          return (
            <div key={i} className={`rounded-2xl border p-4 ${d?"bg-gray-900 border-gray-800":"bg-white border-gray-200"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  {/* Kategori + yıl + ilaç */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-lg font-semibold"
                      style={{background:`${catInfo?.color||"#6b7280"}20`, color:catInfo?.color||"#6b7280"}}>
                      {isEN?catInfo?.en:catInfo?.tr}
                    </span>
                    <span className={`text-xs font-semibold ${d?"text-gray-400":"text-gray-500"}`}>
                      {ref.year}
                    </span>
                    {ref.drug && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                        style={{background:`${DRUG_COLORS[ref.drug]||"#6b7280"}20`,color:DRUG_COLORS[ref.drug]||"#6b7280"}}>
                        {DRUG_LABELS[ref.drug]||ref.drug}
                      </span>
                    )}
                  </div>
                  {/* Başlık */}
                  <p className={`text-sm font-semibold leading-snug mb-0.5 ${d?"text-gray-200":"text-gray-800"}`}>
                    {ref.title}
                  </p>
                  {/* Yazarlar + dergi */}
                  <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>
                    {ref.authors} · <span className="italic">{ref.journal}</span>
                  </p>
                  {/* STING notu */}
                  <p className={`text-xs mt-1.5 ${d?"text-gray-400":"text-gray-600"}`}>
                    {isEN?ref.note_en:ref.note_tr}
                  </p>
                </div>
                {/* DOI / PMID linkleri */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {ref.pmid && (
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}`}
                       target="_blank" rel="noopener noreferrer"
                       className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                         d?"border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          :"border-blue-200 text-blue-600 hover:bg-blue-50"
                       }`}>
                      PMID ↗
                    </a>
                  )}
                  {ref.doi && (
                    <a href={`https://doi.org/${ref.doi}`}
                       target="_blank" rel="noopener noreferrer"
                       className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                         d?"border-gray-700 text-gray-400 hover:bg-gray-800"
                          :"border-gray-200 text-gray-500 hover:bg-gray-50"
                       }`}>
                      DOI ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className={`text-sm text-center py-8 ${d?"text-gray-600":"text-gray-400"}`}>
            {isEN?"No references found.":"Kaynak bulunamadı."}
          </p>
        )}
      </div>

      {/* Proje Yayınları */}
      <div className={card}>
        <h3 className={`text-sm font-bold mb-3 ${d?"text-gray-200":"text-gray-800"}`}>
          🔬 {isEN?"STING Project Publications":"STING Proje Yayınları"}
        </h3>
        {PUBLICATIONS.map((pub, i) => (
          <div key={i} className={`rounded-xl border p-3 ${d?"border-gray-700 bg-gray-800/50":"border-gray-100 bg-gray-50"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-xs font-semibold ${d?"text-gray-200":"text-gray-700"}`}>{pub.title}</p>
                <p className={`text-xs mt-0.5 ${d?"text-gray-500":"text-gray-400"}`}>
                  {pub.authors} · {pub.year} · <span className="italic">{pub.journal}</span>
                </p>
                <p className={`text-xs mt-1 ${d?"text-gray-400":"text-gray-600"}`}>
                  {isEN?pub.note_en:pub.note_tr}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-lg flex-shrink-0 font-semibold ${
                pub.status==="in_progress"
                  ?(d?"bg-amber-500/20 text-amber-400":"bg-amber-100 text-amber-700")
                  :(d?"bg-emerald-500/20 text-emerald-400":"bg-emerald-100 text-emerald-700")
              }`}>
                {pub.status==="in_progress"
                  ?(isEN?"In Preparation":"Hazırlanıyor")
                  :(isEN?"Published":"Yayında")}
              </span>
            </div>
          </div>
        ))}
        <p className={`text-xs mt-3 ${d?"text-gray-600":"text-gray-400"}`}>
          {isEN
            ?"Publications derived from this project will be listed here as they are released. For the latest updates, visit "
            :"Bu projeden çıkan yayınlar yayımlandıkça buraya eklenecektir. Güncel yayınlar için "}
          <a href="https://sting.sdu.edu.tr" target="_blank" rel="noopener noreferrer"
            className={`font-semibold underline ${d?"text-blue-400":"text-blue-600"}`}>
            sting.sdu.edu.tr
          </a>
          {isEN?" for current publications.":"adresini takip edebilirsiniz."}
        </p>
      </div>

      {/* Proje bilgisi */}
      <div className={`rounded-2xl border p-4 ${d?"border-slate-700 bg-slate-900":"border-slate-200 bg-slate-50"}`}>
        <p className={`text-xs ${d?"text-slate-500":"text-slate-400"}`}>
          <strong>STING DSS</strong> — {isEN
            ?"Decision Support System for Childhood Acute Leukemia Drug Repositioning. Funded by TÜBİTAK 1001 (Grant No. 123E383). Principal Investigator: Prof. Dr. Utku Köse."
            :"Çocukluk Çağı Akut Lösemi İlaç Yeniden Konumlandırma Karar Destek Sistemi. TÜBİTAK 1001 (Proje No. 123E383) destekli. Yürütücü: Prof. Dr. Utku Köse."}
        </p>
      </div>
    </div>
  );
}
