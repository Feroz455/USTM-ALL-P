// src/components/tabs/Tab2Parameters.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useLang } from "../../i18n/LangContext";
import { DRUG_PALETTE, drugColor, drugLabel, ODE_DRUG_KEYS, SIMULABLE_DRUG_KEYS, DRUG_CLINICAL_INFO } from "../../constants/drugConfig";
import HowToUse from "../ui/HowToUse";
import NextTabBanner from "../ui/NextTabBanner";

const BASE = "/api/v1";
function getToken() { return localStorage.getItem("sting_token"); }
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${getToken()}`, ...opts.headers },
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.detail || "Hata");
  return d;
}

// ── Faz renkleri ─────────────────────────────────────────────────────────────
const TAB2_PHASE_COLORS_LIGHT = {
  induction:     { bg:"#FDECEA", border:"#ef4444", text:"#C62828", dot:"#ef4444" },
  consolidation: { bg:"#FFF8E1", border:"#f59e0b", text:"#E65100", dot:"#f59e0b" },
  reinduction:   { bg:"#EDE7F6", border:"#a855f7", text:"#6A1B9A", dot:"#a855f7" },
  maintenance:   { bg:"#E8F5E9", border:"#10b981", text:"#2E7D32", dot:"#10b981" },
};
const TAB2_PHASE_COLORS_DARK = {
  induction:     { bg:"#ef444415", border:"#ef4444", text:"#f87171", dot:"#ef4444" },
  consolidation: { bg:"#f59e0b15", border:"#f59e0b", text:"#fbbf24", dot:"#f59e0b" },
  reinduction:   { bg:"#a855f715", border:"#a855f7", text:"#c084fc", dot:"#a855f7" },
  maintenance:   { bg:"#10b98115", border:"#10b981", text:"#34d399", dot:"#10b981" },
};

// ── Faz bilgi paneli (tıklanabilir değil, sadece bilgi) ─────────────────────
function PhaseInfoPanel({ phaseKey, phase, dark, isEN }) {
  const colors = dark ? TAB2_PHASE_COLORS_DARK[phaseKey] : TAB2_PHASE_COLORS_LIGHT[phaseKey];
  if (!colors || !phase) return null;
  const name = isEN ? (phase.name_en || phase.name) : phase.name;
  const desc = isEN ? (phase.description_en || phase.description) : phase.description;
  return (
    <div className="rounded-xl border p-3" style={{borderColor: colors.border+"55", background: colors.bg}}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: colors.dot}}/>
        <p className="text-xs font-bold" style={{color: colors.text}}>{name}</p>
        <span className="text-xs ml-auto" style={{color: colors.text, opacity:0.7}}>{phase.duration_days}{isEN?" d":" g"}</span>
      </div>
      <p className="text-xs leading-relaxed" style={{color: dark?"#94a3b8":"#64748b"}}>{desc}</p>
      {phase.default_drugs?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {phase.default_drugs.map(dk=>(
            <span key={dk} className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{background:`${DRUG_PALETTE[dk]?.color||"#6b7280"}22`, color:DRUG_PALETTE[dk]?.color||"#6b7280"}}>
              {DRUG_PALETTE[dk]?.label||dk}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── İlaç kartı ───────────────────────────────────────────────────────────────
function DrugCard({ drugKey, drug, active, onToggle, dark, phases, isEN }) {
  const hasOde       = drug.has_ode;
  const isPeg        = drug.peg_simulator;
  const isRepositioned = drug.repositioned;
  const borderColor  = drug.color || "#6b7280";
  const [showInfo, setShowInfo] = useState(false);
  const clinicalInfo = DRUG_CLINICAL_INFO[drugKey];

  // Faz renk ve etiketleri — merkezi palette'ten
  const drugPhases = drug.phases || [];
  const phaseLabels = {
    induction:     isEN ? "Ind" : "İnd",
    consolidation: isEN ? "Cons" : "Kons",
    reinduction:   isEN ? "Re-ind" : "Re-ind",
    maintenance:   isEN ? "Maint" : "İdame",
  };
  const phaseColors = {
    induction:"#ef4444", consolidation:"#f59e0b",
    reinduction:"#a855f7", maintenance:"#10b981",
  };

  return (
    <div className="relative">
      <button
        onClick={() => onToggle(drugKey)}
        className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
          active ? "" : dark
            ? "border-gray-700 bg-gray-800 hover:border-gray-600"
            : "border-gray-200 bg-white hover:border-gray-300"
        }`}
        style={active ? {borderColor: borderColor, backgroundColor: `${borderColor}18`} : {}}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-3 h-3 rounded-full flex-shrink-0 transition-colors"
                 style={{backgroundColor: active ? borderColor : (dark?"#4b5563":"#d1d5db")}}/>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className={`text-xs font-bold ${dark?"text-gray-200":"text-gray-800"}`}>
                  {drug.name
                    ? <>{drug.name.split("(")[0].trim()} <span className="font-bold" style={{color:borderColor}}>({drug.short})</span></>
                    : drug.short
                  }
                </p>
                {isRepositioned && (
                  <span className={`text-xs px-1 py-0.5 rounded ${dark?"bg-teal-500/20 text-teal-400":"bg-teal-100 text-teal-700"}`}>
                    {isEN?"Repos.":"Yeniden Kon."}
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${dark?"text-gray-500":"text-gray-400"}`}>
                {isEN ? (drug.schedule_en || drug.schedule) : drug.schedule}
              </p>
              {drugPhases.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {drugPhases.map(ph => (
                    <span key={ph} className="text-xs px-1 py-0.5 rounded font-medium"
                      style={{background:`${phaseColors[ph]}22`, color: phaseColors[ph]}}>
                      {phaseLabels[ph] || ph}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {isPeg ? (
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${dark?"bg-violet-500/25 text-violet-300":"bg-violet-100 text-violet-700"}`}>
                PEG ⚡
              </span>
            ) : hasOde ? (
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${dark?"bg-emerald-500/25 text-emerald-300":"bg-emerald-100 text-emerald-700"}`}>
                ODE ✓
              </span>
            ) : (
              <span className={`text-xs px-1.5 py-0.5 rounded ${dark?"bg-gray-700 text-gray-500":"bg-gray-100 text-gray-400"}`}>
                {isEN?"info":"bilgi"}
              </span>
            )}
            <span className={`text-xs ${dark?"text-gray-600":"text-gray-400"}`}>
              {drug.default_dose} {drug.dose_unit}
            </span>
          </div>
        </div>
      </button>
      {/* Bilgi butonu */}
      {clinicalInfo && (
        <button
          onClick={e => { e.stopPropagation(); setShowInfo(v=>!v); }}
          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all opacity-60 hover:opacity-100"
          style={{background:`${borderColor}30`, color:borderColor}}
          title={isEN?"Drug information":"İlaç bilgisi"}>
          ℹ
        </button>
      )}
      {/* Klinik bilgi paneli */}
      {showInfo && clinicalInfo && (
        <div className={`mt-1 rounded-xl border p-3 text-xs space-y-2 ${dark?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-200"}`}>
          <p className={`font-semibold leading-relaxed ${dark?"text-gray-200":"text-gray-700"}`}>
            {isEN ? clinicalInfo.mechanism_en : clinicalInfo.mechanism_tr}
          </p>
          <div className="space-y-1">
            <p className={dark?"text-gray-400":"text-gray-500"}>
              📋 {isEN ? clinicalInfo.dose_info_en : clinicalInfo.dose_info_tr}
            </p>
            <p className={dark?"text-gray-400":"text-gray-500"}>
              🔬 {isEN ? clinicalInfo.monitoring_en : clinicalInfo.monitoring_tr}
            </p>
            <p className={`italic text-xs ${dark?"text-gray-600":"text-gray-400"} break-words`}>
              📚 {isEN ? (clinicalInfo.ref_apa || clinicalInfo.ref) : (clinicalInfo.ref_apa_tr || clinicalInfo.ref)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Parametre girişi ──────────────────────────────────────────────────────────
function ParamInput({ label, value, onChange, min, max, step=0.1, unit, dark }) {
  return (
    <div>
      <label className={`text-xs font-medium block mb-1 ${dark?"text-gray-400":"text-gray-600"}`}>
        {label} {unit && <span className={`font-normal ${dark?"text-gray-600":"text-gray-400"}`}>({unit})</span>}
      </label>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          dark?"bg-gray-800 border-gray-700 text-gray-200":"bg-white border-gray-200 text-gray-800"
        }`}
      />
    </div>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export default function Tab2Parameters({ dark, onConfigUpdate, onProceed, initialConfig, onGoTo }) {
  const { t, lang } = useLang();
  const d = dark;
  const isEN = lang === "en";

  const [phases,    setPhases]    = useState({});
  const [allDrugs,  setAllDrugs]  = useState({});
  const [protocols, setProtocols] = useState([]);
  const [activeDrugs, setActiveDrugs] = useState(new Set(["6mp","mtx","vcr"]));
  const [loading,   setLoading]   = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState("cog_aall0331");
  // "preset" | "custom"
  const [protocolMode, setProtocolMode] = useState("preset");
  // Custom faz listesi
  const [customPhases, setCustomPhases] = useState([
    { id: Date.now(), name: isEN?"Phase 1":"Faz 1",
      duration_days: 29, drugs: [], doses: {}, drug_patterns: {} }
  ]);
  const [customPhaseDrugs, setCustomPhaseDrugs] = useState({
    induction: [], consolidation: [], reinduction: [], maintenance: []
  });

  const [patient, setPatient] = useState({
    weight_kg:30.0, height_cm:135.0, tpmt:1.0,
    vitamin_d:30.0, diet:1.0, exercise:0.4,
    wbc0:5.0, anc0:1.6,
  });
  const [doses, setDoses] = useState({
    dose_6mp_mg:50.0, dose_mtx_mg:20.0, dose_vcr_mg:1.5, dose_dnr_mg_m2:25.0,
    // Yeni ilaç dozları — literatür varsayılanları
    dose_ster_mg_m2:40.0,  // Prednizon mg/m²/gün (Cooper & Brown 2014)
    dose_arac_mg_m2:75.0,  // Ara-C mg/m² (Galmarini 2001)
    dose_cpm_mg_m2:1000.0, // Siklofosfamid mg/m² (Yule 2004)
    dose_6tg_mg_m2:60.0,   // 6-TG mg/m²/gün (Lennard 1993)
    dose_cop_mg:60.0,      // Kopanlisib mg IV (Markham 2017)
    dose_nov_mg_kg:10.0,   // Novobiocin mg/kg/gün (Burlison 2006)
  });
  const [tEnd,        setTEnd]        = useState(250.0);
  // Custom modda t_end faz sürelerinin toplamı, preset modda slider değeri
  const effectiveTEnd = protocolMode === "custom"
    ? customPhases.reduce((s, p) => s + (p.duration_days || 0), 0)
    : tEnd;
  const [sessionName, setSessionName] = useState("");
  const [proceeded,   setProceeded]   = useState(false);

  useEffect(() => {
    Promise.all([apiFetch("/ode/phases"), apiFetch("/ode/drugs"), apiFetch("/ode/protocols")])
      .then(([pData, dData, prData]) => {
        setPhases(pData.phases || {});
        // API'dan gelen drugs yoksa DRUG_PALETTE'i fallback olarak kullan
        const drugsFromApi = dData.drugs || {};
        if (Object.keys(drugsFromApi).length === 0) {
          const fallback = {};
          Object.entries(DRUG_PALETTE).forEach(([key, val]) => {
            fallback[key] = { ...val, short: val.label || key.toUpperCase() };
          });
          setAllDrugs(fallback);
        } else {
          setAllDrugs(drugsFromApi);
        }
        const prots = prData.protocols || [];
        setProtocols(prots);
        // Protokoller yüklenince default protokolü (cog_aall0331) otomatik uygula
        const defaultProt = prots.find(p => p.key === "cog_aall0331");
        if (defaultProt) {
          const drugs = new Set();
          Object.values(defaultProt.phases || {}).forEach(ph =>
            (ph.drugs || []).forEach(d => drugs.add(d))
          );
          if (drugs.size > 0) setActiveDrugs(drugs);
        }
      }).catch(() => {
        // API tamamen başarısız olursa DRUG_PALETTE kullan
        const fallback = {};
        Object.entries(DRUG_PALETTE).forEach(([key, val]) => {
          fallback[key] = { ...val, short: val.label || key.toUpperCase() };
        });
        setAllDrugs(fallback);
        setLoading(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleDrug = useCallback((key) => {
    setActiveDrugs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // Protokol seçildiğinde ilaçları otomatik güncelle
  const handleProtocolSelect = useCallback((protKey) => {
    setSelectedProtocol(protKey);
    const prot = protocols.find(p => p.key === protKey);
    if (!prot) return;
    if (protKey !== "custom") {
      // Protokoldeki tüm fazlardaki ilaçları birleştir
      const drugs = new Set();
      Object.values(prot.phases).forEach(ph => ph.drugs.forEach(d => drugs.add(d)));
      setActiveDrugs(drugs);
    }
    // custom ise kullanıcı manuel seçer — değiştirme
  }, [protocols]);

  // Custom faz yönetimi
  const addCustomPhase = () => {
    if (customPhases.length >= 6) return;
    setCustomPhases(prev => [...prev, {
      id: Date.now(),
      name: isEN ? `Phase ${prev.length + 1}` : `Faz ${prev.length + 1}`,
      duration_days: 28,
      drugs: [],
      doses: {},
      drug_patterns: {},
    }]);
  };

  const removeCustomPhase = (id) => {
    if (customPhases.length <= 1) return;
    setCustomPhases(prev => prev.filter(p => p.id !== id));
  };

  const updateCustomPhasePattern = (id, drugKey, pattern) => {
    setCustomPhases(prev => prev.map(p => {
      if (p.id !== id) return p;
      const drug_patterns = {...(p.drug_patterns||{})};
      if (pattern === null || pattern === "") {
        delete drug_patterns[drugKey];
      } else {
        drug_patterns[drugKey] = pattern;
      }
      return {...p, drug_patterns};
    }));
  };

  const updateCustomPhase = (id, field, value) => {
    setCustomPhases(prev => prev.map(p => p.id === id ? {...p, [field]: value} : p));
  };

  const toggleCustomPhaseDrugNew = (id, drugKey) => {
    setCustomPhases(prev => {
      const updated = prev.map(p => {
        if (p.id !== id) return p;
        const drugs = p.drugs.includes(drugKey)
          ? p.drugs.filter(d2 => d2 !== drugKey)
          : [...p.drugs, drugKey];
        return {...p, drugs};
      });
      // activeDrugs — güncel state üzerinden hesapla (closure sorunu yok)
      const all = new Set();
      updated.forEach(p => p.drugs.forEach(d2 => all.add(d2)));
      setActiveDrugs(all);
      return updated;
    });
  };

  // Custom protokol faz-ilaç toggle (eski — preset için)
  const toggleCustomPhaseDrug = useCallback((phase, drugKey) => {
    setCustomPhaseDrugs(prev => {
      const phDrugs = prev[phase] || [];
      const next = phDrugs.includes(drugKey)
        ? phDrugs.filter(d => d !== drugKey)
        : [...phDrugs, drugKey];
      // activeDrugs'ı tüm fazların birleşiminden güncelle
      const allSelected = new Set();
      const newState = {...prev, [phase]: next};
      Object.values(newState).forEach(arr => arr.forEach(d => allSelected.add(d)));
      setActiveDrugs(allSelected);
      return newState;
    });
  }, []);

  const ODE_DRUGS = [
    "6mp","mtx","vcr","daunorubicin","asparaginase",
    "corticosteroid","cytarabine","cyclophosphamide","6tg","copanlisib","novobiocin"
  ];

  // İlaç bazlı uygulama paterni seçenekleri
  const DRUG_PATTERN_OPTIONS = {
    "6mp":             ["daily","weekly"],
    "mtx":             ["daily","weekly","biweekly"],
    "vcr":             ["d1_8_15_22","monthly","weekly_iv","phase_start"],
    "daunorubicin":    ["d1_8_15_22","weekly","phase_start"],
    "asparaginase":    ["weekly","biweekly","phase_start"],
    "corticosteroid":  ["daily","pulse5","weekly"],
    "cytarabine":      ["daily","weekly","phase_start"],
    "cyclophosphamide":["phase_start","biweekly"],
    "6tg":             ["daily","weekly"],
    "copanlisib":      ["weekly_iv","weekly","biweekly"],
    "novobiocin":      ["daily","weekly"],
  };
  const PATTERN_LABELS = isEN ? {
    "daily":"Daily oral","weekly":"Weekly","biweekly":"Every 2 weeks",
    "monthly":"Monthly (28d)","d1_8_15_22":"D1,8,15,22","weekly_iv":"D1,8,15 (IV weekly)",
    "phase_start":"Phase start only","pulse5":"5-day pulses (every 28d)",
  } : {
    "daily":"Günlük oral","weekly":"Haftalık","biweekly":"2 haftada bir",
    "monthly":"Aylık (28g)","d1_8_15_22":"G1,8,15,22","weekly_iv":"G1,8,15 (IV haftalık)",
    "phase_start":"Yalnızca faz başı","pulse5":"5 günlük pulslar (28g'de bir)",
  };
  const odeActive = [...activeDrugs].filter(k => ODE_DRUGS.includes(k));

  const buildConfig = () => {
    const base = {
      ...patient, ...doses,
      active_drugs: [...activeDrugs],
      dose_dnr_mg_m2:   doses.dose_dnr_mg_m2   || 25.0,
      dose_ster_mg_m2:  doses.dose_ster_mg_m2  || 40.0,
      dose_arac_mg_m2:  doses.dose_arac_mg_m2  || 75.0,
      dose_cpm_mg_m2:   doses.dose_cpm_mg_m2   || 1000.0,
      dose_6tg_mg_m2:   doses.dose_6tg_mg_m2   || 60.0,
      dose_cop_mg:      doses.dose_cop_mg       || 60.0,
      dose_nov_mg_kg:   doses.dose_nov_mg_kg    || 10.0,
      protocol_key: protocolMode === "custom" ? "custom" : selectedProtocol,
      session_name: sessionName,
    };
    if (protocolMode === "custom") {
      // t_end faz sürelerinin toplamı
      const totalDays = customPhases.reduce((s, p) => s + (p.duration_days || 29), 0);
      return {
        ...base,
        t_end: totalDays,
        custom_phases: customPhases.map(p => ({
          name:          p.name,
          duration_days: p.duration_days,
          drugs:         p.drugs,
          doses:         p.doses || {},
          drug_patterns: p.drug_patterns || {},
        })),
      };
    }
    return { ...base, t_end: tEnd, custom_phases: [] };
  };

  const handleProceed = () => {
    const cfg = buildConfig();
    if (onProceed) onProceed(cfg);
    else if (onGoTo) onGoTo("tab3");
    setProceeded(true);
  };

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (activeDrugs.size === 0 || loading) return;
    if (onConfigUpdate) onConfigUpdate(buildConfig());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDrugs, doses, tEnd, selectedProtocol, protocolMode, customPhases]);

  if (loading) return (
    <div className={`flex items-center justify-center py-20 ${d?"text-gray-500":"text-gray-400"}`}>
      <div className="text-sm">{isEN?"Loading…":"Yükleniyor…"}</div>
    </div>
  );

  const card = `rounded-2xl border p-5 ${d?"bg-gray-900 border-gray-800":"bg-white border-gray-200"}`;
  const sectionTitle = `text-sm font-semibold mb-3 ${d?"text-gray-200":"text-gray-800"}`;

  const howToSteps = isEN ? [
    { title:"Select active drugs", desc:"Choose drugs using the cards below. ODE ✓ drugs (6-MP, MTX, VCR, DNR, CS, Ara-C, CPM, 6-TG, COP, NOV) are fully simulated. PEG-ASP ⚡ uses a separate PK simulator. Each card shows which treatment phases the drug is used in." },
    { title:"Phase information", desc:"The treatment phase panels below are for reference — they show which drugs are active in each phase. You select drugs directly, not phases." },
    { title:"Enter patient parameters", desc:"Set weight, height, TPMT genotype, Vitamin D level, diet and exercise scores, and baseline WBC/ANC values." },
    { title:"Set doses", desc:"Adjust doses where applicable. 6-MP/MTX/VCR/DNR: slider. CS, Ara-C, CPM, 6-TG, COP, NOV: protocol default doses (ODE applies automatically). PEG-ASP: 2500 IU/m² auto on D4,36,57,91." },
    { title:"Set duration and proceed", desc:"Set simulation days (28–730), optionally name the session, then click 'Proceed to ODE Simulation'." },
  ] : [
    { title:"Aktif ilaçları seçin", desc:"Aşağıdaki kartlardan ilaçları seçin. ODE ✓ ilaçlar (6-MP, MTX, VCR, DNR, CS, Ara-C, CPM, 6-TG, COP, NOV) tam simüle edilir. PEG-ASP ⚡ ayrı PK simülatörü kullanır. Her kart ilacın hangi tedavi fazlarında kullanıldığını gösterir." },
    { title:"Faz bilgi panelleri", desc:"Alttaki tedavi fazı panelleri bilgi amaçlıdır — her fazda hangi ilaçların aktif olduğunu gösterir. Fazları değil, doğrudan ilaçları seçersiniz." },
    { title:"Hasta parametrelerini girin", desc:"Ağırlık, boy, TPMT genotip, D vitamini seviyesi, diyet ve egzersiz puanları ile başlangıç WBC/ANC değerlerini ayarlayın." },
    { title:"Dozları ayarlayın", desc:"6-MP/MTX/VCR/DNR dozlarını slider ile ayarlayın. CS, Ara-C, CPM, 6-TG, COP, NOV: protokol varsayılan dozları (ODE otomatik uygular). PEG-ASP: 2500 IU/m² G4,36,57,91 otomatik." },
    { title:"Süreyi ayarlayıp devam edin", desc:"Simülasyon gün sayısını belirleyin (28–730), oturum adı yazın, ardından 'Yanıt Simülasyonuna Geç' butonuna tıklayın." },
  ];

  return (
    <div className="space-y-5">
      <HowToUse steps={howToSteps} dark={d}/>

      {/* ── Devam butonu ── */}
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${d?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-200"}`}>
        <button onClick={handleProceed}
          disabled={activeDrugs.size === 0}
          className={`flex-shrink-0 font-semibold px-6 py-2.5 rounded-xl transition-all text-sm shadow-lg ${
            activeDrugs.size === 0
              ? "bg-gray-400 text-gray-200 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-500/20"
          }`}>
          ▶ {isEN?"Proceed to Response Simulation":"Yanıt Simülasyonuna Geç (Tab 3)"}
        </button>
        <div className="flex gap-2 flex-wrap">
          <span className={`text-xs px-2 py-1 rounded-lg ${d?"bg-gray-700 text-gray-400":"bg-white text-gray-500 border border-gray-200"}`}>
            {activeDrugs.size} {isEN?"drugs":"ilaç"} · {effectiveTEnd} {isEN?"days":"gün"}
          </span>
          <span className={`text-xs px-2 py-1 rounded-lg ${d?"bg-gray-700 text-gray-400":"bg-white text-gray-500 border border-gray-200"}`}>
            {patient.weight_kg}kg · WBC₀: {patient.wbc0}
          </span>
          <span className={`text-xs px-2 py-1 rounded-lg ${d?"bg-purple-500/20 text-purple-400":"bg-purple-100 text-purple-700"}`}>
            ODE: {odeActive.length} {isEN?"active":"aktif"}
          </span>
        </div>
      </div>

      {proceeded && (
        <div className={`rounded-2xl border p-4 ${d?"bg-green-500/10 border-green-500/30":"bg-green-50 border-green-300"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${d?"bg-green-500/20 text-green-400":"bg-green-600 text-white"}`}>✓</div>
            <p className={`text-sm font-bold ${d?"text-green-400":"text-green-800"}`}>
              {isEN?"Completed! Settings saved — use the button above to proceed.":"Tamamlandı! Ayarlar kaydedildi — devam etmek için yukarıdaki butonu kullanın."}
            </p>
          </div>
        </div>
      )}

      {/* ── Protokol Modu Seçimi — iki büyük kart ── */}
      <div className={card}>
        <h3 className={sectionTitle}>
          {isEN?"Treatment Protocol Mode":"Tedavi Protokolü Modu"}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
          {/* Ön Tanımlı */}
          <button onClick={() => setProtocolMode("preset")}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${
              protocolMode === "preset"
                ? (d?"border-blue-500 bg-blue-500/10":"border-blue-500 bg-blue-50")
                : (d?"border-gray-700 hover:border-gray-600":"border-gray-200 hover:border-gray-300")
            }`}>
            <p className={`text-lg mb-1 ${protocolMode==="preset"?(d?"text-blue-300":"text-blue-700"):(d?"text-gray-300":"text-gray-600")}`}>
              📋 {isEN?"Standard Protocol":"Ön Tanımlı Protokol"}
            </p>
            <p className={`text-xs ${d?"text-gray-400":"text-gray-500"}`}>
              {isEN
                ?"Choose COG AALL0331 or BFM ALL-2009. Phases, drugs and durations are pre-configured from literature."
                :"COG AALL0331 veya BFM ALL-2009 seçin. Fazlar, ilaçlar ve süreler literatürden önceden yapılandırılmıştır."}
            </p>
          </button>
          {/* Özel Protokol */}
          <button onClick={() => { if (protocolMode === "custom") return; setProtocolMode("custom"); setActiveDrugs(new Set()); setCustomPhases([{ id: Date.now(), name: isEN?"Phase 1":"Faz 1", duration_days: 29, drugs: [], doses: {}, drug_patterns: {} }]); }}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${
              protocolMode === "custom"
                ? (d?"border-amber-500 bg-amber-500/10":"border-amber-500 bg-amber-50")
                : (d?"border-gray-700 hover:border-gray-600":"border-gray-200 hover:border-gray-300")
            }`}>
            <p className={`text-lg mb-1 ${protocolMode==="custom"?(d?"text-amber-300":"text-amber-700"):(d?"text-gray-300":"text-gray-600")}`}>
              ⚙ {isEN?"Custom Protocol":"Özel Protokol"}
            </p>
            <p className={`text-xs ${d?"text-gray-400":"text-gray-500"}`}>
              {isEN
                ?"Design your own phases — define name, duration, drugs per phase. Explore new protocol combinations."
                :"Kendi fazlarınızı tasarlayın — her faz için isim, süre ve ilaç belirleyin. Yeni protokol kombinasyonları keşfedin."}
            </p>
          </button>
        </div>

        {/* ── Ön Tanımlı Protokol Seçimi ── */}
        {protocolMode === "preset" && (
          <div>
            <p className={`text-xs mb-2 font-semibold ${d?"text-gray-400":"text-gray-600"}`}>
              {isEN?"Select protocol:":"Protokol seçin:"}
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              {protocols.map(p => p.key !== "custom" && (
                <button key={p.key} onClick={() => handleProtocolSelect(p.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    selectedProtocol === p.key
                      ? (d?"border-blue-500/40 bg-blue-500/20 text-blue-300":"border-blue-400 bg-blue-50 text-blue-700")
                      : (d?"border-gray-700 text-gray-400":"border-gray-200 text-gray-500")
                  }`}>
                  {isEN ? p.name_en : p.name_tr}
                </button>
              ))}
            </div>
            {protocols.find(p=>p.key===selectedProtocol) && (
              <div className={`rounded-xl border p-3 text-xs ${d?"border-blue-500/20 bg-blue-500/5 text-blue-300":"border-blue-200 bg-blue-50 text-blue-700"}`}>
                <p className="font-semibold mb-1">{isEN?"Reference:":"Kaynak:"} {protocols.find(p=>p.key===selectedProtocol)?.ref}</p>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 mt-2">
                  {Object.entries(protocols.find(p=>p.key===selectedProtocol)?.phases||{}).map(([ph,info])=>(
                    <div key={ph} className={`rounded-lg p-1.5 ${d?"bg-slate-800":"bg-white"}`}>
                      <p className="font-semibold capitalize text-xs">{ph} ({info.duration_days}g)</p>
                      <p className="opacity-60 text-xs">{info.drugs.map(dk=>dk.toUpperCase()).join(", ")||"—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Özel Protokol Tasarımcısı ── */}
        {protocolMode === "custom" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold ${d?"text-amber-400":"text-amber-700"}`}>
                ⚙ {isEN?"Phase Designer":"Faz Tasarımcısı"}
                <span className={`ml-2 font-normal ${d?"text-gray-500":"text-gray-400"}`}>
                  {isEN?"(max 6 phases)":"(en fazla 6 faz)"}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${d?"text-gray-400":"text-gray-500"}`}>
                  {isEN?"Total:":"Toplam:"} {customPhases.reduce((s,p)=>s+(p.duration_days||0),0)} {isEN?"days":"gün"}
                  {" · "}
                  {customPhases.map((p,i)=>{
                    const s=customPhases.slice(0,i).reduce((a,b)=>a+(b.duration_days||0),0);
                    return `${p.name||"F"+(i+1)}: G${s}–G${s+(p.duration_days||0)}`;
                  }).join(" | ")}
                </span>
                <button onClick={addCustomPhase}
                  disabled={customPhases.length >= 6}
                  className={`text-xs px-3 py-1 rounded-lg border font-semibold transition-all ${
                    customPhases.length < 6
                      ?(d?"border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                          :"border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100")
                      :"opacity-40 cursor-not-allowed border-gray-600 text-gray-500"
                  }`}>
                  + {isEN?"Add Phase":"Faz Ekle"}
                </button>
              </div>
            </div>

            {customPhases.map((phase, idx) => (
              <div key={phase.id}
                className={`rounded-2xl border p-4 ${d?"border-amber-900/30 bg-slate-800":"border-amber-200 bg-amber-50/30"}`}>
                {/* Faz başlangıç/bitiş günleri — kümülatif */}
                {(()=>{
                  const start = customPhases.slice(0,idx).reduce((s,p)=>s+(p.duration_days||0),0);
                  const end = start + (phase.duration_days||0);
                  return (
                    <div className={`text-xs px-2 py-0.5 rounded-lg mb-2 font-mono
                      ${d?"bg-slate-700 text-slate-400":"bg-slate-100 text-slate-500"}`}>
                      G{start} → G{end}
                      <span className="ml-2 opacity-60">({phase.duration_days} {isEN?"days":"gün"})</span>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {/* Faz numarası */}
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0
                    ${d?"bg-amber-500/20 text-amber-400":"bg-amber-100 text-amber-700"}`}>
                    {idx+1}
                  </span>
                  {/* Faz adı */}
                  <input value={phase.name}
                    onChange={e => updateCustomPhase(phase.id, "name", e.target.value)}
                    className={`flex-1 min-w-32 text-sm font-semibold rounded-lg px-2 py-1 border
                      ${d?"bg-slate-700 border-slate-600 text-slate-200":"bg-white border-gray-200 text-gray-700"}`}
                    placeholder={isEN?"Phase name":"Faz adı"}
                  />
                  {/* Süre */}
                  <div className="flex items-center gap-1">
                    <input type="number" value={phase.duration_days} min={1} max={730}
                      onChange={e => updateCustomPhase(phase.id, "duration_days", Math.max(1, parseInt(e.target.value)||1))}
                      className={`w-16 text-sm rounded-lg px-2 py-1 border text-center
                        ${d?"bg-slate-700 border-slate-600 text-slate-200":"bg-white border-gray-200 text-gray-700"}`}
                    />
                    <span className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>{isEN?"days":"gün"}</span>
                  </div>
                  {/* Sil */}
                  {customPhases.length > 1 && (
                    <button onClick={() => removeCustomPhase(phase.id)}
                      className={`text-xs px-2 py-1 rounded-lg border ${d?"border-red-500/30 text-red-400 hover:bg-red-500/10":"border-red-200 text-red-500 hover:bg-red-50"}`}>
                      ✕
                    </button>
                  )}
                </div>
                {/* İlaç seçimi */}
                <div>
                  <p className={`text-xs mb-1.5 ${d?"text-gray-500":"text-gray-400"}`}>
                    {isEN?"Active drugs in this phase:":"Bu fazdaki aktif ilaçlar:"}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(allDrugs).map(([drugKey, drug]) => {
                      const sel = phase.drugs.includes(drugKey);
                      const col = drugKey==="6mp"?"#3b82f6":drugKey==="mtx"?"#10b981":
                                  drugKey==="vcr"?"#f59e0b":drugKey==="daunorubicin"?"#ef4444":
                                  drugKey==="asparaginase"?"#8b5cf6":drugKey==="corticosteroid"?"#ec4899":
                                  drugKey==="cytarabine"?"#06b6d4":drugKey==="cyclophosphamide"?"#84cc16":
                                  drugKey==="6tg"?"#f97316":drugKey==="copanlisib"?"#14b8a6":"#a855f7";
                      return (
                        <button key={drugKey}
                          onClick={() => toggleCustomPhaseDrugNew(phase.id, drugKey)}
                          className="text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all"
                          style={{
                            borderColor: sel ? col : (d?"#374151":"#e5e7eb"),
                            background:  sel ? `${col}20` : "transparent",
                            color:       sel ? col : (d?"#6b7280":"#9ca3af"),
                          }}>
                          {drug?.short || drugKey.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                  {/* Seçili ilaçlar için patern seçici */}
                  {phase.drugs.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className={`text-xs font-semibold ${d?"text-slate-500":"text-slate-400"}`}>
                        {isEN?"Schedule per drug (blank = protocol default):":"İlaç başına çizelge (boş = protokol varsayılanı):"}
                      </p>
                      {phase.drugs.map(drugKey => {
                        const opts = DRUG_PATTERN_OPTIONS[drugKey] || [];
                        const cur = (phase.drug_patterns||{})[drugKey] || "";
                        const col = drugKey==="6mp"?"#3b82f6":drugKey==="mtx"?"#10b981":
                                    drugKey==="vcr"?"#f59e0b":drugKey==="daunorubicin"?"#ef4444":
                                    drugKey==="asparaginase"?"#8b5cf6":drugKey==="corticosteroid"?"#ec4899":
                                    drugKey==="cytarabine"?"#06b6d4":drugKey==="cyclophosphamide"?"#84cc16":
                                    drugKey==="6tg"?"#f97316":drugKey==="copanlisib"?"#14b8a6":"#a855f7";
                        return (
                          <div key={drugKey} className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold w-14 flex-shrink-0 text-right" style={{color:col}}>
                              {allDrugs[drugKey]?.short||drugKey.toUpperCase()}
                            </span>
                            <button
                              onClick={() => updateCustomPhasePattern(phase.id, drugKey, "")}
                              className={`text-xs px-1.5 py-0.5 rounded border ${
                                cur===""
                                  ?(d?"border-slate-500 bg-slate-700 text-slate-200":"border-slate-400 bg-slate-100 text-slate-700")
                                  :(d?"border-slate-700 text-slate-600":"border-slate-200 text-slate-400")
                              }`}>
                              {isEN?"default":"varsayılan"}
                            </button>
                            {opts.map(opt => (
                              <button key={opt}
                                onClick={() => updateCustomPhasePattern(phase.id, drugKey, opt)}
                                className={`text-xs px-1.5 py-0.5 rounded border transition-all ${
                                  cur===opt
                                    ?(d?"border-blue-500/60 bg-blue-500/20 text-blue-300":"border-blue-400 bg-blue-50 text-blue-700")
                                    :(d?"border-slate-700 text-slate-500":"border-slate-200 text-slate-400")
                                }`}>
                                {PATTERN_LABELS[opt]||opt}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className={`rounded-xl border p-3 text-xs ${d?"border-amber-500/20 bg-amber-500/5":"border-amber-200 bg-amber-50"}`}>
              ⚠ {isEN
                ?"Custom protocol: drug schedules are auto-calculated from phase boundaries. Results may differ from validated clinical protocols — for research purposes only."
                :"Özel protokol: ilaç uygulama günleri faz sınırlarından otomatik hesaplanır. Sonuçlar doğrulanmış klinik protokollerden farklı olabilir — yalnızca araştırma amaçlıdır."}
            </div>
          </div>
        )}
      </div>

      {/* ── Faz bilgi panelleri (sadece bilgi, seçim yok) ── */}
      <div className={card}>
        <h3 className={sectionTitle}>
          {isEN?"Treatment Phase Guide (ALL Protocol)":"Tedavi Faz Rehberi (ALL Protokolü)"}
        </h3>
        <p className={`text-xs mb-3 ${d?"text-gray-500":"text-gray-400"}`}>
          {isEN
            ?"Reference only — select drugs above. Each phase has different goals and drug combinations. Standard 4-phase ALL protocol (COG AALL0331 / BFM 2009)."
            :"Yalnızca bilgi amaçlı — ilaçları yukarıdan seçin. Her fazın farklı hedefleri ve ilaç kombinasyonları vardır. Standart 4 fazlı ALL protokolü (COG AALL0331 / BFM 2009)."}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(phases).map(([key, phase]) => (
            <PhaseInfoPanel key={key} phaseKey={key} phase={phase} dark={d} isEN={isEN}/>
          ))}
        </div>
      </div>

      {/* ── İlaç seçimi ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={sectionTitle.replace("mb-3","")}>
            {isEN?"Drug Selection":"İlaç Seçimi"}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-lg ${d?"bg-emerald-500/20 text-emerald-400":"bg-emerald-100 text-emerald-700"}`}>
              {isEN?"ODE active:":"ODE aktif:"} {odeActive.length}
            </span>
            <span className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>
              {activeDrugs.size} {isEN?"selected":"seçili"}
            </span>
          </div>
        </div>
        <p className={`text-xs mb-3 ${d?"text-gray-500":"text-gray-400"}`}>
          {isEN
            ?"Each card shows which phases the drug is used in. ODE ✓ = fully simulated (all 11 drugs). PEG ⚡ = separate PK simulator. New drugs (CS/Ara-C/CPM/6-TG/COP/NOV) use protocol-fixed doses."
            :"Her kart ilacın hangi fazlarda kullanıldığını gösterir. ODE ✓ = tam simülasyon (11 ilaç). PEG ⚡ = ayrı PK simülatörü. Yeni ilaçlar (CS/Ara-C/CPM/6-TG/COP/NOV) protokol sabit dozlarını kullanır."}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(allDrugs).map(([key, drug]) => (
            <DrugCard key={key} drugKey={key} drug={drug}
              active={activeDrugs.has(key)} onToggle={toggleDrug}
              dark={d} phases={phases} isEN={isEN}/>
          ))}
        </div>
      </div>

      {/* ── Hasta parametreleri ── */}
      <div className={card}>
        <h3 className={sectionTitle}>{isEN?"Patient Parameters":"Hasta Parametreleri"}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ParamInput label={isEN?"Weight":"Ağırlık"} unit="kg"
            value={patient.weight_kg} onChange={v=>setPatient(p=>({...p,weight_kg:v}))} min={5} max={120} step={0.5} dark={d}/>
          <ParamInput label={isEN?"Height":"Boy"} unit="cm"
            value={patient.height_cm} onChange={v=>setPatient(p=>({...p,height_cm:v}))} min={50} max={200} step={0.5} dark={d}/>
          <ParamInput label="TPMT" unit="0-3"
            value={patient.tpmt} onChange={v=>setPatient(p=>({...p,tpmt:v}))} min={0} max={3} step={0.1} dark={d}/>
          <ParamInput label="Vitamin D" unit="ng/mL"
            value={patient.vitamin_d} onChange={v=>setPatient(p=>({...p,vitamin_d:v}))} min={5} max={100} step={1} dark={d}/>
          <ParamInput label={isEN?"Diet score":"Diyet skoru"} unit="0–1.5"
            value={patient.diet} onChange={v=>setPatient(p=>({...p,diet:v}))} min={0} max={1.5} step={0.1} dark={d}/>
          <ParamInput label={isEN?"Exercise":"Egzersiz"} unit="0–1.5"
            value={patient.exercise} onChange={v=>setPatient(p=>({...p,exercise:v}))} min={0} max={1.5} step={0.1} dark={d}/>
          <ParamInput label="WBC₀" unit="×10⁹/L"
            value={patient.wbc0} onChange={v=>setPatient(p=>({...p,wbc0:v}))} min={0.5} max={30} step={0.1} dark={d}/>
          <ParamInput label="ANC₀" unit="×10⁹/L"
            value={patient.anc0} onChange={v=>setPatient(p=>({...p,anc0:v}))} min={0.1} max={10} step={0.1} dark={d}/>
        </div>
      </div>

      {/* ── Doz ayarları ── */}
      <div className={card}>
        <h3 className={sectionTitle}>{isEN?"Dose Settings (ODE Drugs)":"Doz Ayarları (ODE İlaçları)"}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {activeDrugs.has("6mp") && (
            <ParamInput label={isEN?"6-MP dose":"6-MP dozu"} unit={isEN?"mg/day":"mg/gün"}
              value={doses.dose_6mp_mg} onChange={v=>setDoses(d=>({...d,dose_6mp_mg:v}))} min={10} max={200} step={5} dark={d}/>
          )}
          {activeDrugs.has("mtx") && (
            <ParamInput label={isEN?"MTX dose":"MTX dozu"} unit={isEN?"mg/week":"mg/hafta"}
              value={doses.dose_mtx_mg} onChange={v=>setDoses(d=>({...d,dose_mtx_mg:v}))} min={5} max={100} step={2.5} dark={d}/>
          )}
          {activeDrugs.has("vcr") && (
            <ParamInput label={isEN?"VCR dose":"VCR dozu"} unit={isEN?"mg/28d":"mg/28gün"}
              value={doses.dose_vcr_mg} onChange={v=>setDoses(d=>({...d,dose_vcr_mg:v}))} min={0.5} max={5} step={0.1} dark={d}/>
          )}
          {activeDrugs.has("daunorubicin") && (
            <ParamInput label={isEN?"DNR dose":"DNR dozu"} unit="mg/m²"
              value={doses.dose_dnr_mg_m2||25} onChange={v=>setDoses(d=>({...d,dose_dnr_mg_m2:v}))} min={10} max={45} step={2.5} dark={d}/>
          )}
          {activeDrugs.has("asparaginase") && (
            <div className={`rounded-xl border p-3 col-span-2 ${d?"border-purple-500/30 bg-purple-500/5":"border-purple-200 bg-purple-50"}`}>
              <p className={`text-xs font-semibold ${d?"text-purple-400":"text-purple-700"}`}>
                PEG-ASP (Pegaspargase)
              </p>
              <p className={`text-xs mt-0.5 ${d?"text-gray-500":"text-gray-400"}`}>
                {isEN
                  ?"Dose: 2500 IU/m² · D4, D36, D57, D91 (COG/BFM protocol)"
                  :"Doz: 2500 IU/m² · G4, G36, G57, G91 (COG/BFM protokolü)"}
              </p>
              <p className={`text-xs mt-0.5 ${d?"text-purple-500":"text-purple-600"}`}>
                {isEN
                  ?"⚡ Separate PK simulator — asparagine depletion calculated automatically"
                  :"⚡ Ayrı PK simülatörü — asparagin deplesyonu otomatik hesaplanır"}
              </p>
            </div>
          )}
          {/* ── Yeni ilaç doz sliderları ── */}
          {activeDrugs.has("corticosteroid") && (
            <ParamInput
              label={isEN?"CS dose (Prednisone)":"CS dozu (Prednizon)"}
              unit="mg/m²/gün"
              value={doses.dose_ster_mg_m2||40}
              onChange={v=>setDoses(d=>({...d,dose_ster_mg_m2:v}))}
              min={10} max={80} step={5} dark={d}
              hint={isEN?"Ref: 40 mg/m²/d (Cooper 2014)":"Ref: 40 mg/m²/gün (Cooper 2014)"}
            />
          )}
          {activeDrugs.has("cytarabine") && (
            <ParamInput
              label={isEN?"Ara-C dose":"Ara-C dozu"}
              unit="mg/m²"
              value={doses.dose_arac_mg_m2||75}
              onChange={v=>setDoses(d=>({...d,dose_arac_mg_m2:v}))}
              min={25} max={200} step={25} dark={d}
              hint={isEN?"Ref: 75 mg/m² std (Galmarini 2001)":"Ref: 75 mg/m² std (Galmarini 2001)"}
            />
          )}
          {activeDrugs.has("cyclophosphamide") && (
            <ParamInput
              label={isEN?"CPM dose":"CPM dozu"}
              unit="mg/m²"
              value={doses.dose_cpm_mg_m2||1000}
              onChange={v=>setDoses(d=>({...d,dose_cpm_mg_m2:v}))}
              min={500} max={1500} step={100} dark={d}
              hint={isEN?"⚠ >1500 mg/m²: hemorrhagic cystitis risk":"⚠ >1500 mg/m²: hemoraji sistit riski"}
            />
          )}
          {activeDrugs.has("6tg") && (
            <ParamInput
              label={isEN?"6-TG dose":"6-TG dozu"}
              unit="mg/m²/gün"
              value={doses.dose_6tg_mg_m2||60}
              onChange={v=>setDoses(d=>({...d,dose_6tg_mg_m2:v}))}
              min={20} max={100} step={10} dark={d}
              hint={isEN?"Ref: 60 mg/m²/d (Lennard 1993)":"Ref: 60 mg/m²/gün (Lennard 1993)"}
            />
          )}
          {activeDrugs.has("copanlisib") && (
            <ParamInput
              label={isEN?"Copanlisib dose":"Kopanlisib dozu"}
              unit="mg IV"
              value={doses.dose_cop_mg||60}
              onChange={v=>setDoses(d=>({...d,dose_cop_mg:v}))}
              min={30} max={60} step={5} dark={d}
              hint={isEN?"Ref: 60 mg IV weekly (Markham 2017)":"Ref: 60 mg IV haftalık (Markham 2017)"}
            />
          )}
          {activeDrugs.has("novobiocin") && (
            <ParamInput
              label={isEN?"Novobiocin dose":"Novobiocin dozu"}
              unit="mg/kg/gün"
              value={doses.dose_nov_mg_kg||10}
              onChange={v=>setDoses(d=>({...d,dose_nov_mg_kg:v}))}
              min={5} max={30} step={2.5} dark={d}
              hint={isEN?"Repositioned — ref: 10 mg/kg/d":"Yeniden konumlandırılmış — ref: 10 mg/kg/gün"}
            />
          )}
        </div>
      </div>

      {/* ── Simülasyon ayarları ── */}
      <div className={card}>
        <h3 className={sectionTitle}>{isEN?"Simulation Settings":"Simülasyon Ayarları"}</h3>
        <div className="grid grid-cols-2 gap-3">
          {protocolMode === "preset" ? (
            <ParamInput label={isEN?"Simulation duration":"Simülasyon süresi"} unit={isEN?"days":"gün"}
              value={tEnd} onChange={setTEnd} min={28} max={730} step={7} dark={d}/>
          ) : (
            <div className={`rounded-xl border p-3 ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-slate-50"}`}>
              <p className={`text-xs font-semibold mb-0.5 ${d?"text-slate-400":"text-slate-600"}`}>
                {isEN?"Simulation duration":"Simülasyon süresi"}
              </p>
              <p className="text-lg font-mono font-bold" style={{color:"#f59e0b"}}>
                {effectiveTEnd} {isEN?"days":"gün"}
              </p>
              <p className={`text-xs ${d?"text-slate-600":"text-slate-400"}`}>
                {isEN?"Auto-calculated from phase durations":"Faz sürelerinin toplamından otomatik"}
              </p>
            </div>
          )}
          <div>
            <label className={`text-xs font-medium block mb-1 ${d?"text-gray-400":"text-gray-600"}`}>
              {isEN?"Session name":"Oturum adı"}
            </label>
            <input type="text" value={sessionName} onChange={e=>setSessionName(e.target.value)}
              placeholder={isEN?"Optional":"Opsiyonel"}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                d?"bg-gray-800 border-gray-700 text-gray-200":"bg-white border-gray-200 text-gray-800"
              }`}/>
          </div>
        </div>
      </div>
    </div>
  );
}
