// src/components/tabs/Tab4GA.jsx
import { useState, useCallback, useEffect, useRef } from "react";
import { useLang } from "../../i18n/LangContext";
import { DRUG_PALETTE, drugColor, drugLabel, SIMULABLE_DRUG_KEYS } from "../../constants/drugConfig";
import HowToUse from "../ui/HowToUse";
import NextTabBanner from "../ui/NextTabBanner";

// Client-side CSV export — backend dosyasına bağımlı değil
function downloadCSVFromData(rows, filename) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r =>
    headers.map(h => {
      const v = r[h] ?? "";
      return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
    }).join(",")
  )].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function GAExportButton({ result, dark }) {
  const { lang } = useLang();
  const isEN = lang === "en";
  const d = dark;
  const [loading, setLoading] = useState(false);

  if (!result) return null;

  const handleExport = () => {
    setLoading(true);
    try {
      const plan = result.best_plan || {};
      const ts   = result.timeseries || {};
      const hist = result.history || [];

      // Doz planı
      const doseRows = (plan["6mp"] || []).map((v, i) => ({
        hafta: i + 1,
        "6MP_mg_gün": v?.toFixed(2) ?? "",
        "MTX_mg_hafta": (plan["mtx"]?.[i] ?? "")?.toFixed?.(2) ?? "",
      }));

      // VCR
      const vcrRows = (plan["vcr"] || []).map((v, i) => ({
        döngü: i + 1, VCR_mg: v?.toFixed(3) ?? "",
      }));

      // Zaman serisi
      const tArr = ts.t || [];
      const tsRows = tArr.map((t, i) => ({
        gün: t?.toFixed(1) ?? i,
        WBC: ts.WBC?.[i]?.toFixed(4) ?? "",
        ANC: ts.ANC?.[i]?.toFixed(4) ?? "",
        VIPN: ts.VIPN?.[i]?.toFixed(4) ?? "",
        "6MP_gün": ts.daily_6mp?.[i]?.toFixed(3) ?? "",
        "MTX_gün": ts.daily_mtx?.[i]?.toFixed(3) ?? "",
        "VCR_gün": ts.daily_vcr?.[i]?.toFixed(3) ?? "",
        "DNR_gün": ts.daily_dnr?.[i]?.toFixed(3) ?? "",
      }));

      // Fitness geçmişi
      const histRows = hist.map(h => ({
        nesil: h.generation,
        en_iyi_skor: h.best_score?.toFixed(4) ?? "",
        WBC_hedef: h.wbc_target_frac?.toFixed(4) ?? "",
        ANC_hedef: h.anc_target_frac?.toFixed(4) ?? "",
      }));

      // Metrikler
      const m = result.best_metrics || {};
      const metRows = Object.entries(m).map(([k, v]) => ({
        metrik: k, değer: typeof v === "number" ? v.toFixed(4) : v,
      }));

      // Hepsini birleştir ayrı bölümlerle
      const allRows = [
        { bölüm: "=== DOZ PLANI (6-MP + MTX) ===" }, ...doseRows, {},
        { bölüm: "=== VCR DÖNGÜLERI ===" }, ...vcrRows, {},
        { bölüm: "=== FITNESS GECMISi ===" }, ...histRows, {},
        { bölüm: "=== METRiKLER ===" }, ...metRows, {},
        { bölüm: "=== ZAMAN SERiSi ===" }, ...tsRows,
      ];

      const ts_id = result.job_id?.slice(0, 8) || Date.now();
      downloadCSVFromData(allRows, `sting_ga_${ts_id}.csv`);
    } catch(e) {
      console.error("Export error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleExport} disabled={loading}
        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-medium transition-colors disabled:opacity-50 ${
          d ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
            : "border-green-300 text-green-700 hover:bg-green-50"}`}>
        {loading
          ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>}
        {isEN ? "Download CSV" : "CSV İndir"}
      </button>
    </div>
  );
}

const BASE = "/api/v1";
function getToken() { return localStorage.getItem("sting_token"); }

async function apiPost(path, body, signal) {
  const res = await fetch(`${BASE}${path}`, {
    method:"POST",
    headers:{ Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json" },
    body:JSON.stringify(body),
    signal,
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.detail || JSON.stringify(d));
  return d;
}

// ── Plotly yükleyici ───────────────────────────────────────────────────────
function usePlotly() {
  const [ready, setReady] = useState(!!window.Plotly);
  useEffect(() => {
    if (window.Plotly) return;
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/plotly.js-dist@2.27.0/plotly.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ── GA Progress göstergesi — done sinyali ile senkron ─────────────────────
function GAProgress({ elapsed, done, nGen, popSize, dark, isEN }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "." : d+"."), 500);
    return () => clearInterval(iv);
  }, []);

  const totalJobs = nGen * popSize;
  const estGA     = Math.max(10, Math.round(totalJobs * 0.4));  // GA süresi tahmini
  const estPlots  = 8;  // matplotlib grafik süresi tahmini (~8s)
  const estTotal  = estGA + estPlots;

  // GA tamamlandı mı (grafik aşamasına geçildi mi)?
  const gaPhase    = elapsed <= estGA || done;
  const plotsPhase = elapsed > estGA;

  const pct = done ? 100
    : plotsPhase
      ? Math.min(95, 80 + Math.round(((elapsed - estGA) / estPlots) * 20))
      : Math.min(80, Math.round((elapsed / estGA) * 80));

  const remaining = done ? 0 : Math.max(0, estTotal - Math.round(elapsed));

  const stages = [
    { label: isEN?"Population initialized":"Popülasyon oluşturuldu",    done: elapsed > 0.5 || done },
    { label: isEN?"Evaluating individuals":"Bireyler değerlendiriliyor", done: elapsed > 2   || done },
    { label: isEN?"Selection & crossover":"Seçim ve çaprazlama",         done: elapsed > estGA*0.4 || done },
    { label: isEN?"Convergence check":"Yakınsama kontrolü",              done: elapsed > estGA*0.8 || done },
    { label: isEN?"GA complete — generating plots":"GA tamamlandı — grafikler oluşturuluyor",
      done: done, active: plotsPhase && !done },
  ];

  return (
    <div className={`mt-4 rounded-xl border p-4 space-y-3 ${dark?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-200"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${done?"text-green-500":plotsPhase?"text-blue-500":"text-amber-500"}`}>
          {done
            ? (isEN?"Complete!":"Tamamlandı!")
            : plotsPhase
              ? (isEN?"Generating charts…":"Grafikler oluşturuluyor…")
              : (isEN?"GA optimizing":"GA optimize ediyor")}{!done && dots}
        </span>
        <span className={`text-xs font-mono ${dark?"text-gray-500":"text-gray-400"}`}>
          {elapsed.toFixed(0)}s {!done && `/ ~${estTotal}s`}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className={dark?"text-gray-400":"text-gray-600"}>{pct}%</span>
          {!done && <span className={dark?"text-gray-500":"text-gray-400"}>~{remaining}s {isEN?"left":"kaldı"}</span>}
        </div>
        <div className={`w-full rounded-full h-2 overflow-hidden ${dark?"bg-gray-700":"bg-gray-200"}`}>
          <div className={`h-2 rounded-full transition-all duration-500 ${
            done?"bg-green-500":plotsPhase?"bg-blue-500":"bg-amber-500"
          }`} style={{width:`${pct}%`}}/>
        </div>
      </div>

      <div className="space-y-2">
        {stages.map((s,i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
              s.done ?"bg-green-500"
              :s.active?"bg-blue-500 animate-pulse"
              :dark   ?"bg-gray-700 animate-pulse":"bg-gray-300 animate-pulse"
            }`}>
              {s.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>}
            </div>
            <span className={`text-xs ${
              s.done  ?(dark?"text-gray-300":"text-gray-700")
              :s.active?(dark?"text-blue-400":"text-blue-600")
              :(dark?"text-gray-600":"text-gray-400")
            }`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <p className={`text-xs ${dark?"text-gray-600":"text-gray-400"}`}>
        {plotsPhase && !done
          ? (isEN?"Matplotlib charts rendering (this takes ~8s)…":"Matplotlib grafikleri render ediliyor (~8s)…")
          : isEN
            ?`${nGen} generations × ${popSize} individuals`
            :`${nGen} nesil × ${popSize} birey`
        }
      </p>
    </div>
  );
}

// ── Fitness geçmişi (Plotly dinamik) ──────────────────────────────────────
function FitnessChart({ history, dark, isEN }) {
  const ref   = useRef(null);
  const ready = usePlotly();
  useEffect(() => {
    if (!ready || !ref.current || !history?.length) return;
    const bg=dark?"#111827":"#fff", gc=dark?"#374151":"#e5e7eb", tc=dark?"#d1d5db":"#374151";
    window.Plotly.newPlot(ref.current,[
      {x:history.map(h=>h.generation), y:history.map(h=>h.best_score),
       name:isEN?"Fitness":"Fitness",
       line:{color:"#f59e0b",width:2.5},mode:"lines+markers",
       marker:{size:6,color:"#f59e0b"},
       hovertemplate:`<b>${isEN?"Gen":"Nesil"} %{x}</b><br>Fitness: %{y:.2f}<extra></extra>`},
      {x:history.map(h=>h.generation), y:history.map(h=>((h.wbc_target_frac||0)*100).toFixed(1)),
       name:"WBC%",line:{color:"#3b82f6",width:2,dash:"dash"},mode:"lines",yaxis:"y2",
       hovertemplate:`WBC%%: %{y}<extra></extra>`},
      {x:history.map(h=>h.generation), y:history.map(h=>((h.anc_target_frac||0)*100).toFixed(1)),
       name:"ANC%",line:{color:"#10b981",width:2,dash:"dot"},mode:"lines",yaxis:"y2",
       hovertemplate:`ANC%%: %{y}<extra></extra>`},
    ],{
      paper_bgcolor:bg, plot_bgcolor:bg,
      font:{color:tc, size:11, family:"system-ui,sans-serif"},
      margin:{t:40, b:50, l:65, r:70, pad:4},
      xaxis:{title:{text:isEN?"Generation":"Nesil",standoff:10}, gridcolor:gc, dtick:1, tickmode:"linear"},
      yaxis:{title:{text:isEN?"Fitness score":"Fitness skoru",standoff:10}, gridcolor:gc, side:"left"},
      yaxis2:{title:{text:isEN?"In target (%)":"Hedefte (%)",standoff:10},
              overlaying:"y", side:"right", range:[0,105], showgrid:false,
              ticksuffix:"%"},
      legend:{orientation:"h", x:0, y:1.12, xanchor:"left"},
      hovermode:"x unified",
    },{
      responsive:true,
      displayModeBar:true,
      modeBarButtonsToRemove:["lasso2d","select2d","autoScale2d"],
      toImageButtonOptions:{format:"png",filename:`sting_ga_fitness_${Date.now()}`,scale:2},
    });
  },[ready,history,dark,isEN]);
  return <div ref={ref} style={{width:"100%",height:280}} className="rounded-xl overflow-hidden"/>;
}

// ── Doz planı (Plotly dinamik) ─────────────────────────────────────────────
function DoseChart({ plan, dark, isEN, activeDrugs=[], phaseList=null }) {
  const ref   = useRef(null);
  const ready = usePlotly();
  useEffect(() => {
    if (!ready || !ref.current || !plan) return;
    const bg=dark?"#111827":"#fff", gc=dark?"#374151":"#e5e7eb", tc=dark?"#d1d5db":"#374151";
    // Toplam gün sayısı ve faz listesi — phaseList prop'tan
    const dosePhList = phaseList && phaseList.length > 0 ? phaseList : [
      {name:isEN?"Induction":"İndüksiyon",    start:0,  end:29},
      {name:isEN?"Consolidation":"Konsolidasyon",start:29, end:84},
      {name:isEN?"Re-induction":"Re-ind.",    start:84, end:140},
      {name:isEN?"Maintenance":"İdame",       start:140,end:250},
    ];
    const tEnd = Math.max(...dosePhList.map(p => p.end));
    // Faz referansları — tüm ilaç bloklarında ortak kullanılır
    const ph6mpCons  = dosePhList.length > 1 ? dosePhList[1] : dosePhList[0];
    const ph6mpMaint = dosePhList[dosePhList.length-1];
    const traces = [];

    // ── 6-MP: haftalık çizelge → konsolidasyon (G29–84) + idame (G140–250) günlerine yerleştir ──
    // n_weeks=24: ilk 8 hafta = Kons (G29–84), sonraki 16 hafta = İdame (G140–250)
    if(plan["6mp"]?.length && activeDrugs.includes("6mp")) {
      const days6mp=[], vals6mp=[];
      plan["6mp"].forEach((dose, wi) => {
        let day;
        if(wi < 8)  day = ph6mpCons.start + wi*7;
        else        day = ph6mpMaint.start + (wi-8)*7;
        // Her hafta için 7 gün çiz (step)
        for(let d2=0;d2<7;d2++){
          const g=day+d2;
          if(g<=tEnd){days6mp.push(g);vals6mp.push(dose);}
        }
      });
      traces.push({x:days6mp, y:vals6mp, name:isEN?"6-MP (daily)":"6-MP (günlük)",
        line:{color:"#3b82f6",width:2.5,shape:"hv"}, mode:"lines",
        hovertemplate:`<b>${isEN?"Day":"Gün"} %{x}</b><br>6-MP: %{y:.1f} mg<extra></extra>`});
    }

    // ── MTX: haftalık → aynı faz günlerine, tek nokta per hafta ──
    if(plan["mtx"]?.length && activeDrugs.includes("mtx")) {
      const daysMtx=[], valsMtx=[];
      plan["mtx"].forEach((dose, wi) => {
        let day;
        if(wi < 8)  day = ph6mpCons.start + wi*7;
        else        day = ph6mpMaint.start + (wi-8)*7;
        if(day<=tEnd){daysMtx.push(day);valsMtx.push(dose);}
      });
      traces.push({x:daysMtx, y:valsMtx, name:isEN?"MTX (weekly)":"MTX (haftalık)",
        mode:"markers", yaxis:"y2",
        marker:{size:8,color:"#10b981",symbol:"circle"},
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — MTX: %{y:.1f} mg<extra></extra>`});
    }

    // ── VCR: protokoldeki gerçek uygulama günleri ──
    // İnd: G1,8,15,22 | Kons: G36,64 | Re-ind: G84,91,98,105 | İdame: G140,168,196,224...
    // VCR günleri phaseList'ten hesapla
    const ph0 = dosePhList[0];
    const ph2 = dosePhList.length > 2 ? dosePhList[2] : null;
    const ph3 = dosePhList.length > 3 ? dosePhList[3] : dosePhList[dosePhList.length-1];
    const VCR_DAYS = [
      ph0.start+1, ph0.start+8, ph0.start+15, ph0.start+22,
      ...(ph2 ? [ph2.start, ph2.start+7, ph2.start+14, ph2.start+21] : []),
      ...(ph3 ? [ph3.start, ph3.start+28, ph3.start+56, ph3.start+84] : []),
    ].filter(d2 => d2 <= tEnd);
    if(plan["vcr"]?.length && activeDrugs.includes("vcr")) {
      const daysVcr=[], valsVcr=[];
      plan["vcr"].forEach((dose, ci) => {
        if(ci < VCR_DAYS.length){daysVcr.push(VCR_DAYS[ci]);valsVcr.push(dose);}
      });
      traces.push({x:daysVcr, y:valsVcr, name:"VCR",
        mode:"markers", yaxis:"y3",
        marker:{size:10,color:"#f59e0b",symbol:"diamond"},
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — VCR: %{y:.2f} mg<extra></extra>`});
    }

    // ── DNR: G1,8,15,22 (İnd) + G84,91 (Re-ind) — sabit ──
    if(activeDrugs.includes("daunorubicin")) {
      // DNR — 1. fazın ilk 4 haftası + 3. fazın ilk 2 haftası (varsa)
      const dnrPh0 = dosePhList[0];
      const dnrPh2 = dosePhList.length > 2 ? dosePhList[2] : null;
      const dnrDays = [dnrPh0.start+1, dnrPh0.start+8, dnrPh0.start+15, dnrPh0.start+22,
        ...(dnrPh2 ? [dnrPh2.start, dnrPh2.start+7] : [])].filter(d2=>d2<=tEnd);
      traces.push({x:dnrDays, y:dnrDays.map(()=>25), name:"DNR",
        mode:"markers", marker:{color:"#ef4444",size:10,symbol:"triangle-up"},
        yaxis:"y3",
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — DNR: %{y} mg/m²<extra></extra>`});
    }

    // ── PEG-ASP: G4,36,57,91 — sabit ──
    if(activeDrugs.includes("asparaginase")) {
      // PEG-ASP — fazlar boyunca dağıtılmış 4 doz
      const pegTotal = Math.min(tEnd, dosePhList[dosePhList.length-1].end);
      const pegInterval = Math.floor(pegTotal / 4);
      const pegDays = [4, pegInterval, pegInterval*2, Math.min(pegTotal-5, pegInterval*3)].filter(d2=>d2>0&&d2<=tEnd);
      traces.push({x:pegDays, y:pegDays.map(()=>2500), name:"PEG-ASP",
        mode:"markers", marker:{color:"#8b5cf6",size:10,symbol:"star"},
        yaxis:"y4",
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — PEG-ASP: %{y} IU/m²<extra></extra>`});
    }

    // ── Corticosteroid: G1-28 (İnd) + G84-111 (Re-ind) + İdame pulsleri ──
    // Kaynak: Cooper & Brown (2014). Semin Hematol.
    if(activeDrugs.includes("corticosteroid")) {
      const csDays=[]; const csVals=[];
      // Faz sınırlarından CS günlerini hesapla
      dosePhList.forEach((ph, i) => {
        if(i === 0) { // İlk faz (indüksiyon benzeri): tüm günler
          for(let d2=ph.start;d2<ph.end&&d2<=tEnd;d2++){csDays.push(d2);csVals.push(40);}
        } else if(i === dosePhList.length-1) { // Son faz: 5 günlük pulslar
          for(let s=ph.start;s<ph.end&&s<=tEnd;s+=28) for(let d2=s;d2<s+5&&d2<ph.end&&d2<=tEnd;d2++){csDays.push(d2);csVals.push(40);}
        } else if(i === 2 && dosePhList.length > 2) { // 3. faz (re-indüksiyon benzeri)
          for(let d2=ph.start;d2<ph.end&&d2<=tEnd;d2++){csDays.push(d2);csVals.push(40);}
        }
      });
      traces.push({x:csDays, y:csVals, name:isEN?"CS (Prednisone)":"CS (Prednizon)",
        line:{color:"#ec4899",width:1.5,shape:"hv"}, mode:"lines",
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — CS: %{y} mg/m²<extra></extra>`});
    }

    // ── Cytarabine: G29-33, G43-47 (Kons) + G84-88, G99-103 (Re-ind) ──
    // Kaynak: Galmarini et al. (2001); Mahmud et al. (2003)
    if(activeDrugs.includes("cytarabine")) {
      // Ara-C — 2. ve 3. fazlarda bloklar (varsa)
      const acDays = [];
      if(dosePhList.length > 1) {
        const ac2 = dosePhList[1]; // konsolidasyon
        [ac2.start, ac2.start+14].forEach(s => { for(let d2=s;d2<s+4&&d2<ac2.end&&d2<=tEnd;d2++) acDays.push(d2); });
      }
      if(dosePhList.length > 2) {
        const ac3 = dosePhList[2]; // re-ind
        [ac3.start, ac3.start+15].forEach(s => { for(let d2=s;d2<s+4&&d2<ac3.end&&d2<=tEnd;d2++) acDays.push(d2); });
      }
      const acVals=acDays.map(()=>75);
      traces.push({x:acDays, y:acVals, name:isEN?"Ara-C (Cytarabine)":"Ara-C (Sitarabin)",
        mode:"markers", marker:{color:"#06b6d4",size:9,symbol:"square"},
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — Ara-C: %{y} mg/m²<extra></extra>`});
    }

    // ── Cyclophosphamide: G84-85 (Re-ind, yüksek doz IV) ──
    // Kaynak: Yule et al. (2004). Clin Pharmacol Ther.
    if(activeDrugs.includes("cyclophosphamide")) {
      // CPM — re-indüksiyon fazının ilk 2 günü
      const cpmPh = dosePhList.length > 2 ? dosePhList[2] : dosePhList[dosePhList.length-1];
      const cpmDays = [cpmPh.start, cpmPh.start+1].filter(d2=>d2<=tEnd);
      traces.push({x:cpmDays, y:cpmDays.map(()=>1000), name:isEN?"CPM (Cyclophosphamide)":"CPM (Siklofosfamid)",
        mode:"markers", marker:{color:"#84cc16",size:12,symbol:"triangle-down"},
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — CPM: %{y} mg/m²<extra></extra>`});
    }

    // ── 6-TG: G84-98 günlük oral (Re-ind) ──
    // Kaynak: Lennard et al. (1993). Br J Cancer.
    if(activeDrugs.includes("6tg")) {
      const tgDays=[]; const tgVals=[];
      // Re-indüksiyon fazı (3. faz) veya son fazdan önceki faz
      const tgPh = dosePhList.length > 2 ? dosePhList[2] : dosePhList[dosePhList.length-1];
      for(let d2=tgPh.start;d2<tgPh.end&&d2<=tEnd;d2++){tgDays.push(d2);tgVals.push(60);}
      traces.push({x:tgDays, y:tgVals, name:isEN?"6-TG (Thioguanine)":"6-TG (Tioguanin)",
        line:{color:"#f97316",width:2,shape:"hv"}, mode:"lines",
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — 6-TG: %{y} mg/m²<extra></extra>`});
    }

    // ── Copanlisib: 28 günlük siklus G1,G8,G15 IV ──
    // Kaynak: Markham A. (2017). Drugs. 77(15):1697–1704.
    if(activeDrugs.includes("copanlisib")) {
      const copDays=[]; const copVals=[];
      for(let slotS=0;slotS<=tEnd;slotS+=28){[1,8,15].forEach(slotOff=>{const copSlotDay=slotS+slotOff;if(copSlotDay<=tEnd){copDays.push(copSlotDay);copVals.push(60);}});}
      traces.push({x:copDays, y:copVals, name:isEN?"Copanlisib (IV)":"Copanlisib (IV)",
        mode:"markers", marker:{color:"#14b8a6",size:9,symbol:"pentagon"},
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — COP: %{y} mg<extra></extra>`});
    }

    // ── Novobiocin: günlük oral (tüm aktif fazlarda) ──
    // Kaynak: Burlison et al. (2006). J Org Chem.
    if(activeDrugs.includes("novobiocin")) {
      const novDays=[]; const novVals=[];
      for(let d2=1;d2<=tEnd;d2++){novDays.push(d2);novVals.push(10);}
      traces.push({x:novDays, y:novVals, name:isEN?"Novobiocin (daily)":"Novobiocin (günlük)",
        line:{color:"#a855f7",width:1.2,dash:"dot",shape:"hv"}, mode:"lines", opacity:0.7,
        hovertemplate:`${isEN?"Day":"Gün"} %{x} — NOV: %{y} mg/kg<extra></extra>`});
    }

    // Faz bantları — phaseList'ten dinamik
    const phA = dark?"0.10":"0.13";
    const dosePhaseColors = [
      `rgba(239,68,68,${phA})`,`rgba(245,158,11,${phA})`,
      `rgba(168,85,247,${phA})`,`rgba(16,185,129,${phA})`,
      `rgba(59,130,246,${phA})`,`rgba(236,72,153,${phA})`,
    ];
    const doseLineColors = ["#f59e0b","#a855f7","#10b981","#3b82f6","#ec4899","#f97316"];
    const shapes=[
      ...dosePhList.flatMap((ph,i) => [
        {type:"rect",xref:"x",yref:"paper",x0:ph.start,x1:ph.end,y0:0,y1:1,
         fillcolor:dosePhaseColors[i%dosePhaseColors.length],line:{width:0},layer:"below"},
        ...(i>0?[{type:"line",xref:"x",yref:"paper",x0:ph.start,x1:ph.start,y0:0,y1:1,
         line:{color:doseLineColors[i%doseLineColors.length],width:1,dash:"dash"}}]:[]),
      ]),
    ];
    const annotations=dosePhList.map((ph,i)=>{
      const fc=["#C62828","#E65100","#6A1B9A","#2E7D32","#1B3A6B","#9D174D"][i%6];
      return {x:(ph.start+ph.end)/2,y:1.06,xref:"x",yref:"paper",
        text:ph.name,showarrow:false,yanchor:"bottom",font:{color:fc,size:9,weight:700}};
    });

    if(!traces.length) return;

    const hasPeg = activeDrugs.includes("asparaginase");
    window.Plotly.newPlot(ref.current, traces, {
      paper_bgcolor:bg, plot_bgcolor:bg,
      font:{color:tc,size:11,family:"system-ui,sans-serif"},
      margin:{t:75,b:50,l:70,r:hasPeg?140:100,pad:4},
      xaxis:{title:{text:isEN?"Day (Protocol)":"Gün (Protokol)",standoff:12},
             gridcolor:gc, range:[0, tEnd*1.02]},
      yaxis: {title:{text:"6-MP (mg/gün)",standoff:12},gridcolor:gc,side:"left"},
      yaxis2:{title:{text:"MTX (mg/hafta)",standoff:12},overlaying:"y",side:"right",showgrid:false,position:hasPeg?0.78:0.88},
      yaxis3:{title:{text:isEN?"VCR/DNR (mg)":"VCR/DNR (mg)",standoff:12},overlaying:"y",side:"right",showgrid:false,anchor:"free",position:hasPeg?0.89:1.0},
      ...(hasPeg?{yaxis4:{title:{text:"PEG-ASP (IU/m²)",standoff:12},overlaying:"y",side:"right",showgrid:false,anchor:"free",position:1.0}}:{}),
      shapes, annotations,
      legend:{orientation:"h",x:0,y:1.22,xanchor:"left",yanchor:"bottom",font:{size:10}},
      hovermode:"x unified",
    },{responsive:true,displayModeBar:true,
       modeBarButtonsToRemove:["lasso2d","select2d","autoScale2d"],
       toImageButtonOptions:{format:"png",filename:`sting_dose_plan_${Date.now()}`,scale:2}});
  },[ready,plan,dark,isEN,activeDrugs,phaseList]);
  return <div ref={ref} style={{width:"100%",height:340}} className="rounded-xl overflow-hidden"/>;
}

// ── WBC/ANC/VIPN sonuç grafikleri (Plotly dinamik) ────────────────────────
function ResultChart({ timeseries, metricKey, color, targetBand, threshold, title, dark, isEN, phaseList }) {
  const ref   = useRef(null);
  const ready = usePlotly();
  useEffect(() => {
    if (!ready || !ref.current || !timeseries) return;
    const bg=dark?"#111827":"#fff", gc=dark?"#374151":"#e5e7eb", tc=dark?"#d1d5db":"#374151";
    const t  = timeseries.t;
    const y  = timeseries[metricKey];
    const d6 = timeseries.daily_6mp;
    const dv = timeseries.daily_vcr;
    const days = d6?.map((_u, i)=>i) || [];

    const tEnd = t?.[t.length-1] || 250;
    // Faz bantları — phaseList prop'tan al, yoksa varsayılan
    const defaultPhases = phaseList && phaseList.length > 0 ? phaseList : [
      {start:0,end:29},{start:29,end:84},{start:84,end:140},{start:140,end:tEnd}
    ];
    const phA = dark?"0.10":"0.12";
    const phC2=[`rgba(239,68,68,${phA})`,`rgba(245,158,11,${phA})`,`rgba(168,85,247,${phA})`,`rgba(16,185,129,${phA})`,`rgba(59,130,246,${phA})`];
    const shapes = [
      // Dinamik faz bantları
      ...defaultPhases.flatMap((ph,i)=>[
        {type:"rect",xref:"x",yref:"paper",x0:ph.start,x1:Math.min(ph.end,tEnd),y0:0,y1:1,
         fillcolor:phC2[i%phC2.length],line:{width:0},layer:"below"},
      ]),
    ];
    if (targetBand) {
      shapes.push({type:"rect",xref:"paper",yref:"y",
        x0:0,x1:1,y0:targetBand[0],y1:targetBand[1],
        fillcolor:dark?"rgba(100,200,100,0.08)":"rgba(100,200,100,0.12)",line:{width:0}});
    }
    if (threshold) {
      shapes.push({type:"line",xref:"paper",yref:"y",
        x0:0,x1:1,y0:threshold,y1:threshold,
        line:{color:"#f59e0b",width:1.5,dash:"dash"}});
    }
    // Faz etiket annotations — defaultPhases'den dinamik
    const phAnnotations = defaultPhases.map((ph, i) => {
      const fc = ["#C62828","#E65100","#6A1B9A","#2E7D32","#1B3A6B","#9D174D"][i%6];
      const lbl = ph.name || (isEN
        ? ["Induction","Cons.","Re-ind.","Maintenance"][i]
        : ["İndüksiyon","Kons.","Re-ind.","İdame"][i]) || `P${i+1}`;
      return {x:(ph.start+ph.end)/2, y:1.06, xref:"x", yref:"paper",
        text:lbl, showarrow:false, yanchor:"bottom", font:{color:fc, size:9}};
    }).filter(a => a.x <= tEnd);

    const doseArr  = metricKey === "VIPN" ? dv : d6;
    const doseName = metricKey === "VIPN" ? "VCR" : "6-MP";
    const doseClr  = metricKey === "VIPN" ? "#8b5cf6" : "#3b82f6";
    const maxDose  = Math.max(...(doseArr||[0.1]), 0.1);

    const traces = [
      {x:t, y, name:metricKey.toUpperCase(),
       line:{color,width:2.5}, mode:"lines",
       hovertemplate:`<b>${isEN?"Day":"Gün"} %{x:.0f}</b><br>${metricKey.toUpperCase()}: %{y:.3f}<extra></extra>`},
    ];
    if (doseArr) {
      traces.push({
        x:days, y:doseArr, name:doseName,
        type:"bar", yaxis:"y2",
        marker:{color:`${doseClr}55`, line:{width:0}},
        hovertemplate:`${doseName}: %{y:.2f} mg<extra></extra>`,
      });
    }

    window.Plotly.newPlot(ref.current, traces, {
      paper_bgcolor:bg, plot_bgcolor:bg,
      font:{color:tc, size:11, family:"system-ui,sans-serif"},
      margin:{t:75, b:50, l:70, r:75, pad:4},
      title:{text:title, font:{size:12,color:tc}, x:0.02, xanchor:"left"},
      xaxis:{title:{text:isEN?"Day":"Gün",standoff:12}, gridcolor:gc, range:[0, tEnd*1.02]},
      yaxis:{title:{text:metricKey.toUpperCase(),standoff:12}, gridcolor:gc, side:"left"},
      yaxis2:{title:{text:isEN?"Dose (mg)":"Doz (mg)",standoff:12},
              overlaying:"y", side:"right", showgrid:false,
              range:[0, maxDose * 2.8]},
      shapes,
      annotations: phAnnotations,
      legend:{orientation:"h", x:0, y:1.22, xanchor:"left", yanchor:"bottom", font:{size:10}},
      hovermode:"x unified",
    },{
      responsive:true,
      displayModeBar:true,
      modeBarButtonsToRemove:["lasso2d","select2d","autoScale2d"],
      toImageButtonOptions:{format:"png",filename:`sting_${metricKey.toLowerCase()}_${Date.now()}`,scale:2},
    });
  },[ready,timeseries,dark,isEN,phaseList]);
  return <div ref={ref} style={{width:"100%",height:340}} className="rounded-xl overflow-hidden"/>;
}
// ── Parametre input ────────────────────────────────────────────────────────
function PI({label,value,onChange,min,max,step=1,dark}) {
  return (
    <div>
      <label className={`text-xs block mb-1 ${dark?"text-gray-400":"text-gray-600"}`}>{label}</label>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={e=>onChange(Number(e.target.value))}
        className={`w-full border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
          dark?"bg-gray-800 border-gray-700 text-gray-200":"bg-white border-gray-200 text-gray-800"}`}/>
    </div>
  );
}

// ── Ana Tab4 ───────────────────────────────────────────────────────────────
export default function Tab4GA({ dark, config:externalConfig, odeResult, onComplete, onGoTo }) {
  const { lang } = useLang();
  const d   = dark;
  const isEN = lang==="en";
  const cfg  = externalConfig || {};

  const [nGen,   setNGen]   = useState(10);
  const [popSize,setPopSize] = useState(8);
  const [elite,  setElite]  = useState(2);
  const [lo6mp,  setLo6mp]  = useState(35);
  const [hi6mp,  setHi6mp]  = useState(70);
  const [loMtx,  setLoMtx]  = useState(8);
  const [hiMtx,  setHiMtx]  = useState(22);
  const [loVcr,  setLoVcr]  = useState(0.8);
  const [hiVcr,  setHiVcr]  = useState(1.5);
  const [loDnr,  setLoDnr]  = useState(15);
  const [hiDnr,  setHiDnr]  = useState(30);
  const [loSter, setLoSter] = useState(20);
  const [hiSter, setHiSter] = useState(80);
  const [loArac, setLoArac] = useState(50);
  const [hiArac, setHiArac] = useState(200);
  const [loCpm,  setLoCpm]  = useState(500);
  const [hiCpm,  setHiCpm]  = useState(1500);
  const [lo6tg,  setLo6tg]  = useState(20);
  const [hi6tg,  setHi6tg]  = useState(100);
  const [loCop,  setLoCop]  = useState(30);
  const [hiCop,  setHiCop]  = useState(60);
  const [loNov,  setLoNov]  = useState(250);
  const [hiNov,  setHiNov]  = useState(500);
  const [engine, setEngine]  = useState("full_drug");

  const [status,  setStatus]  = useState("idle");
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // 25002500 GA Yorum Paneli state 25002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500
  const [gaInterpOpen, setGaInterpOpen] = useState(false);
  const elapsedRef = useRef(null);

  const abortRef = useRef(null);

  const handleRun = useCallback(async () => {
    // Çalışıyorsa durdur
    if (status === "running") {
      if (abortRef.current) abortRef.current.abort();
      clearInterval(elapsedRef.current);
      setStatus("idle"); setError(null);
      return;
    }
    abortRef.current = new AbortController();
    setStatus("running"); setError(null); setResult(null); setElapsed(0);
    const t0 = Date.now();
    elapsedRef.current = setInterval(() => setElapsed((Date.now()-t0)/1000), 300);

    const activeSet = cfg.active_drugs || ["6mp","mtx","vcr"];
    const has = (k) => activeSet.includes(k);
    const payload = {
      weight_kg: cfg.weight_kg ?? 30,
      height_cm: cfg.height_cm ?? 135,
      tpmt:      cfg.tpmt      ?? 1,
      vitamin_d: cfg.vitamin_d ?? 30,
      diet:      cfg.diet      ?? 1.0,
      exercise:  cfg.exercise  ?? 0.5,
      wbc0:      cfg.wbc0      ?? 3.2,
      anc0:      cfg.anc0      ?? 1.2,
      age:       cfg.age       ?? 8,
      // Tüm aktif ilaçlar — filtre yok
      active_drugs: activeSet,
      // Protocol / custom phases
      protocol_key:  cfg.protocol_key || "cog_aall0331",
      custom_phases: cfg.custom_phases || [],
      // Yeni ilaç dozları
      dose_ster_mg_m2:  cfg.dose_ster_mg_m2  ?? 40,
      dose_arac_mg_m2:  cfg.dose_arac_mg_m2  ?? 75,
      dose_cpm_mg_m2:   cfg.dose_cpm_mg_m2   ?? 1000,
      dose_6tg_mg_m2:   cfg.dose_6tg_mg_m2   ?? 60,
      dose_cop_mg:      cfg.dose_cop_mg       ?? 60,
      dose_nov_mg_kg:   cfg.dose_nov_mg_kg    ?? 10,
      n_generations: nGen,
      pop_size:      popSize,
      elite_size:    elite,
      // Doz sınırları — aktif değilse [0,0]
      bounds_6mp: has("6mp")          ? [lo6mp, hi6mp] : [0,0],
      bounds_mtx: has("mtx")          ? [loMtx, hiMtx] : [0,0],
      bounds_vcr: has("vcr")          ? [loVcr, hiVcr] : [0,0],
      bounds_dnr:  has("daunorubicin")    ? [loDnr,  hiDnr]  : [0,0],
      bounds_ster: has("corticosteroid")  ? [loSter, hiSter] : [0,0],
      bounds_arac: has("cytarabine")      ? [loArac, hiArac] : [0,0],
      bounds_cpm:  has("cyclophosphamide")? [loCpm,  hiCpm]  : [0,0],
      bounds_6tg:  has("6tg")             ? [lo6tg,  hi6tg]  : [0,0],
      bounds_cop:  has("copanlisib")      ? [loCop,  hiCop]  : [0,0],
      bounds_nov:  has("novobiocin")      ? [loNov,  hiNov]  : [0,0],
      period:     cfg.t_end ?? 250,
      engine,
    };
    try {
      const data = await apiPost("/ga/optimize-sync", payload, abortRef.current.signal);
      clearInterval(elapsedRef.current);
      setResult(data); setStatus("done");
      if (onComplete) onComplete(data);
      // GNN havuzunun anlık güncellenmesi için event gönder
      window.dispatchEvent(new CustomEvent("sting:pool_updated"));
    } catch(e) {
      clearInterval(elapsedRef.current);
      if (e.name === "AbortError") { setStatus("idle"); return; }
      setError(e.message); setStatus("error");
    }
  },[cfg,nGen,popSize,elite,lo6mp,hi6mp,loMtx,hiMtx,loVcr,hiVcr,engine,onComplete,status]);

  useEffect(() => () => clearInterval(elapsedRef.current), []);

  const metrics  = result?.best_metrics  || {};
  const plan     = result?.best_plan;
  const history  = result?.history       || [];
  const ts       = result?.timeseries;
  const card     = `rounded-2xl border ${d?"bg-gray-900 border-gray-800":"bg-white border-gray-200"}`;
  const estSec   = Math.round(nGen * popSize * 0.4);

  const howToSteps = isEN ? [
    { title: "What does GA dose optimization do?", desc: "Unlike ODE (which shows what happens with fixed doses), the Genetic Algorithm searches for the BEST weekly dose schedule. It runs the ODE model hundreds of times with different doses to find the combination that keeps WBC/ANC in target ranges longest." },
    { title: "Configure GA settings", desc: "Generations: how many evolution cycles (more = better result but slower). Population: candidates per generation. Elite: best candidates kept unchanged. More generations and larger population improve quality but increase computation time." },
    { title: "Set dose search bounds", desc: "Defines the search space for 6-MP, MTX, VCR and DNR doses. The GA will only search within these ranges. Wider ranges allow more flexibility but take longer to converge." },
    { title: "Click Start Optimization", desc: "GA runs for the estimated time shown. Results include per-generation fitness history, optimal weekly dose schedule for 6-MP and MTX, and VCR cycle doses." },
    { title: "Read the results", desc: "Fitness chart shows convergence across generations. Lower fitness score = better. WBC/ANC% lines show improvement. The dose schedule charts and dynamic WBC/ANC/VIPN plots show the optimal solution's performance." },
  ] : [
    { title: "GA doz optimizasyonu ne yapar?", desc: "ODE sabit dozlarla ne olduğunu gösterirken, Genetik Algoritma EN İYİ haftalık doz programını arar. Farklı dozlarla ODE modelini yüzlerce kez çalıştırarak WBC/ANC'yi en uzun süre hedef aralıkta tutan kombinasyonu bulur." },
    { title: "GA ayarlarını yapılandırın", desc: "Nesil: kaç evrim döngüsü (fazlası = daha iyi sonuç, daha yavaş). Popülasyon: nesil başı aday sayısı. Elite: değişmeden korunan en iyi adaylar. Daha fazla nesil ve büyük popülasyon kaliteyi artırır ama süreyi uzatır." },
    { title: "Doz arama sınırlarını ayarlayın", desc: "6-MP, MTX ve VCR dozları için arama uzayını tanımlar. GA yalnızca bu aralıklar içinde arar. Daha geniş aralıklar esneklik sağlar ancak yakınsama süresini uzatır." },
    { title: "Optimizasyonu Başlat'a tıklayın", desc: "GA gösterilen tahmini süre kadar çalışır. Sonuçlar: nesil başı fitness geçmişi, 6-MP ve MTX için optimal haftalık doz programı ve VCR döngü dozlarını içerir." },
    { title: "Sonuçları okuyun", desc: "Fitness grafiği nesiller boyunca yakınsamayı gösterir. Düşük fitness skoru = daha iyi. WBC/ANC% çizgileri iyileşmeyi gösterir. Doz programı ve dinamik WBC/ANC/VIPN grafikleri optimal çözümün performansını sunar." },
  ];

  return (
    <div className="space-y-5">
      <HowToUse steps={howToSteps} dark={d}/>
      <div className={card+" p-4"}>

        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={handleRun}
            className={`flex-shrink-0 font-semibold px-6 py-2.5 rounded-xl transition-all text-sm shadow-lg text-white ${
              status==="running"
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-500/20"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20"
            }`}>
            {status==="running"
              ? <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  {isEN?"■ Stop":"■ Durdur"}
                </span>
              : isEN?"▶ Start Optimization":"▶ Optimizasyonu Başlat"}
          </button>

          {/* Hızlı ayar özeti — aktif ilaçları cfg'den göster */}
          <div className="flex gap-2 flex-wrap">
            {[
              [`${nGen} ${isEN?"gen":"nesil"}`, "#f59e0b"],
              [`pop ${popSize}`, "#8b5cf6"],
            ].map(([label, color]) => (
              <span key={label} className="text-xs px-2 py-1 rounded-lg font-medium"
                    style={{background:`${color}20`,color,border:`1px solid ${color}44`}}>
                {label}
              </span>
            ))}
            {(cfg.active_drugs||["6mp","mtx","vcr"]).map(drug => {
              const doseRangeMap = {"6mp":`${lo6mp}–${hi6mp}mg`,"mtx":`${loMtx}–${hiMtx}mg`,"vcr":`${loVcr}–${hiVcr}mg`,"daunorubicin":"15–30mg/m²","corticosteroid":"20–80mg/m²","cytarabine":"50–200mg/m²","cyclophosphamide":"500–1500mg/m²","6tg":"20–100mg/m²","copanlisib":"30–60mg","novobiocin":"250–500mg/gün"};
              const doseRange = doseRangeMap[drug]||"";
              const drugInfo = {label:`${DRUG_PALETTE[drug]?.label||drug} ${doseRange}`, color:DRUG_PALETTE[drug]?.color||"#6b7280"};
              if (!drugInfo) return null;
              return (
                <span key={drug} className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{background:`${drugInfo.color}20`,color:drugInfo.color,border:`1px solid ${drugInfo.color}44`}}>
                  {drugInfo.label}
                </span>
              );
            })}
            <span className={`text-xs px-2 py-1 rounded-lg ${d?"bg-gray-800 text-gray-500":"bg-gray-100 text-gray-400"}`}>
              ~{estSec}s
            </span>
          </div>
        </div>

        {/* Progress */}
        {(status === "running" || status === "done") && status !== "idle" && (
          <GAProgress elapsed={elapsed} done={status==="done"} nGen={nGen} popSize={popSize} dark={d} isEN={isEN}/>
        )}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold mb-1">{isEN?"Error":"Hata"}:</p>
            <p className="text-xs font-mono break-all">{error}</p>
          </div>
        )}
      </div>

      {/* ── Tamamlandı bildirimi — run butonunun hemen altında ── */}
      {result && (
        <>
          <NextTabBanner
            dark={d}
            metrics={`WBC ${isEN?"in target":"hedefte"}: ${((metrics.wbc_target_frac||0)*100).toFixed(1)}% · ANC: ${((metrics.anc_target_frac||0)*100).toFixed(1)}% · ${isEN?"Best score":"En iyi skor"}: ${(result.best_score||0).toFixed(1)}`}
            nextTab="tab5"
            nextLabel={isEN ? "Tab 5 — GNN Treatment Flow" : "Tab 5 — GNN Tedavi Akışı"}
            onGoTo={onGoTo}
          />
          <GAExportButton result={result} dark={d} />

          {/* 10-İlaç GA ek metrikler */}
          {metrics.engine === "full_drug_48dim" && (
            <div className={`rounded-2xl border p-4 space-y-3 ${d?"border-emerald-900/30 bg-emerald-500/5":"border-emerald-200 bg-emerald-50/50"}`}>
              <p className={`text-sm font-semibold ${d?"text-emerald-300":"text-emerald-700"}`}>
                🧬 {isEN?"Tüm İlaçlar GA — Klinik Etkinlik & Güvenlik":"Tüm İlaçlar GA — Klinik Etkinlik & Güvenlik"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "BRR d8",       value: `${metrics.BRR_d8}%`,                      good: metrics.BRR_d8 >= 97 },
                  { label: "EOI MRD",      value: metrics.EOI_MRD?.toExponential(1),          good: metrics.EOI_MRD < 1e-4 },
                  { label: "VIPN min",     value: metrics.vipn_min?.toFixed(3),               good: metrics.vipn_min >= 0.70 },
                  { label: isEN?"DNR cum":"DNR kümülatif", value: `${metrics.cum_DNR} mg/m²`, good: metrics.cum_DNR <= 300 },
                ].map((m,i)=>(
                  <div key={i} className={`rounded-xl border p-3 text-center ${d?"bg-gray-900 border-gray-800":"bg-white border-gray-200"}`}>
                    <p className={`text-xs mb-1 ${d?"text-gray-500":"text-gray-400"}`}>{m.label}</p>
                    <p className={`text-lg font-bold ${m.good?(d?"text-emerald-400":"text-emerald-600"):(d?"text-amber-400":"text-amber-600")}`}>
                      {m.value}
                    </p>
                    <p className={`text-xs mt-0.5 ${m.good?(d?"text-emerald-500/70":"text-emerald-400"):(d?"text-amber-500/70":"text-amber-400")}`}>
                      {m.good?(isEN?"✓ OK":"✓ Tamam"):(isEN?"⚠ Check":"⚠ Kontrol")}
                    </p>
                  </div>
                ))}
              </div>
              {/* Phase-based dose summary */}
              {result.best_plan?.gene_summary && (
                <div>
                  <p className={`text-xs font-semibold mb-2 ${d?"text-gray-400":"text-gray-600"}`}>
                    {isEN?"Phase-Level Optimized Doses (16-gene GA)":"Faz Bazlı Optimize Dozlar (16-gen GA)"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.best_plan.gene_summary).map(([gene, val])=>(
                      <div key={gene} className={`rounded-lg border px-2.5 py-1.5 text-center ${d?"bg-gray-900 border-gray-700":"bg-white border-gray-200"}`}>
                        <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>{gene.replace(/_/g," ")}</p>
                        <p className={`text-sm font-bold ${d?"text-blue-300":"text-blue-600"}`}>{Number(val).toFixed(1)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Ayarlar (alt kısımda, run'dan sonra) ── */}
      <div className={card+" p-5"}>
        <p className={`text-xs font-semibold mb-3 ${d?"text-gray-300":"text-gray-700"}`}>
          {isEN?"GA Configuration":"GA Ayarları"}
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <PI label={isEN?"Generations":"Nesil"} value={nGen} onChange={setNGen} min={2} max={100} dark={d}/>
          <PI label={isEN?"Population":"Popülasyon"} value={popSize} onChange={setPopSize} min={4} max={50} dark={d}/>
          <PI label={isEN?"Elite":"Elite"} value={elite} onChange={setElite} min={1} max={10} dark={d}/>
        </div>
        <p className={`text-xs font-semibold mb-2 ${d?"text-gray-400":"text-gray-600"}`}>
          {isEN?"Dose search bounds (active drugs only)":"Doz arama sınırları (yalnızca aktif ilaçlar)"}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["6-MP (mg/gün)",          "6mp",             lo6mp,  setLo6mp,  hi6mp,  setHi6mp,  5],
            ["MTX (mg/hafta)",         "mtx",             loMtx,  setLoMtx,  hiMtx,  setHiMtx,  1],
            ["VCR (mg/28gün)",         "vcr",             loVcr,  setLoVcr,  hiVcr,  setHiVcr,  0.1],
            ["DNR (mg/m²)",            "daunorubicin",    loDnr,  setLoDnr,  hiDnr,  setHiDnr,  1],
            ["Kortikosteroid (mg/m²)", "corticosteroid",  loSter, setLoSter, hiSter, setHiSter, 5],
            ["Ara-C (mg/m²)",          "cytarabine",      loArac, setLoArac, hiArac, setHiArac, 10],
            ["CPM (mg/m²)",            "cyclophosphamide",loCpm,  setLoCpm,  hiCpm,  setHiCpm,  50],
            ["6-TG (mg/m²/gün)",       "6tg",             lo6tg,  setLo6tg,  hi6tg,  setHi6tg,  5],
            ["Kopanlisib (mg)",        "copanlisib",      loCop,  setLoCop,  hiCop,  setHiCop,  5],
            ["Novobiocin (mg/gün)",    "novobiocin",      loNov,  setLoNov,  hiNov,  setHiNov,  25],
          ].filter(([,drugKey]) => (cfg.active_drugs||["6mp","mtx","vcr","daunorubicin","asparaginase"]).includes(drugKey))
           .map(([label, , lo, setLo, hi, setHi, step]) => (
            <div key={label}>
              <label className={`text-xs block mb-1 ${d?"text-gray-500":"text-gray-500"}`}>{label}</label>
              <div className="flex gap-1.5">
                <input type="number" value={lo} step={step} onChange={e=>setLo(Number(e.target.value))}
                  className={`w-full border rounded-xl px-2 py-1.5 text-xs ${d?"bg-gray-800 border-gray-700 text-gray-200":"bg-white border-gray-200"}`}/>
                <span className={`flex-shrink-0 text-xs self-center ${d?"text-gray-600":"text-gray-400"}`}>–</span>
                <input type="number" value={hi} step={step} onChange={e=>setHi(Number(e.target.value))}
                  className={`w-full border rounded-xl px-2 py-1.5 text-xs ${d?"bg-gray-800 border-gray-700 text-gray-200":"bg-white border-gray-200"}`}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sonuçlar ── */}
      {result && (
        <>
          {/* Metrik özeti */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {label:isEN?"WBC in target":"WBC hedefte",value:`${((metrics.wbc_target_frac||0)*100).toFixed(1)}%`,ok:(metrics.wbc_target_frac||0)>0.6},
              {label:isEN?"ANC in target":"ANC hedefte",value:`${((metrics.anc_target_frac||0)*100).toFixed(1)}%`,ok:(metrics.anc_target_frac||0)>0.6},
              {label:"WBC min",value:(metrics.wbc_min||0).toFixed(3),ok:(metrics.wbc_min||0)>1.2},
              {label:isEN?"Best fitness":"En iyi fitness",value:(result.best_score||0).toFixed(1),ok:true},
            ].map((m,i)=>(
              <div key={i} className={`rounded-xl border p-3 text-center ${
                m.ok
                  ?d?"border-green-500/30 bg-green-500/10 text-green-400":"border-green-200 bg-green-50 text-green-700"
                  :d?"border-amber-500/30 bg-amber-500/10 text-amber-400":"border-amber-200 bg-amber-50 text-amber-700"}`}>
                <p className="text-xl font-bold font-mono">{m.value}</p>
                <p className="text-xs font-medium mt-1 opacity-80">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Fitness geçmişi */}
          {history.length > 0 && (
            <div className={card+" p-5"}>
              <p className={`text-sm font-semibold mb-3 ${d?"text-gray-200":"text-gray-700"}`}>
                {isEN?"GA Fitness History":"GA Fitness Geçmişi"}
                <span className={`ml-2 text-xs font-normal ${d?"text-gray-500":"text-gray-400"}`}>
                  ({history.length} {isEN?"generations":"nesil"})
                </span>
              </p>
              <FitnessChart history={history} dark={d} isEN={isEN}/>
            </div>
          )}

          {/* Doz planı */}
          {plan && (
            <div className={card+" p-5"}>
              <p className={`text-sm font-semibold mb-3 ${d?"text-gray-200":"text-gray-700"}`}>
                {isEN?"Optimal Dose Schedule":"Optimal Doz Planı"}
              </p>
              <DoseChart plan={plan} dark={d} isEN={isEN} activeDrugs={cfg.active_drugs||[]} phaseList={result?.phase_list||null}/>
              <div className="mt-3 flex gap-2 flex-wrap">
                {(plan.vcr||[]).map((v,i)=>(
                  <span key={i} className={`px-2 py-1 rounded-lg text-xs ${d?"bg-purple-500/20 text-purple-300":"bg-purple-100 text-purple-700"}`}>
                    {isEN?"Cycle":"Döngü"} {i+1}: {v.toFixed(2)} mg VCR
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dinamik WBC / ANC / VIPN grafikleri */}
          {ts && (
            <div className="space-y-4">
              <div className={card+" p-5"}>
                <p className={`text-sm font-semibold mb-3 ${d?"text-gray-200":"text-gray-700"}`}>
                  WBC — {isEN?"GA Optimal Result":"GA Optimal Sonuç"}
                  <span className={`ml-2 text-xs font-normal ${d?"text-gray-500":"text-gray-400"}`}>
                    {isEN?"(interactive — scroll to zoom, drag to pan, camera icon to save)":"(interaktif — kaydırmak için sürükleyin, kamera ikonu ile kaydedin)"}
                  </span>
                </p>
                <ResultChart timeseries={ts} metricKey="WBC" color="#3b82f6" phaseList={result?.phase_list||null}
                  targetBand={[1.5,3.0]} title="WBC Dinamiği" dark={d} isEN={isEN}/>
              </div>
              <div className={card+" p-5"}>
                <p className={`text-sm font-semibold mb-3 ${d?"text-gray-200":"text-gray-700"}`}>
                  ANC — {isEN?"GA Optimal Result":"GA Optimal Sonuç"}
                </p>
                <ResultChart timeseries={ts} metricKey="ANC" color="#10b981" phaseList={result?.phase_list||null}
                  targetBand={[0.5,1.5]} title="ANC Dinamiği" dark={d} isEN={isEN}/>
              </div>
              <div className={card+" p-5"}>
                <p className={`text-sm font-semibold mb-3 ${d?"text-gray-200":"text-gray-700"}`}>
                  VIPN — {isEN?"VCR Neurotoxicity":"VCR Nörotoksisitesi"}
                </p>
                <ResultChart timeseries={ts} metricKey="VIPN" color="#8b5cf6" phaseList={result?.phase_list||null}
                  threshold={0.78} title="VIPN Dinamiği" dark={d} isEN={isEN}/>
              </div>
            </div>
          )}
        </>
      )}


      {/* ── GA DOZ KATKI ANALİZİ PANELİ ── */}
      {result && (() => {
        const plan     = result.best_plan    || {};
        const metrics  = result.best_metrics || {};
        const history  = result.history      || [];
        const cfg2     = externalConfig      || {};
        const active   = cfg2.active_drugs   || ["6mp","mtx","vcr"];

        // Doz arama sınırları — state'den al
        const boundsMap = {
          "6mp":             { lo: lo6mp,  hi: hi6mp,  unit: "mg/gün",   label: "6-MP" },
          "mtx":             { lo: loMtx,  hi: hiMtx,  unit: "mg/hafta", label: "MTX" },
          "vcr":             { lo: loVcr,  hi: hiVcr,  unit: "mg/28g",   label: "VCR" },
          "daunorubicin":    { lo: loDnr,  hi: hiDnr,  unit: "mg/m²",    label: "DNR" },
          "corticosteroid":  { lo: loSter, hi: hiSter, unit: "mg/m²",    label: "CS"  },
          "cytarabine":      { lo: loArac, hi: hiArac, unit: "mg/m²",    label: "Ara-C"},
          "cyclophosphamide":{ lo: loCpm,  hi: hiCpm,  unit: "mg/m²",    label: "CPM" },
          "6tg":             { lo: lo6tg,  hi: hi6tg,  unit: "mg/m²",    label: "6-TG"},
          "copanlisib":      { lo: loCop,  hi: hiCop,  unit: "mg",       label: "COP" },
          "novobiocin":      { lo: loNov,  hi: hiNov,  unit: "mg/gün",   label: "NOV" },
        };

        // Her aktif ilaç için ortalama optimal dozu hesapla
        const drugContribs = [];
        const PLAN_KEYS = {
          "6mp": "6mp", "mtx": "mtx", "vcr": "vcr",
          "daunorubicin": "daunorubicin", "corticosteroid": "corticosteroid",
          "cytarabine": "cytarabine", "cyclophosphamide": "cyclophosphamide",
          "6tg": "6tg", "copanlisib": "copanlisib", "novobiocin": "novobiocin",
        };

        // gene_summary varsa ondan al, yoksa plan dizilerinin ortalamasından
        const geneSummary = plan.gene_summary || {};

        active.filter(d => boundsMap[d]).forEach(drugKey => {
          const b = boundsMap[drugKey];
          const range = b.hi - b.lo;
          if (range <= 0) return;

          let optDose = null;
          // gene_summary'den bul
          const geneKey = Object.keys(geneSummary).find(k =>
            k.toLowerCase().includes(drugKey.replace("6", "six_").replace("daunorubicin","dnr"))
          );
          if (geneKey) {
            optDose = geneSummary[geneKey];
          } else {
            // plan dizisinden ortalama al
            const planArr = plan[PLAN_KEYS[drugKey]] || plan[drugKey];
            if (planArr && planArr.length > 0) {
              const vals = planArr.filter(v => typeof v === "number" && isFinite(v));
              optDose = vals.length > 0 ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
            }
          }
          if (optDose === null) return;

          // Arama aralığındaki konum — 0% = alt sınır, 100% = üst sınır
          const pct = Math.max(0, Math.min(100, ((optDose - b.lo) / range) * 100));
          drugContribs.push({
            key:    drugKey,
            label:  b.label,
            unit:   b.unit,
            lo:     b.lo,
            hi:     b.hi,
            opt:    optDose,
            pct:    pct,
          });
        });

        // Konvergens kalitesi
        const firstScore = history[0]?.best_score ?? 0;
        const lastScore  = history[history.length - 1]?.best_score ?? 0;
        const improvement = firstScore > 0 ? ((lastScore - firstScore) / Math.abs(firstScore) * 100) : 0;
        const converged = history.length >= 3 &&
          Math.abs(history[history.length-1]?.best_score - history[history.length-3]?.best_score) < 0.5;

        const barColor = (pct) => {
          if (pct >= 75) return "#22c55e";
          if (pct >= 40) return "#f59e0b";
          return "#ef4444";
        };

        return (
          <div className={`rounded-2xl border overflow-hidden ${d?"border-teal-900/40":"border-teal-200"}`}>
            {/* Header */}
            <button
              onClick={() => setGaInterpOpen(o => !o)}
              className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                d?"bg-teal-950/40 hover:bg-teal-950/60":"bg-teal-50 hover:bg-teal-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg className={`w-4 h-4 flex-shrink-0 ${d?"text-teal-400":"text-teal-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <span className={`text-sm font-semibold ${d?"text-teal-300":"text-teal-700"}`}>
                  {isEN?"GA Dose Contribution Analysis":"GA Doz Katkı Analizi"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d?"bg-teal-900/60 text-teal-400":"bg-teal-100 text-teal-600"}`}>
                  {isEN?"search-space position":"arama alanı konumu"}
                </span>
              </div>
              <svg className={`w-4 h-4 transition-transform ${gaInterpOpen?"rotate-180":""} ${d?"text-teal-400":"text-teal-500"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {gaInterpOpen && (
              <div className={`p-5 space-y-5 ${d?"bg-gray-900":"bg-white"}`}>

                {/* Açıklama */}
                <p className={`text-xs leading-relaxed ${d?"text-gray-400":"text-gray-500"}`}>
                  {isEN
                    ? "Shows where each drug's optimal dose lands within its search range. 0% = lower bound (minimum), 100% = upper bound (maximum). A dose near 100% means GA pushed it to the ceiling — consider widening the range."
                    : "Her ilacın optimal dozunun arama aralığı içindeki konumunu gösterir. %0 = alt sınır (minimum), %100 = üst sınır (maksimum). %100'e yakın bir doz, GA'nın tavana dayandığı anlamına gelir — aralığı genişletmeyi düşünün."}
                </p>

                {/* Konvergens özeti */}
                <div className={`rounded-xl border p-3 flex flex-wrap gap-4 ${d?"border-gray-700 bg-gray-800":"border-gray-200 bg-gray-50"}`}>
                  <div>
                    <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>{isEN?"Convergence":"Konvergens"}</p>
                    <p className={`text-sm font-bold ${converged?(d?"text-emerald-400":"text-emerald-600"):(d?"text-amber-400":"text-amber-600")}`}>
                      {converged?(isEN?"✓ Converged":"✓ Yakınsadı"):(isEN?"⟳ Still improving":"⟳ İyileşiyor")}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>{isEN?"Fitness gain":"Fitness artışı"}</p>
                    <p className={`text-sm font-bold ${improvement>=0?(d?"text-emerald-400":"text-emerald-600"):(d?"text-red-400":"text-red-500")}`}>
                      {improvement>=0?"+":""}{improvement.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>{isEN?"Generations":"Nesil sayısı"}</p>
                    <p className={`text-sm font-bold ${d?"text-gray-200":"text-gray-700"}`}>{history.length}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>{isEN?"Best fitness":"En iyi fitness"}</p>
                    <p className={`text-sm font-bold ${d?"text-gray-200":"text-gray-700"}`}>{lastScore.toFixed(2)}</p>
                  </div>
                </div>

                {/* Doz pozisyon barları */}
                {drugContribs.length > 0 ? (
                  <div className="space-y-3">
                    <p className={`text-xs font-semibold ${d?"text-gray-400":"text-gray-600"}`}>
                      {isEN?"Optimal dose position in search range":"Optimal dozun arama aralığındaki konumu"}
                    </p>
                    {drugContribs.map(dc => (
                      <div key={dc.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${d?"text-gray-200":"text-gray-700"}`}>{dc.label}</span>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-mono ${d?"text-gray-500":"text-gray-400"}`}>
                              {dc.lo.toFixed(1)} → {dc.opt.toFixed(1)} → {dc.hi.toFixed(1)} {dc.unit}
                            </span>
                            <span className="text-xs font-bold w-10 text-right" style={{color: barColor(dc.pct)}}>
                              {dc.pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        {/* Bar arka planı — skalayı göster */}
                        <div className={`relative w-full rounded-full h-2.5 ${d?"bg-gray-700":"bg-gray-200"}`}>
                          {/* Optimal pozisyon çizgisi */}
                          <div
                            className="absolute top-0 h-2.5 rounded-full transition-all"
                            style={{width:`${dc.pct}%`, background: barColor(dc.pct)}}
                          />
                          {/* İşaretçi */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow"
                            style={{left:`calc(${dc.pct}% - 6px)`, background: barColor(dc.pct)}}
                          />
                        </div>
                        {/* Uyarı — tavana veya tabana yapışmış */}
                        {dc.pct >= 95 && (
                          <p className={`text-xs mt-0.5 ${d?"text-amber-400":"text-amber-600"}`}>
                            ⚠ {isEN?"GA hit the upper bound — consider increasing the maximum":"GA üst sınıra dayandı — maksimumu artırmayı düşünün"}
                          </p>
                        )}
                        {dc.pct <= 5 && (
                          <p className={`text-xs mt-0.5 ${d?"text-blue-400":"text-blue-600"}`}>
                            ↓ {isEN?"GA hit the lower bound — drug may have minimal benefit":"GA alt sınıra dayandı — ilacın katkısı minimal olabilir"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>
                    {isEN?"No dose plan available for contribution analysis.":"Katkı analizi için doz planı bulunamadı."}
                  </p>
                )}

                <p className={`text-xs italic ${d?"text-gray-600":"text-gray-400"}`}>
                  {isEN
                    ? "Doses near 0% may indicate the drug had minimal effect on fitness; doses near 100% suggest the optimizer needed more headroom."
                    : "%0'a yakın dozlar o ilacın fitness üzerinde minimal etkisinin olduğunu, %100'e yakın dozlar ise optimizatörün daha fazla alana ihtiyaç duyduğunu gösterebilir."}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {status==="idle" && !result && (
        <div className={`flex flex-col items-center justify-center py-16 text-center ${d?"text-gray-600":"text-gray-400"}`}>
          <svg className={`w-14 h-14 mb-4 ${d?"text-gray-700":"text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <p className="text-sm">{isEN?"Press the button above to start GA optimization.":"Yukarıdaki butona basarak GA optimizasyonunu başlatın."}</p>
        </div>
      )}
    </div>
  );
}
