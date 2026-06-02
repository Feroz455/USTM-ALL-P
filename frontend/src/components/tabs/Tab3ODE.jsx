// src/components/tabs/Tab3ODE.jsx
import { useState, useCallback, useEffect, useRef } from "react";
import { useLang } from "../../i18n/LangContext";
import { DRUG_PALETTE, drugColor, drugLabel, ODE_DRUG_KEYS, SIMULABLE_DRUG_KEYS } from "../../constants/drugConfig";
import HowToUse from "../ui/HowToUse";
import NextTabBanner from "../ui/NextTabBanner";
import ExportButtons from "../ui/ExportButtons";

const BASE = "/api/v1";
function getToken() { return localStorage.getItem("sting_token"); }

async function runSimulation(payload, signal) {
  const res = await fetch(`${BASE}/ode/simulate`, {
    method:"POST",
    headers:{ Authorization:`Bearer ${getToken()}`, "Content-Type":"application/json" },
    body:JSON.stringify(payload),
    signal,
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.detail || "Simülasyon hatası");
  return d;
}

// ── Progress bar ───────────────────────────────────────────────────────────
function SimProgress({ elapsed, done, dark, isEN }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "." : d+"."), 500);
    return () => clearInterval(iv);
  }, []);

  // Gerçek tamamlanma sinyaline göre aşamaları belirle
  const stages = [
    { label: isEN ? "Initializing ODE" : "ODE başlatılıyor",       done: elapsed > 0.3 || done },
    { label: isEN ? "Solving equations" : "Denklemler çözülüyor",  done: elapsed > 2   || done },
    { label: isEN ? "Computing effects" : "Etkiler hesaplanıyor",  done: elapsed > 3   || done },
    { label: isEN ? "Generating plots" : "Grafikler oluşturuluyor", done: done },
  ];

  return (
    <div className={`mt-4 rounded-xl border p-4 space-y-3 ${dark?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-200"}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-purple-500">
          {done ? (isEN?"Simulation complete!":"Simülasyon tamamlandı!") : (isEN?"Running ODE simulation":"ODE simülasyonu çalışıyor")}{!done && dots}
        </span>
        <span className={`text-xs font-mono ${dark?"text-gray-500":"text-gray-400"}`}>{elapsed.toFixed(1)}s</span>
      </div>
      <div className="space-y-2">
        {stages.map((s,i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              s.done ? "bg-green-500" : dark?"bg-gray-700 animate-pulse":"bg-gray-300 animate-pulse"
            }`}>
              {s.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>}
            </div>
            <span className={`text-xs ${s.done?(dark?"text-gray-300":"text-gray-700"):(dark?"text-gray-600":"text-gray-400")}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {!done && (
        <p className={`text-xs ${dark?"text-gray-600":"text-gray-400"}`}>
          {isEN?"Estimated time: 5–15 seconds":"Tahmini süre: 5–15 saniye"}
        </p>
      )}
    </div>
  );
}

// ── Hasta silüeti ──────────────────────────────────────────────────────────
function PatientSilhouette({ wbc, anc, vipn, isEN=false }) {
  const wbcOk  = wbc  >= 1.5 && wbc  <= 3.0;
  const ancOk  = anc  >= 0.5 && anc  <= 1.5;
  const vipnOk = vipn >= 0.78;
  const score  = (wbcOk?1:Math.min(wbc/1.5,3/Math.max(wbc,0.01)))*0.4+
                 (ancOk?1:Math.min(anc/0.5,1.5/Math.max(anc,0.01)))*0.4+
                 (vipnOk?1:vipn/0.78)*0.2;
  const color  = score>0.8?"#22c55e":score>0.5?"#f59e0b":"#ef4444";
  const label  = isEN ? (score>0.8?"Good":score>0.5?"Moderate":"Critical") : (score>0.8?"İyi":score>0.5?"Orta":"Kritik");
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 60 100" width="56" height="94">
        <circle cx="30" cy="13" r="10" fill={color} opacity="0.9"/>
        <rect x="18" y="24" width="24" height="36" rx="8" fill={color} opacity="0.8"/>
        <rect x="6"  y="26" width="10" height="26" rx="5" fill={color} opacity="0.7" transform="rotate(-8 11 39)"/>
        <rect x="44" y="26" width="10" height="26" rx="5" fill={color} opacity="0.7" transform="rotate(8 49 39)"/>
        <rect x="18" y="58" width="10" height="28" rx="5" fill={color} opacity="0.75" transform="rotate(-3 23 72)"/>
        <rect x="32" y="58" width="10" height="28" rx="5" fill={color} opacity="0.75" transform="rotate(3 37 72)"/>
        <path d="M10 46 L16 46 L19 40 L22 52 L25 46 L50 46" fill="none"
              stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5">
          <animate attributeName="stroke-dashoffset" from="80" to="0" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="stroke-dasharray" values="0,80;80,0;0,80" dur="1.4s" repeatCount="indefinite"/>
        </path>
      </svg>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{background:`${color}22`,color,border:`1px solid ${color}44`}}>{label}</span>
      <div className="space-y-1 w-full">
        {[["WBC",wbc,wbcOk],["ANC",anc,ancOk],["VIPN",vipn,vipnOk]].map(([l,v,ok])=>(
          <div key={l} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${ok?"bg-green-400":"bg-red-400"}`}/>
            <span className="text-xs text-gray-400">{l}</span>
            <span className={`text-xs font-mono font-semibold ml-auto ${ok?"text-green-500":"text-red-400"}`}>{v.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Plotly grafik — 4 Faz + 5 İlaç ────────────────────────────────────────
function PlotlyChart({ id, timeseries, config, currentDay, dark, lang, phaseList: phaseListProp }) {
  const ref      = useRef(null);
  const plotted  = useRef(false);

  const [plotlyReady, setPlotlyReady] = useState(!!window.Plotly);

  useEffect(() => {
    if (window.Plotly) { setPlotlyReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/plotly.js-dist@2.27.0/plotly.min.js";
    s.onload = () => setPlotlyReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    plotted.current = false;
    if (!plotlyReady || !window.Plotly || !ref.current) return;

    const t    = timeseries?.t;
    const wbc  = timeseries?.wbc;
    const anc  = timeseries?.anc;
    const vipn = timeseries?.vipn;
    // Etki serileri — mevcut
    const eDnr  = timeseries?.e_dnr;
    const eVcr  = timeseries?.e_vcr;
    // Etki serileri — yeni ilaçlar
    const eSter = timeseries?.e_ster;
    const eArac = timeseries?.e_arac;
    const eCpm  = timeseries?.e_cpm;
    const e6tg  = timeseries?.e_6tg;
    const eCop  = timeseries?.e_cop;
    const eNov  = timeseries?.e_nov;
    if (!t?.length || !wbc?.length) return;

    const bg  = dark?"#111827":"#ffffff";
    const gc  = dark?"#374151":"#e5e7eb";
    const tc  = dark?"#d1d5db":"#374151";
    const isEN = lang==="en";
    const act  = config?.active_drugs || [];

    // Faz sınırları — prop'tan al (custom veya varsayılan)
    const configTMax = config?.t_end ?? 250;
    const phaseList = phaseListProp || [
      {name:"induction",    start:0,   end:29,   drugs:[]},
      {name:"consolidation",start:29,  end:84,   drugs:[]},
      {name:"reinduction",  start:84,  end:140,  drugs:[]},
      {name:"maintenance",  start:140, end:configTMax, drugs:[]},
    ];
    const T_IND   = phaseList[1]?.start ?? 29;
    const T_CONS  = phaseList[2]?.start ?? 84;
    const T_REIND = phaseList[3]?.start ?? 140;
    const tEnd = config?.t_end || 250;

    const safeMax = (arr, fb=6) => {
      if(!arr?.length) return fb;
      const m = Math.max(...arr.filter(v=>isFinite(v)));
      return isFinite(m)?m:fb;
    };

    // Traces
    const traces = [
      { x:t, y:wbc, name:"WBC", line:{color:"#3b82f6",width:2.5}, mode:"lines",
        hovertemplate:"WBC: %{y:.3f} ×10⁹/L<extra></extra>" },
    ];
    if(anc?.length) traces.push(
      { x:t, y:anc, name:"ANC", line:{color:"#10b981",width:2.5,dash:"dash"}, mode:"lines",
        hovertemplate:"ANC: %{y:.3f} ×10⁹/L<extra></extra>" }
    );
    if(vipn?.length) traces.push(
      { x:t, y:vipn, name:"VIPN N(t)", line:{color:"#8b5cf6",width:2,dash:"dot"}, mode:"lines",
        yaxis:"y2", hovertemplate:"VIPN: %{y:.3f}<extra></extra>" }
    );
    // DNR miyelosupresif etki — sadece aktifse ve veri varsa
    if(eDnr?.length && act.includes("daunorubicin")) {
      const eDnrMax = Math.max(...eDnr.filter(v=>isFinite(v)));
      if(eDnrMax > 0.001) traces.push(
        { x:t, y:eDnr, name:isEN?"DNR Effect":"DNR Etkisi",
          line:{color:"#ef4444",width:1.5,dash:"dot"}, mode:"lines",
          yaxis:"y2", opacity:0.7,
          hovertemplate:`${isEN?"DNR myelosupp.":"DNR miyelosup."}: %{y:.4f}<extra></extra>` }
      );
    }
    // VCR → VIPN kümülatif etki
    if(eVcr?.length && act.includes("vcr")) {
      const eVcrMax = Math.max(...eVcr.filter(v=>isFinite(v)));
      if(eVcrMax > 0.001) traces.push(
        { x:t, y:eVcr, name:isEN?"VCR→VIPN Effect":"VCR→VIPN Etkisi",
          line:{color:"#f59e0b",width:1.5,dash:"dashdot"}, mode:"lines",
          yaxis:"y2", opacity:0.7,
          hovertemplate:`${isEN?"VCR VIPN effect":"VCR VIPN etkisi"}: %{y:.4f}<extra></extra>` }
      );
    }
    // ── Corticosteroid (CS) — anti-lösemik, miyelosupresyon minimal ────────
    if(eSter?.length && act.includes("corticosteroid")) {
      const mx = Math.max(...eSter.filter(v=>isFinite(v)));
      if(mx > 0.001) traces.push({
        x:t, y:eSter, name:isEN?"CS Effect (Corticosteroid)":"CS Etkisi (Kortikosteroid)",
        line:{color:"#ec4899",width:1.5,dash:"dot"}, mode:"lines",
        yaxis:"y2", opacity:0.75,
        hovertemplate:"CS: %{y:.4f}<extra></extra>"
      });
    }
    // ── Cytarabine (Ara-C) — güçlü miyelosupresif ────────────────────────
    if(eArac?.length && act.includes("cytarabine")) {
      const mx = Math.max(...eArac.filter(v=>isFinite(v)));
      if(mx > 0.001) traces.push({
        x:t, y:eArac, name:isEN?"Ara-C Effect":"Ara-C Etkisi",
        line:{color:"#06b6d4",width:1.5,dash:"dashdot"}, mode:"lines",
        yaxis:"y2", opacity:0.75,
        hovertemplate:"Ara-C: %{y:.4f}<extra></extra>"
      });
    }
    // ── Cyclophosphamide (CPM) — 4-OH-CP aktif metabolit ─────────────────
    if(eCpm?.length && act.includes("cyclophosphamide")) {
      const mx = Math.max(...eCpm.filter(v=>isFinite(v)));
      if(mx > 0.001) traces.push({
        x:t, y:eCpm, name:isEN?"CPM Effect (4-OH-CP)":"CPM Etkisi (4-OH-CP)",
        line:{color:"#84cc16",width:1.5,dash:"dot"}, mode:"lines",
        yaxis:"y2", opacity:0.75,
        hovertemplate:"CPM: %{y:.4f}<extra></extra>"
      });
    }
    // ── 6-Thioguanine (6-TG) — TGN intrasellüler ─────────────────────────
    if(e6tg?.length && act.includes("6tg")) {
      const mx = Math.max(...e6tg.filter(v=>isFinite(v)));
      if(mx > 0.001) traces.push({
        x:t, y:e6tg, name:isEN?"6-TG Effect (TGN)":"6-TG Etkisi (TGN)",
        line:{color:"#f97316",width:1.5,dash:"dot"}, mode:"lines",
        yaxis:"y2", opacity:0.75,
        hovertemplate:"6-TG TGN: %{y:.4f}<extra></extra>"
      });
    }
    // ── Copanlisib (COP) — PI3K inhibisyonu, hedefe yönelik ──────────────
    if(eCop?.length && act.includes("copanlisib")) {
      const mx = Math.max(...eCop.filter(v=>isFinite(v)));
      if(mx > 0.001) traces.push({
        x:t, y:eCop, name:isEN?"Copanlisib Effect":"Copanlisib Etkisi",
        line:{color:"#14b8a6",width:1.5,dash:"dashdot"}, mode:"lines",
        yaxis:"y2", opacity:0.75,
        hovertemplate:"COP: %{y:.4f}<extra></extra>"
      });
    }
    // ── Novobiocin (NOV) — Hsp90 inhibisyonu, hedefe yönelik ─────────────
    if(eNov?.length && act.includes("novobiocin")) {
      const mx = Math.max(...eNov.filter(v=>isFinite(v)));
      if(mx > 0.001) traces.push({
        x:t, y:eNov, name:isEN?"Novobiocin Effect":"Novobiocin Etkisi",
        line:{color:"#a855f7",width:1.5,dash:"dot"}, mode:"lines",
        yaxis:"y2", opacity:0.75,
        hovertemplate:"NOV: %{y:.4f}<extra></extra>"
      });
    }

    // PEG-ASP
    const peg = timeseries?.peg;
    if(peg?.t?.length && act.includes("asparaginase")) {
      traces.push({
        x:peg.t, y:peg.A, name:"PEG-ASP A(t)", line:{color:"#a855f7",width:1.8,dash:"dashdot"},
        mode:"lines", yaxis:"y3",
        hovertemplate:"PEG-ASP: %{y:.1f} IU/L<extra></extra>"
      });
      traces.push({
        x:peg.t, y:peg.Asn, name:isEN?"Asparagine":"Asparagin",
        line:{color:"#f97316",width:1.5,dash:"dot"},
        mode:"lines", yaxis:"y4",
        hovertemplate:"Asn: %{y:.2f} µmol/L<extra></extra>"
      });
      // PEG DPEG — deplisyon indeksi (0=tam deplisyon, 1=normal)
      if(peg.DPEG?.length) traces.push({
        x:peg.t, y:peg.DPEG,
        name:isEN?"PEG Depletion Index":"PEG Deplisyon İndeksi",
        line:{color:"#c084fc",width:1.2,dash:"dot"},
        mode:"lines", yaxis:"y2", opacity:0.6,
        hovertemplate:`${isEN?"Depletion":"Deplisyon"}: %{y:.3f}<extra></extra>`
      });
    }

    // Faz bantları (shapes)
    const phaseAlpha = dark?"0.12":"0.15";
    const phaseColors = [
      {fill:`rgba(239,68,68,${phaseAlpha})`, line:"#f59e0b", label:"#C62828"},
      {fill:`rgba(245,158,11,${phaseAlpha})`, line:"#a855f7", label:"#E65100"},
      {fill:`rgba(168,85,247,${phaseAlpha})`, line:"#10b981", label:"#6A1B9A"},
      {fill:`rgba(16,185,129,${phaseAlpha})`, line:"#3b82f6", label:"#2E7D32"},
      {fill:`rgba(59,130,246,${phaseAlpha})`, line:"#ec4899", label:"#1B3A6B"},
      {fill:`rgba(236,72,153,${phaseAlpha})`, line:"#f97316", label:"#9D174D"},
    ];
    const shapes = [
      // Faz bantları — phaseList'ten dinamik
      ...phaseList.flatMap((ph, i) => {
        const col = phaseColors[i % phaseColors.length];
        return [
          {type:"rect",xref:"x",yref:"paper",x0:ph.start,x1:ph.end,y0:0,y1:1,
           fillcolor:col.fill,line:{width:0},layer:"below"},
          ...(i>0?[{type:"line",xref:"x",yref:"paper",x0:ph.start,x1:ph.start,y0:0,y1:1,
           line:{color:col.line,width:1.2,dash:"dash"}}]:[]),
        ];
      }),
      // WBC hedef bandı
      {type:"rect",xref:"paper",yref:"y",x0:0,x1:1,y0:1.5,y1:3.0,
       fillcolor:"rgba(59,130,246,0.07)",line:{width:0}},
      // ANC hedef bandı
      {type:"rect",xref:"paper",yref:"y",x0:0,x1:1,y0:0.5,y1:2.0,
       fillcolor:"rgba(16,185,129,0.05)",line:{width:0}},
      // Güncel gün çizgisi
      {type:"line",xref:"x",yref:"paper",x0:currentDay,x1:currentDay,y0:0,y1:1,
       line:{color:"#f59e0b",width:2,dash:"dot"}},
    ];

    // DNR doz günleri
    if(act.includes("daunorubicin")) {
      [1,8,15,22,84,91].forEach(d2=>{
        shapes.push({type:"line",xref:"x",yref:"paper",x0:d2,x1:d2,y0:0,y1:1,
          line:{color:"#ef4444",width:0.8,dash:"dot"}});
      });
    }

    // Faz etiketleri — phaseList'ten dinamik
    const phaseAnnotations = phaseList.map((ph, i) => ({
      x: (ph.start + ph.end) / 2,
      y: 1.06,
      text: ph.name,
      xref: "x", yref: "paper", showarrow: false,
      yanchor: "bottom",
      font: {color: phaseColors[i % phaseColors.length].label, size: 9, weight: "bold"},
    }));

    const dayAnnotation = {
      x:currentDay, y:1.06, xref:"x", yref:"paper",
      text:isEN?`Day ${Math.round(currentDay)}`:`Gün ${Math.round(currentDay)}`,
      showarrow:false, yanchor:"bottom", font:{color:"#f59e0b",size:11},
    };

    const hasPeg = peg?.t?.length && act.includes("asparaginase");

    try {
      window.Plotly.newPlot(ref.current, traces, {
        paper_bgcolor:bg, plot_bgcolor:bg,
        font:{color:tc,size:11},
        margin:{t:75,b:50,l:55,r: hasPeg?120:55},
        xaxis:{title:{text:isEN?"Day":"Gün"},gridcolor:gc,range:[0,tEnd]},
        yaxis:{title:{text:"WBC/ANC (×10⁹/L)"},gridcolor:gc,range:[0,Math.max(6,safeMax(wbc))+0.5]},
        yaxis2:{title:{text:"VIPN"},overlaying:"y",side:"right",range:[0,1.2],showgrid:false,
                position: hasPeg?0.85:1.0},
        ...(hasPeg?{
          yaxis3:{title:{text:"PEG-ASP (IU/L)"},overlaying:"y",side:"right",anchor:"free",position:0.93,showgrid:false},
          yaxis4:{title:{text:"Asn (µmol/L)"},overlaying:"y",side:"right",anchor:"free",position:1.0,showgrid:false},
        }:{}),
        shapes,
        annotations:[...phaseAnnotations, dayAnnotation],
        legend:{orientation:"h",x:0,y:1.22,xanchor:"left",yanchor:"bottom",bgcolor:"rgba(0,0,0,0)",font:{size:10}},
        hovermode:"x unified",
      },{
        responsive:true, displayModeBar:true,
        modeBarButtonsToRemove:["lasso2d","select2d"],
        toImageButtonOptions:{format:"png",filename:`sting_ode_4phase_${Date.now()}`,scale:2},
      }).then(()=>{plotted.current=true;});
    } catch(e) {
      console.error("Plotly error:", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeseries, dark, lang, config, plotlyReady, phaseListProp]);

  useEffect(() => {
    if(!window.Plotly||!ref.current||!plotted.current) return;
    if(!timeseries?.t?.length) return;
    const isEN = lang==="en";
    try {
      const lastShapeIdx = ref.current.layout?.shapes?.length - 1;
      const lastAnnIdx   = ref.current.layout?.annotations?.length - 1;
      window.Plotly.relayout(ref.current, {
        [`shapes[${lastShapeIdx}].x0`]: currentDay,
        [`shapes[${lastShapeIdx}].x1`]: currentDay,
        [`annotations[${lastAnnIdx}].x`]: currentDay,
        [`annotations[${lastAnnIdx}].text`]: isEN?`Day ${Math.round(currentDay)}`:`Gün ${Math.round(currentDay)}`,
      });
    } catch(e){}
  }, [currentDay, timeseries, lang]);

  return <div ref={ref} style={{width:"100%",height:380}} className="rounded-xl overflow-hidden"/>;
}

// ── İlaç parametre kartı ───────────────────────────────────────────────────
function DrugParamCard({ name, color, params, dark }) {
  return (
    <div className="rounded-xl border p-3 flex-1 min-w-0" style={{borderColor:`${color}44`,background:`${color}0d`}}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{background:color}}/>
        <p className="text-xs font-bold" style={{color}}>{name}</p>
      </div>
      <div className="space-y-1">
        {params.map(([label,val,unit])=>(
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-xs font-semibold font-mono" style={{color}}>
              {val}<span className="text-xs font-normal ml-0.5 text-gray-400">{unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, status, dark }) {
  const sc={good:dark?"border-green-500/30 bg-green-500/10 text-green-400":"border-green-200 bg-green-50 text-green-700",
            warn:dark?"border-amber-500/30 bg-amber-500/10 text-amber-400":"border-amber-200 bg-amber-50 text-amber-700",
            danger:dark?"border-red-500/30 bg-red-500/10 text-red-400":"border-red-200 bg-red-50 text-red-600",
            neutral:dark?"border-gray-700 bg-gray-800 text-gray-300":"border-gray-200 bg-white text-gray-800"};
  return (
    <div className={`rounded-xl border p-3 text-center ${sc[status||"neutral"]}`}>
      <p className="text-xl font-bold font-mono">{value??""}</p>
      {unit&&<p className="text-xs opacity-60 mt-0.5">{unit}</p>}
      <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
}

// ── Grafik kaydet butonu ───────────────────────────────────────────────────
function SavePlotBtn({ b64, filename, dark, isEN }) {
  if (!b64) return null;
  const handleSave = () => {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${b64}`;
    a.download = `${filename}_${Date.now()}.png`;
    a.click();
  };
  return (
    <button onClick={handleSave}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
        dark?"border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
            :"border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"}`}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
      </svg>
      {isEN?"Save PNG":"PNG Kaydet"}
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Tab3ODE({ dark, config: externalConfig, onComplete, onRerun, onGoTo }) {
  const { lang } = useLang();
  const d    = dark;
  const isEN = lang==="en";

  const [status,     setStatus]     = useState("idle");
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [currentDay, setCurrentDay] = useState(0);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [elapsed,    setElapsed]    = useState(0);
  const [showRerunWarning, setShowRerunWarning] = useState(false);
  const [engine,     setEngine]     = useState("full_drug");

  // ── Duyarlılık Analizi state ───────────────────────────────────────────
  const [sensOpen,    setSensOpen]    = useState(false);
  const [sensStatus,  setSensStatus]  = useState("idle"); // idle | running | done | error
  const [sensResult,  setSensResult]  = useState(null);
  const [sensError,   setSensError]   = useState(null);
  const [sensTarget,  setSensTarget]  = useState("WBC"); // WBC | ANC | Lt

  // Animasyon — RAF tabanlı, slider ile tam senkron
  const animRef    = useRef(null);
  const startMsRef = useRef(null);
  const startDayRef= useRef(0);
  const elapsedRef = useRef(null);

  const config = externalConfig || {
    weight_kg:30,height_cm:135,tpmt:1,vitamin_d:30,
    diet:1.0,exercise:0.4,wbc0:5.0,anc0:1.6,
    active_drugs:["6mp","mtx","vcr"],
    dose_6mp_mg:50,dose_mtx_mg:20,dose_vcr_mg:1.5,
    t_end: 250, phase_key:"maintenance",
  };

  const tMax = result?.timeseries?.t?.at(-1) ?? config?.t_end ?? 250;

  // Progress timer (simülasyon sırasında)
  useEffect(() => {
    if (status !== "running") return;
    const t0 = Date.now();
    elapsedRef.current = setInterval(() => setElapsed((Date.now()-t0)/1000), 200);
    return () => clearInterval(elapsedRef.current);
  }, [status]);

  const abortRef = useRef(null);

  const handleRun = useCallback(async () => {
    // Eğer çalışıyorsa durdur
    if (status === "running") {
      if (abortRef.current) abortRef.current.abort();
      setStatus("idle"); setError(null);
      return;
    }
    abortRef.current = new AbortController();
    setStatus("running"); setError(null); setResult(null);
    setCurrentDay(0); setIsPlaying(false); setElapsed(0);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    try {
      const data = await runSimulation({ ...config, engine }, abortRef.current.signal);
      clearInterval(elapsedRef.current);
      console.log("[Tab3] config.custom_phases sent:", JSON.stringify(config.custom_phases));
      console.log("[Tab3] data.summary.phase_list received:", JSON.stringify(data?.summary?.phase_list));
      setResult(data); setStatus("done");
      if (onComplete) onComplete(data);
    } catch(e) {
      clearInterval(elapsedRef.current);
      if (e.name === "AbortError") { setStatus("idle"); return; }
      setError(e.message); setStatus("error");
    }
  }, [config, engine, onComplete, status]);

  const handleRunClick = useCallback(() => {
    // Eğer mevcut sonuç varsa → uyarı göster
    if (result) {
      setShowRerunWarning(true);
    } else {
      handleRun();
    }
  }, [result, handleRun]);

  const confirmRerun = useCallback(() => {
    setShowRerunWarning(false);
    if (onRerun) onRerun(); // GA ve Tab5'i sıfırla
    handleRun();
  }, [handleRun, onRerun]);
  const stopAnim = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    setIsPlaying(false);
  }, []);

  const startAnim = useCallback((fromDay) => {
    const SPEED = 15; // gün/saniye
    startMsRef.current  = performance.now();
    startDayRef.current = fromDay;

    const tick = (now) => {
      const dt    = (now - startMsRef.current) / 1000;
      const newDay = Math.min(startDayRef.current + dt * SPEED, tMax);
      setCurrentDay(newDay);
      if (newDay >= tMax) { stopAnim(); return; }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    setIsPlaying(true);
  }, [tMax, stopAnim]);

  const togglePlay = useCallback(() => {
    if (isPlaying) { stopAnim(); }
    else {
      const from = currentDay >= tMax ? 0 : currentDay;
      if (from === 0) setCurrentDay(0);
      startAnim(from);
    }
  }, [isPlaying, currentDay, tMax, stopAnim, startAnim]);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const handleSlider = (v) => { stopAnim(); setCurrentDay(v); };

  // Anlık değerler
  const ts   = result?.timeseries;
  const tArr = ts?.t || [];
  const ni   = tArr.length>0
    ? tArr.reduce((bi,tv,i)=>Math.abs(tv-currentDay)<Math.abs(tArr[bi]-currentDay)?i:bi,0)
    : 0;
  const wbcNow  = ts?.wbc?.[ni]  ?? 0;
  const ancNow  = ts?.anc?.[ni]  ?? 0;
  const vipnNow = ts?.vipn?.[ni] ?? 1;

  const summary  = result?.summary || {};
  // Tüm ODE ilaçları — drugConfig'den
  const ALL_ODE_DRUG_KEYS = [
    "6mp","mtx","vcr","daunorubicin","asparaginase",
    "corticosteroid","cytarabine","cyclophosphamide","6tg","copanlisib","novobiocin"
  ];
  const odeActive = (config.active_drugs||[]).filter(k=>ALL_ODE_DRUG_KEYS.includes(k));
  const card = `rounded-2xl border ${d?"bg-gray-900 border-gray-800":"bg-white border-gray-200"}`;

  const howToSteps = isEN ? [
    { title: "What is ODE simulation?", desc: "This tab runs a pharmacokinetic/pharmacodynamic (PK/PD) model covering all 11 drugs (48-dim ODE) that shows how WBC, ANC and VIPN values change over 250 days (4 phases). It answers: 'What happens to the patient with these exact doses?'" },
    { title: "Set parameters in Tab 2 first", desc: "Select treatment phase, active drugs and patient data in Tab 2. When you click 'Proceed to ODE', you'll arrive here with those settings." },
    { title: "Click Run Simulation", desc: "The ODE solver (LSODA method) integrates 29 differential equations (6-MP, MTX, VCR, DNR, PEG-ASP). This takes about 5–15 seconds." },
    { title: "Use the day slider", desc: "After simulation, drag the slider or press ▶ to animate. The patient silhouette changes color (green/yellow/red) based on WBC, ANC, VIPN values at that day." },
    { title: "Proceed to Tab 4 for dose optimization", desc: "ODE shows what happens with fixed doses. Tab 4 (GA) finds the optimal dose schedule that maximizes time in target ranges." },
  ] : [
    { title: "ODE simülasyonu nedir?", desc: "Bu sekme, seçilen ilaç dozlarıyla WBC, ANC ve VIPN değerlerinin 250 günde (4 faz) nasıl değiştiğini gösteren farmakokinetik/farmakodinamik (PK/PD) modeli çalıştırır. 'Bu dozlarla hastaya ne olur?' sorusunu yanıtlar." },
    { title: "Önce Tab 2'de parametreleri ayarlayın", desc: "Tab 2'de tedavi fazı, aktif ilaçlar ve hasta verilerini seçin. 'ODE'ye Geç' butonuna basınca o ayarlarla buraya gelirsiniz." },
    { title: "Simülasyonu Çalıştır'a tıklayın", desc: "ODE çözücü (LSODA yöntemi) 29 diferansiyel denklemi entegre eder (6-MP, MTX, VCR, DNR, PEG-ASP). Bu yaklaşık 5–15 saniye sürer." },
    { title: "Gün slider'ını kullanın", desc: "Simülasyon sonrası slider'ı sürükleyin veya ▶ butonuna basın. Hasta silüeti o günkü WBC, ANC, VIPN değerlerine göre yeşil/sarı/kırmızı renk alır." },
    { title: "Tab 4'te doz optimizasyonuna geçin", desc: "ODE sabit dozlarla ne olduğunu gösterir. Tab 4 (GA), hedef aralıkta geçirilen süreyi maksimize eden optimal doz programını bulur." },
  ];

  return (
    <div className="space-y-5">
      <HowToUse steps={howToSteps} dark={d}/>

      {/* ── 1. RUN BUTONU ── */}
      <div className={card+" p-4"}>

        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={handleRunClick}
            className={`flex-shrink-0 font-semibold px-6 py-2.5 rounded-xl transition-all text-sm shadow-lg text-white ${
              status==="running"
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-500/20"
                : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-purple-500/20"
            }`}>
            {status==="running"
              ? <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  {isEN?"■ Stop":"■ Durdur"}
                </span>
              : result
                ? isEN?"↺ Re-run":"↺ Yeniden Çalıştır"
                : isEN?"▶ Run ODE":"▶ ODE Simülasyonunu Çalıştır"}
          </button>
          <div className="flex gap-2 flex-wrap">
            {odeActive.includes("6mp") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#3b82f620",color:"#3b82f6",border:"1px solid #3b82f644"}}>
                6-MP {config.dose_6mp_mg}mg/{isEN?"d":"g"}
              </span>
            )}
            {odeActive.includes("mtx") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#10b98120",color:"#10b981",border:"1px solid #10b98144"}}>
                MTX {config.dose_mtx_mg}mg/{isEN?"wk":"hf"}
              </span>
            )}
            {odeActive.includes("vcr") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#f59e0b20",color:"#f59e0b",border:"1px solid #f59e0b44"}}>
                VCR {config.dose_vcr_mg}mg/28{isEN?"d":"g"}
              </span>
            )}
            {odeActive.includes("daunorubicin") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#ef444420",color:"#ef4444",border:"1px solid #ef444444"}}>
                DNR {config.dose_dnr_mg_m2||25}mg/m²
              </span>
            )}
            {odeActive.includes("asparaginase") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#a855f720",color:"#a855f7",border:"1px solid #a855f744"}}>
                PEG-ASP 2500IU/m²
              </span>
            )}
            {odeActive.includes("corticosteroid") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#ec489920",color:"#ec4899",border:"1px solid #ec489944"}}>
                CS {config.dose_ster_mg_m2||60}mg/m²
              </span>
            )}
            {odeActive.includes("cytarabine") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#06b6d420",color:"#06b6d4",border:"1px solid #06b6d444"}}>
                Ara-C {config.dose_arac_mg_m2||75}mg/m²
              </span>
            )}
            {odeActive.includes("cyclophosphamide") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#84cc1620",color:"#84cc16",border:"1px solid #84cc1644"}}>
                CPM {config.dose_cpm_mg_m2||1000}mg/m²
              </span>
            )}
            {odeActive.includes("6tg") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#f9731620",color:"#f97316",border:"1px solid #f9731644"}}>
                6-TG {config.dose_6tg_mg_m2||60}mg/m²
              </span>
            )}
            {odeActive.includes("copanlisib") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#14b8a620",color:"#14b8a6",border:"1px solid #14b8a644"}}>
                COP {config.dose_cop_mg||60}mg
              </span>
            )}
            {odeActive.includes("novobiocin") && (
              <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{background:"#a855f720",color:"#a78bfa",border:"1px solid #a855f744"}}>
                NOV {config.dose_nov_mg_kg||500}mg/gün
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-lg ${d?"bg-gray-800 text-gray-500":"bg-gray-100 text-gray-400"}`}>
              {config.weight_kg}kg · {config.t_end}{isEN?"d":"g"}
            </span>
          </div>
        </div>

      {/* Yeniden çalıştırma uyarısı */}
      {showRerunWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`rounded-2xl border p-6 max-w-sm mx-4 shadow-2xl ${d?"bg-gray-900 border-gray-700":"bg-white border-gray-200"}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500 text-xl">⚠️</div>
              <div>
                <p className={`text-sm font-semibold mb-1 ${d?"text-gray-200":"text-gray-800"}`}>
                  {isEN?"Re-run ODE Simulation?":"Yeniden Calistir?"}
                </p>
                <p className={`text-xs leading-relaxed ${d?"text-gray-400":"text-gray-600"}`}>
                  {isEN
                    ?"This will reset Tab 4 (GA) and Tab 5 (GNN) results."
                    :"Bu işlem Tab 4 ve Tab 5 sonuclarını sıfırlayacak."}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={confirmRerun}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-xl text-sm">
                {isEN?"Yes, re-run":"Evet"}
              </button>
              <button onClick={() => setShowRerunWarning(false)}
                className={`flex-1 font-semibold py-2 rounded-xl text-sm border ${d?"border-gray-700 text-gray-300":"border-gray-200 text-gray-600"}`}>
                {isEN?"Cancel":"Iptal"}
              </button>
            </div>
          </div>
        </div>
      )}
        {(status==="running" || status==="done") && status !== "idle" && (
          <SimProgress elapsed={elapsed} done={status==="done"} dark={d} isEN={isEN}/>
        )}
        {error && <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
      </div>

      {/* ── Tamamlandı bildirimi — run butonunun hemen altında ── */}
      {result && (
        <>
          <NextTabBanner
            dark={d}
            metrics={`WBC min: ${summary.wbc_min} · ANC min: ${summary.anc_min} · ${isEN?"In target:":"Hedefte:"} ${summary.wbc_in_target_pct}%` + (summary.peg_summary?` · PEG-ASP Asn min: ${summary.peg_summary.asn_min?.toFixed(1)} µmol/L`:"")}
            nextTab="tab4"
            nextLabel={isEN ? "Tab 4 — Dose Optimization (GA)" : "Tab 4 — Doz Optimizasyonu (GA)"}
            onGoTo={onGoTo}
          />
          <ExportButtons type="ode" id={result.sim_id} dark={d} />
        </>
      )}

      {/* ── 3. METRİKLER ── */}
      {result && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {label:"WBC min",value:summary.wbc_min,unit:"×10⁹/L",status:summary.wbc_min>1.2?"good":summary.wbc_min>0.8?"warn":"danger"},
            {label:"ANC min",value:summary.anc_min,unit:"×10⁹/L",status:summary.anc_min>0.5?"good":summary.anc_min>0.3?"warn":"danger"},
            {label:"VIPN min",value:summary.vipn_min,unit:"",status:"neutral"},
            {label:isEN?"WBC in target":"WBC hedefte",value:`${summary.wbc_in_target_pct}%`,
             status:summary.wbc_in_target_pct>60?"good":"warn"},
            ...(summary.peg_summary?[
              {label:"Asn min",value:summary.peg_summary.asn_min?.toFixed(1),unit:"µmol/L",status:summary.peg_summary.asn_min<5?"good":"warn"},
              {label:"PEG depletion",value:`${summary.peg_summary.asn_depletion_pct?.toFixed(1)}%`,unit:"",status:"neutral"},
              {label:isEN?"Above threshold":"Eşik üstü",value:`${summary.peg_summary.t_above_threshold?.toFixed(0)}g`,unit:"",status:summary.peg_summary.t_above_threshold>10?"good":"warn"},
            ]:[]),
          ].map((m,i)=>(
            <MetricCard key={i} label={m.label} value={m.value} unit={m.unit} status={m.status} dark={d}/>
          ))}
        </div>
      )}

      {/* ── Tüm İlaçlar Motoru — Genişletilmiş Metrikler Paneli ── */}
      {result && summary.full_drug && (
        <div className={`rounded-2xl border p-4 space-y-3 ${d?"border-emerald-900/30 bg-emerald-500/5":"border-emerald-200 bg-emerald-50/50"}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${d?"text-emerald-300":"text-emerald-700"}`}>
              🧬 {isEN?"Tüm İlaçlar Motoru — Genişletilmiş Metrikler (48-dim ODE)":"Tüm İlaçlar Motoru — Genişletilmiş Metrikler (48-dim ODE)"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${d?"bg-emerald-500/20 text-emerald-400":"bg-emerald-100 text-emerald-700"}`}>
              {isEN?"NEW":"YENİ"}
            </span>
          </div>
          {/* Etkinlik metrikleri satırı */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: isEN?"Day-8 BRR":"G8 BRR", value: `${summary.full_drug.BRR_d8}%`,
                sub: summary.full_drug.PGR_PPR,
                good: summary.full_drug.BRR_d8 >= 97 },
              { label: isEN?"EOI MRD (d29)":"İnd-sonu MRD",
                value: summary.full_drug.EOI_MRD?.toExponential(1),
                sub: summary.full_drug.EOI_FLAG,
                good: summary.full_drug.EOI_MRD < 1e-4 },
              { label: isEN?"VIPN threshold":"VIPN eşiği",
                value: `${summary.full_drug.VIPN_threshold}`,
                sub: isEN?"safety floor":"güvenlik tabanı",
                good: summary.vipn_min >= summary.full_drug.VIPN_threshold },
              { label: isEN?"DNR cardiotox":"DNR kardiyotoks",
                value: `${summary.full_drug.cum_DNR_mg_m2} mg/m²`,
                sub: `%${summary.full_drug.DNR_card_risk_pct} risk`,
                good: summary.full_drug.DNR_card_risk_pct < 50 },
            ].map((m, i) => (
              <div key={i} className={`rounded-xl border p-3 text-center ${
                d?"bg-gray-900 border-gray-800":"bg-white border-gray-200"}`}>
                <p className={`text-xs mb-1 ${d?"text-gray-500":"text-gray-400"}`}>{m.label}</p>
                <p className={`text-lg font-bold ${m.good?(d?"text-emerald-400":"text-emerald-600"):(d?"text-amber-400":"text-amber-600")}`}>
                  {m.value}
                </p>
                <p className={`text-xs mt-0.5 font-medium ${m.good?(d?"text-emerald-500":"text-emerald-500"):(d?"text-amber-500":"text-amber-500")}`}>
                  {m.sub}
                </p>
              </div>
            ))}
          </div>
          {/* Kritik gün tablosu */}
          {summary.full_drug.crit_days && (
            <div>
              <p className={`text-xs font-semibold mb-2 ${d?"text-gray-400":"text-gray-600"}`}>
                {isEN?"Leukemic Burden — Critical Days (L/L₀)":"Lösemi Yükü — Kritik Günler (L/L₀)"}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.full_drug.crit_days).map(([day, v]) => (
                  <div key={day} className={`rounded-lg border px-3 py-1.5 text-center min-w-[70px] ${
                    d?"bg-gray-900 border-gray-700":"bg-white border-gray-200"}`}>
                    <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>G{day}</p>
                    <p className={`text-sm font-bold ${v.log_red>=2?(d?"text-emerald-400":"text-emerald-600"):(d?"text-amber-400":"text-amber-600")}`}>
                      {v.L_frac?.toExponential(1)}
                    </p>
                    <p className={`text-xs ${d?"text-gray-600":"text-gray-400"}`}>
                      {v.log_red?.toFixed(1)} log↓
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* CCS faz özeti */}
          {summary.full_drug.CCS_phase && (
            <div>
              <p className={`text-xs font-semibold mb-2 ${d?"text-gray-400":"text-gray-600"}`}>
                {isEN?"Corticosteroid Suppression (CCS) by Phase":"Faza Göre Kortikosteroid Baskısı (CCS)"}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.full_drug.CCS_phase).map(([phase, val]) => (
                  <div key={phase} className={`rounded-lg border px-3 py-1.5 text-center ${
                    d?"bg-gray-900 border-gray-700":"bg-white border-gray-200"}`}>
                    <p className={`text-xs ${d?"text-gray-500":"text-gray-400"} capitalize`}>{phase}</p>
                    <p className={`text-sm font-bold ${d?"text-purple-400":"text-purple-600"}`}>{val?.toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Hayatta Kalma + Toksisite Paneli ── */}
      {summary.toxicity && (
          <div className={`rounded-2xl border p-4 space-y-3 ${d?"border-red-900/30 bg-red-500/5":"border-red-200 bg-red-50/50"}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className={`text-sm font-semibold ${d?"text-red-300":"text-red-700"}`}>
                ⚠ {isEN?"Toxicity Analysis & Survival Estimate":"Toksisite Analizi ve Hayatta Kalma Tahmini"}
              </p>
              {/* Hayatta kalma göstergesi */}
              <div className="flex items-center gap-2">
                <div className={`rounded-xl px-3 py-1.5 border text-center ${
                  summary.toxicity.survival_probability >= 0.80
                    ?(d?"border-emerald-500/30 bg-emerald-500/10":"border-emerald-300 bg-emerald-50")
                    :summary.toxicity.survival_probability >= 0.60
                    ?(d?"border-amber-500/30 bg-amber-500/10":"border-amber-300 bg-amber-50")
                    :(d?"border-red-500/30 bg-red-500/10":"border-red-300 bg-red-50")
                }`}>
                  <p className="text-xs font-semibold" style={{color:
                    summary.toxicity.survival_probability >= 0.80 ? "#10b981" :
                    summary.toxicity.survival_probability >= 0.60 ? "#f59e0b" : "#ef4444"}}>
                    {isEN?"Survival Estimate":"Hayatta Kalma Tahmini"}
                  </p>
                  <p className="text-xl font-black" style={{color:
                    summary.toxicity.survival_probability >= 0.80 ? "#10b981" :
                    summary.toxicity.survival_probability >= 0.60 ? "#f59e0b" : "#ef4444"}}>
                    {summary.toxicity.survival_probability_pct}%
                  </p>
                </div>
                <div className={`rounded-xl px-3 py-1.5 border text-center text-xs ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-white"}`}>
                  <p className={d?"text-slate-500":"text-slate-400"}>{isEN?"Critical events":"Kritik olay"}</p>
                  <p className={`text-lg font-bold ${summary.toxicity.n_critical_events>0?"text-red-400":"text-emerald-400"}`}>
                    {summary.toxicity.n_critical_events}
                  </p>
                </div>
                <div className={`rounded-xl px-3 py-1.5 border text-center text-xs ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-white"}`}>
                  <p className={d?"text-slate-500":"text-slate-400"}>{isEN?"Neutropenic days":"Nötropen gün"}</p>
                  <p className={`text-lg font-bold ${summary.toxicity.days_critical_anc>7?"text-red-400":"text-amber-400"}`}>
                    {summary.toxicity.days_critical_anc}
                  </p>
                </div>
              </div>
            </div>

            {/* Toksisite olayları */}
            {summary.toxicity.events?.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {summary.toxicity.events.map((ev,i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                    ev.severity === "critical"
                      ?(d?"border-red-500/30 bg-red-500/10":"border-red-200 bg-red-50")
                      :(d?"border-amber-500/30 bg-amber-500/10":"border-amber-200 bg-amber-50")
                  }`}>
                    <span className="flex-shrink-0 font-bold mt-0.5" style={{color:ev.severity==="critical"?"#ef4444":"#f59e0b"}}>
                      {ev.severity==="critical"?"🔴":"🟡"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p style={{color:ev.severity==="critical"?"#ef4444":"#f59e0b"}}>
                        {isEN ? ev.message_en : ev.message_tr}
                      </p>
                      <p className={`mt-0.5 italic text-xs ${d?"text-slate-600":"text-slate-400"}`}>
                        {ev.ref}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 font-mono text-xs ${d?"text-slate-500":"text-slate-400"}`}>
                      {isEN?"D":"G"}{ev.day}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${d?"text-emerald-400":"text-emerald-600"}`}>
                ✓ {isEN?"No toxicity threshold exceeded.":"Toksisite eşiği aşılmadı."}
              </p>
            )}

            {/* Toksisite istatistikleri */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
              {[
                {l:isEN?"Febrile neutropenia":"Febril nötropeni",
                 v:`${summary.toxicity.days_febrile_anc}g`,
                 c:summary.toxicity.days_febrile_anc>14?"#ef4444":"#f59e0b"},
                {l:isEN?"Critical neutropenia":"Kritik nötropeni",
                 v:`${summary.toxicity.days_critical_anc}g`,
                 c:summary.toxicity.days_critical_anc>3?"#ef4444":"#10b981"},
                ...(summary.toxicity.dnr_cumulative_mg_m2>0?[
                  {l:"DNR kümülatif",
                   v:`${summary.toxicity.dnr_cumulative_mg_m2} mg/m²`,
                   c:summary.toxicity.dnr_cumulative_mg_m2>300?"#ef4444":
                     summary.toxicity.dnr_cumulative_mg_m2>200?"#f59e0b":"#10b981"},
                ]:[]),
                ...(summary.toxicity.vipn_min<1?[
                  {l:"VIPN min",
                   v:summary.toxicity.vipn_min?.toFixed(3),
                   c:summary.toxicity.vipn_min<0.3?"#ef4444":
                     summary.toxicity.vipn_min<0.5?"#f59e0b":"#10b981"},
                ]:[]),
              ].map(({l,v,c},i)=>(
                <div key={i} className={`rounded-xl border p-2 ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-white"}`}>
                  <p className="font-bold" style={{color:c}}>{v}</p>
                  <p className={d?"text-slate-500":"text-slate-400"}>{l}</p>
                </div>
              ))}
            </div>

            <p className={`text-xs italic ${d?"text-slate-600":"text-slate-400"}`}>
              {isEN
                ?"Survival estimate is model-based and for research purposes only. Clinical decisions require oncologist evaluation."
                :"Hayatta kalma tahmini model tabanlıdır ve yalnızca araştırma amaçlıdır. Klinik kararlar onkolog değerlendirmesi gerektirir."}
            </p>
          </div>
      )}

      {/* ── 4. GRAFİK + SİLÜET + SLIDER ── */}
      {result && (
        <div className={card+" p-5"}>
          <div className="flex gap-4">
            <div className={`flex-shrink-0 w-28 rounded-xl border p-3 ${d?"border-gray-700 bg-gray-800":"border-gray-200 bg-gray-50"}`}>
              <p className={`text-xs font-semibold mb-3 text-center ${d?"text-gray-400":"text-gray-600"}`}>
                {isEN?"Day":"Gun"} {Math.round(currentDay)}
              </p>
              <PatientSilhouette wbc={wbcNow} anc={ancNow} vipn={vipnNow} isEN={isEN}/>
            </div>
            <div className="flex-1 min-w-0">
              <PlotlyChart id="ode-main" timeseries={ts} config={config} currentDay={currentDay} dark={d} lang={lang} phaseList={result?.summary?.phase_list||null}/>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={togglePlay}
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                d?"bg-gray-700 hover:bg-gray-600 text-gray-200":"bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
              {isPlaying
                ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
                : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>}
            </button>
            <span className={`text-xs w-4 font-mono flex-shrink-0 ${d?"text-gray-600":"text-gray-400"}`}>0</span>
            <input type="range" min="0" max={tMax} step="0.2" value={currentDay}
              onChange={e=>handleSlider(Number(e.target.value))}
              className="flex-1 accent-purple-500"/>
            <span className={`text-xs w-8 font-mono flex-shrink-0 ${d?"text-gray-600":"text-gray-400"}`}>{Math.round(tMax)}</span>
            <span className={`text-xs font-mono flex-shrink-0 px-2 py-0.5 rounded-lg ${d?"bg-purple-500/20 text-purple-300":"bg-purple-100 text-purple-700"}`}>
              {isEN?"Day":"Gun"} {Math.round(currentDay)}
            </span>
          </div>
          <div className={`mt-3 flex gap-4 text-xs px-3 py-2 rounded-lg flex-wrap ${d?"bg-gray-800 text-gray-500":"bg-gray-50 text-gray-400"}`}>
            <span>WBC: 1.5–3.0</span><span>·</span>
            <span>ANC: 0.5–1.5</span><span>·</span>
            <span>VIPN: 0.78</span>
          </div>
        </div>
      )}

      {/* ── 5. DUYARLILIK ANALİZİ PANELİ ── */}
      {result && (() => {
        // Sensitivity API çağrısı
        const runSensitivity = async () => {
          setSensStatus("running");
          setSensError(null);
          setSensResult(null);
          try {
            const payload = {
              weight_kg:        config.weight_kg       ?? 30,
              height_cm:        config.height_cm       ?? 135,
              tpmt:             config.tpmt            ?? 1,
              vitamin_d:        config.vitamin_d       ?? 30,
              diet:             config.diet            ?? 1,
              exercise:         config.exercise        ?? 0.4,
              wbc0:             config.wbc0            ?? 5,
              anc0:             config.anc0            ?? 1.6,
              active_drugs:     config.active_drugs    ?? ["6mp","mtx","vcr"],
              dose_6mp_mg:      config.dose_6mp_mg     ?? 50,
              dose_mtx_mg:      config.dose_mtx_mg     ?? 20,
              dose_vcr_mg:      config.dose_vcr_mg     ?? 1.5,
              dose_dnr_mg_m2:   config.dose_dnr_mg_m2  ?? 25,
              peg_dose_per_m2:  config.peg_dose_per_m2 ?? 2500,
              peg_dose_days:    config.peg_dose_days   ?? [4,36,57,91],
              dose_ster_mg_m2:  config.dose_ster_mg_m2 ?? 40,
              dose_arac_mg_m2:  config.dose_arac_mg_m2 ?? 75,
              dose_cpm_mg_m2:   config.dose_cpm_mg_m2  ?? 1000,
              dose_6tg_mg_m2:   config.dose_6tg_mg_m2  ?? 60,
              dose_cop_mg:      config.dose_cop_mg     ?? 60,
              dose_nov_mg_kg:   config.dose_nov_mg_kg  ?? 10,
              protocol_key:     config.protocol_key    ?? "cog_aall0331",
              t_end:            config.t_end           ?? 250,
              engine:           engine,
              perturbation:     0.10,
              targets:          ["WBC","ANC","Lt"],
            };
            const res = await fetch("/api/v1/ode/sensitivity", {
              method: "POST",
              headers: { Authorization: `Bearer ${localStorage.getItem("sting_token")}`, "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Duyarlılık analizi hatası");
            setSensResult(data);
            setSensStatus("done");
          } catch(e) {
            setSensError(e.message);
            setSensStatus("error");
          }
        };

        // Renk — duyarlılık değerine göre
        const sensColor = (val) => {
          if (val >= 20) return d ? "#ef4444" : "#dc2626";
          if (val >= 10) return d ? "#f59e0b" : "#d97706";
          if (val >= 5)  return d ? "#eab308" : "#ca8a04";
          return d ? "#22c55e" : "#16a34a";
        };
        const sensBar = (val, maxVal) => {
          const pct = Math.min((val / Math.max(maxVal, 1)) * 100, 100);
          const col = sensColor(val);
          return (
            <div className={`w-full rounded-full h-1.5 ${d?"bg-gray-700":"bg-gray-200"}`}>
              <div className="h-1.5 rounded-full transition-all" style={{width:`${pct}%`, background: col}}/>
            </div>
          );
        };

        const targets = ["WBC","ANC","Lt"];
        const targetLabels = { WBC: isEN?"WBC (min)":"WBC (min)", ANC: isEN?"ANC (min)":"ANC (min)", Lt: isEN?"Tumor (final)":"Tümör (son)" };

        return (
          <div className={`rounded-2xl border overflow-hidden ${d?"border-indigo-900/40":"border-indigo-200"}`}>
            {/* Header — accordion toggle */}
            <button
              onClick={() => setSensOpen(o => !o)}
              className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                d ? "bg-indigo-950/40 hover:bg-indigo-950/60" : "bg-indigo-50 hover:bg-indigo-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg className={`w-4 h-4 flex-shrink-0 ${d?"text-indigo-400":"text-indigo-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                </svg>
                <span className={`text-sm font-semibold ${d?"text-indigo-300":"text-indigo-700"}`}>
                  {isEN ? "ODE Sensitivity Analysis" : "ODE Duyarlılık Analizi"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d?"bg-indigo-900/60 text-indigo-400":"bg-indigo-100 text-indigo-600"}`}>
                  {isEN ? "±10% perturbation" : "±%10 pertürbasyon"}
                </span>
              </div>
              <svg className={`w-4 h-4 transition-transform ${sensOpen?"rotate-180":""} ${d?"text-indigo-400":"text-indigo-500"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {sensOpen && (
              <div className={`p-5 space-y-4 ${d?"bg-gray-900":"bg-white"}`}>

                {/* Açıklama */}
                <p className={`text-xs leading-relaxed ${d?"text-gray-400":"text-gray-500"}`}>
                  {isEN
                    ? "Each patient parameter is perturbed ±10% from its baseline value. The table shows how much WBC minimum, ANC minimum and final tumour load change relative to baseline. Higher sensitivity = that parameter critically affects treatment outcome."
                    : "Her hasta parametresi baseline değerinden ±%10 pertürbe edilir. Tablo, WBC minimum, ANC minimum ve son tümör yükünün baseline'a göre ne kadar değiştiğini gösterir. Yüksek duyarlılık = o parametre tedavi sonucunu kritik düzeyde etkiliyor."}
                </p>

                {/* Çalıştır butonu + hedef seçici */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={runSensitivity}
                    disabled={sensStatus === "running"}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      sensStatus === "running"
                        ? d?"bg-indigo-900/40 text-indigo-400 cursor-wait":"bg-indigo-100 text-indigo-400 cursor-wait"
                        : d?"bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
                            :"bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                    }`}
                  >
                    {sensStatus === "running" ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        {isEN ? "Running…" : "Çalışıyor…"}
                      </>
                    ) : sensResult ? (
                      isEN ? "↺ Re-run" : "↺ Yeniden Çalıştır"
                    ) : (
                      isEN ? "▶ Run Analysis" : "▶ Analizi Çalıştır"
                    )}
                  </button>

                  {/* Hedef seçici */}
                  {sensResult && (
                    <div className="flex gap-1">
                      {targets.map(t => (
                        <button key={t}
                          onClick={() => setSensTarget(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            sensTarget === t
                              ? d?"bg-indigo-600 text-white":"bg-indigo-600 text-white"
                              : d?"bg-gray-800 text-gray-400 hover:bg-gray-700":"bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >{targetLabels[t]}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hata */}
                {sensStatus === "error" && (
                  <div className={`rounded-xl border px-4 py-3 text-sm ${d?"border-red-800 bg-red-500/10 text-red-400":"border-red-200 bg-red-50 text-red-600"}`}>
                    ⚠ {sensError}
                  </div>
                )}

                {/* Running state */}
                {sensStatus === "running" && (
                  <div className={`rounded-xl border p-4 space-y-2 ${d?"border-indigo-900/40 bg-indigo-950/20":"border-indigo-100 bg-indigo-50"}`}>
                    {["Baseline simülasyon çalışıyor…","Parametreler pertürbe ediliyor…","Duyarlılıklar hesaplanıyor…"].map((s,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${i===0?"bg-indigo-500 animate-pulse":d?"bg-gray-700":"bg-gray-300"}`}/>
                        <span className={`text-xs ${d?"text-gray-400":"text-gray-500"}`}>{isEN ? [
                          "Running baseline simulation…","Perturbing parameters…","Computing sensitivities…"
                        ][i] : s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sonuç tablosu */}
                {sensResult && sensStatus === "done" && (() => {
                  const rows = sensResult.results || [];
                  const maxVal = Math.max(...rows.map(r => r.avg_abs_sensitivity?.[sensTarget] ?? 0), 1);
                  const baseline = sensResult.baseline_metrics || {};

                  return (
                    <div className="space-y-3">
                      {/* Baseline kartları */}
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(baseline).map(([k, v]) => (
                          <div key={k} className={`rounded-xl border px-3 py-1.5 text-center ${d?"border-gray-700 bg-gray-800":"border-gray-200 bg-gray-50"}`}>
                            <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>{k} baseline</p>
                            <p className={`text-sm font-bold ${d?"text-gray-200":"text-gray-800"}`}>{typeof v === "number" ? v.toFixed(3) : v}</p>
                          </div>
                        ))}
                        <div className={`rounded-xl border px-3 py-1.5 text-center ${d?"border-indigo-900/40 bg-indigo-950/20":"border-indigo-200 bg-indigo-50"}`}>
                          <p className={`text-xs ${d?"text-indigo-400":"text-indigo-600"}`}>{isEN?"Perturbation":"Pertürbasyon"}</p>
                          <p className={`text-sm font-bold ${d?"text-indigo-300":"text-indigo-700"}`}>±{sensResult.perturbation_pct}%</p>
                        </div>
                      </div>

                      {/* Tablo */}
                      <div className={`rounded-xl border overflow-hidden ${d?"border-gray-700":"border-gray-200"}`}>
                        <div className={`grid text-xs font-semibold px-4 py-2 ${d?"bg-gray-800 text-gray-400":"bg-gray-50 text-gray-500"}`}
                          style={{gridTemplateColumns:"1fr 80px 80px 80px 1fr"}}>
                          <span>{isEN?"Parameter":"Parametre"}</span>
                          <span className="text-center">+10%</span>
                          <span className="text-center">−10%</span>
                          <span className="text-center">{isEN?"Avg Δ%":"Ort Δ%"}</span>
                          <span className="pl-2">{isEN?"Impact":"Etki"}</span>
                        </div>
                        <div className="divide-y divide-gray-700/30">
                          {rows.map((row, i) => {
                            const plus  = row.sensitivity?.[sensTarget]?.["+"] ?? 0;
                            const minus = row.sensitivity?.[sensTarget]?.["−"] ?? row.sensitivity?.[sensTarget]?.["-"] ?? 0;
                            const avg   = row.avg_abs_sensitivity?.[sensTarget] ?? 0;
                            const label = isEN ? row.label_en : row.label_tr;
                            return (
                              <div key={i}
                                className={`grid items-center px-4 py-2.5 text-xs transition-colors ${
                                  d?"hover:bg-gray-800":"hover:bg-gray-50"
                                }`}
                                style={{gridTemplateColumns:"1fr 80px 80px 80px 1fr"}}>
                                <span className={`font-medium ${d?"text-gray-200":"text-gray-700"}`}>{label}</span>
                                <span className={`text-center font-mono ${plus > 0 ? "text-emerald-500" : plus < 0 ? "text-red-400" : d?"text-gray-500":"text-gray-400"}`}>
                                  {plus > 0 ? "+" : ""}{plus.toFixed(1)}%
                                </span>
                                <span className={`text-center font-mono ${minus > 0 ? "text-emerald-500" : minus < 0 ? "text-red-400" : d?"text-gray-500":"text-gray-400"}`}>
                                  {minus > 0 ? "+" : ""}{minus.toFixed(1)}%
                                </span>
                                <span className="text-center font-mono font-bold" style={{color: sensColor(avg)}}>
                                  {avg.toFixed(1)}%
                                </span>
                                <div className="pl-2">{sensBar(avg, maxVal)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <p className={`text-xs italic ${d?"text-gray-600":"text-gray-400"}`}>
                        {isEN
                          ? `Sorted by average absolute sensitivity on ${targetLabels[sensTarget]}. Values show % change relative to baseline.`
                          : `${targetLabels[sensTarget]} üzerindeki ortalama mutlak duyarlılığa göre sıralandı. Değerler baseline'a göre % değişimi gösterir.`}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── 6. BOŞ DURUM ── */}
      {status==="idle" && !result && (
        <div className={`flex flex-col items-center justify-center py-16 text-center ${d?"text-gray-600":"text-gray-400"}`}>
          <svg className={`w-14 h-14 mb-4 ${d?"text-gray-700":"text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-sm">{isEN?"Configure parameters in Tab 2, then run above.":"Tab 2'de parametreleri ayarlayın, sonra yukarıdan çalıstırın."}</p>
        </div>
      )}

    </div>
  );
}
