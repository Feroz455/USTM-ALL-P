// Tab5GNN.jsx — GNN v2 Kontrol Paneli

import { useState, useEffect, useRef, useCallback } from "react";
import { useLang } from "../../i18n/LangContext";
import HowToUse from "../ui/HowToUse";

const BASE = "/api/v1";
const tok  = () => localStorage.getItem("sting_token");
async function api(path, opts={}) {
  const res = await fetch(`${BASE}${path}`, {
    headers:{ Authorization:`Bearer ${tok()}`, "Content-Type":"application/json" }, ...opts
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.detail||"Hata");
  return d;
}
const apiPost = (p,b) => api(p,{method:"POST",body:JSON.stringify(b)});
const apiGet  = (p)   => api(p);



// ── GA Kayıt Detay Yardımcısı ───────────────────────────────────────────────
function GARecordDetail({ rec, ga, dark, isEN, compact=false }) {
  const d = dark;
  const p = rec?.patient || {};
  const m = rec?.metrics || {};
  const bm = ga?.best_metrics || {};

  // İlaç listesi
  const drugs = p.active_drugs || ga?.active_drugs || [];
  const drugLabels = {
    "6mp":"6-MP","mtx":"MTX","vcr":"VCR","daunorubicin":"DNR",
    "asparaginase":"PEG","corticosteroid":"CS","cytarabine":"Ara-C",
    "cyclophosphamide":"CPM","6tg":"6-TG","copanlisib":"COP","novobiocin":"NOV",
  };

  // Doz özeti
  const doses = rec?.doses || {};
  const d6mp  = doses["6mp_daily"];
  const avgD6mp = Array.isArray(d6mp) ? (d6mp.reduce((a,v)=>a+v,0)/d6mp.length).toFixed(1) : (d6mp||"—");

  // Protokol
  const protocol = ga?.protocol_key || "—";
  const engine   = ga?.engine || bm.engine || "—";
  const tEnd     = ga?.t_end;
  const nDays    = ga?.n_days;

  // Klinik
  const wbc0  = p.wbc0  || "—";
  const anc0  = p.anc0  || "—";
  const weight= p.weight_kg || "—";
  const age   = p.age   || "—";
  const tpmt  = p.tpmt  || "—";
  const vitD  = p.vitamin_d || "—";

  // Sonuç metrikleri
  const brr   = ga?.brr_d8  ?? bm.BRR_d8;
  const mrd   = ga?.eoi_mrd ?? bm.EOI_MRD;
  const vipn  = m.vipn_min  ?? bm.vipn_min;
  const wbcMin= m.wbc_min   ?? bm.wbc_min;
  const score = rec?.best_score;

  // Timeseries coverage
  const ts = rec?.timeseries || {};
  const targets = ["WBC","ANC","VIPN","Lt","CCS"].filter(k=>ts[k]?.length>0);
  const missingV2 = ["Lt","PEG_A","ASN","CCS"].filter(k=>!ts[k]?.length);

  const chip = (label, value, col="#6366f1") => value!=null&&value!=="—" ? (
    <span key={label} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
      d?"bg-slate-700 text-slate-300":"bg-slate-100 text-slate-600"}`}>
      <span className="opacity-60">{label}</span>
      <span className="font-semibold font-mono" style={{color:col}}>{value}</span>
    </span>
  ) : null;

  if (compact) return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tEnd&&chip("gün", tEnd+"g", "#94a3b8")}
      {weight!=="—"&&chip("kg", weight, "#94a3b8")}
      {age!=="—"&&chip("yaş", age, "#94a3b8")}
      {brr!=null&&chip("BRR", brr.toFixed(1)+"%", "#10b981")}
      {mrd!=null&&chip("MRD", mrd.toExponential(1), "#6366f1")}
      {vipn!=null&&chip("VIPN", vipn.toFixed(2), vipn>=0.70?"#10b981":"#ef4444")}
      {missingV2.length>0&&(
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
          ⚠ eksik: {missingV2.join(",")}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-1.5 mt-2">
      {/* Protokol ve motor */}
      <div className="flex flex-wrap gap-1">
        {protocol!=="—"&&chip("protokol", protocol, "#818cf8")}
        {chip("motor", engine==="full_drug_48dim"?"10-ilaç":engine, engine==="full_drug_48dim"?"#10b981":"#f59e0b")}
        {tEnd&&chip("süre", tEnd+"g", "#94a3b8")}
      </div>
      {/* Hasta */}
      <div className="flex flex-wrap gap-1">
        {chip("kilo", weight+"kg", "#94a3b8")}
        {chip("yaş", age+"y", "#94a3b8")}
        {chip("TPMT", tpmt, "#94a3b8")}
        {chip("WBC₀", wbc0, "#1e40af")}
        {chip("ANC₀", anc0, "#065f46")}
        {vitD!=="—"&&chip("VitD", vitD, "#94a3b8")}
      </div>
      {/* Doz özeti */}
      {avgD6mp!=="—"&&(
        <div className="flex flex-wrap gap-1">
          {chip("6-MP ort", avgD6mp+"mg", "#be123c")}
        </div>
      )}
      {/* Sonuç */}
      <div className="flex flex-wrap gap-1">
        {brr!=null&&chip("BRR_d8", brr.toFixed(1)+"%", "#10b981")}
        {mrd!=null&&chip("EOI_MRD", mrd.toExponential(2), "#6366f1")}
        {vipn!=null&&chip("VIPN_min", vipn.toFixed(3), vipn>=0.70?"#10b981":"#ef4444")}
        {wbcMin!=null&&chip("WBC_min", wbcMin.toFixed(3), "#1e40af")}
        {score!=null&&chip("score", score.toFixed(1), "#818cf8")}
      </div>
      {/* İlaçlar */}
      {drugs.length>0&&(
        <div className="flex flex-wrap gap-1">
          {drugs.map(d2=>(
            <span key={d2} className={`px-1.5 py-0.5 rounded text-xs ${d?"bg-indigo-500/20 text-indigo-300":"bg-indigo-100 text-indigo-600"}`}>
              {drugLabels[d2]||d2}
            </span>
          ))}
        </div>
      )}
      {/* Timeseries coverage */}
      <div className="flex flex-wrap gap-1">
        {targets.map(k=>(
          <span key={k} className={`px-1 py-0.5 rounded text-xs ${d?"bg-emerald-500/20 text-emerald-400":"bg-emerald-100 text-emerald-700"}`}>✓{k}</span>
        ))}
        {missingV2.map(k=>(
          <span key={k} className={`px-1 py-0.5 rounded text-xs ${d?"bg-amber-500/20 text-amber-400":"bg-amber-100 text-amber-700"}`}>⚠{k}</span>
        ))}
      </div>
    </div>
  );
}

// ── Plotly lazy loader ──────────────────────────────────────────────────────
function usePlotly() {
  const [ready, setReady] = useState(!!window.Plotly);
  useEffect(() => {
    if (window.Plotly) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.plot.ly/plotly-2.26.0.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ── Plotly GNN Karşılaştırma Grafiği ───────────────────────────────────────
function GNNCompareChart({ dark, phaseList, gaData, gnnData, targetKey, color, title, targetBand, threshold, isEN }) {
  const ref   = useRef(null);
  const ready = usePlotly();

  useEffect(() => {
    if (!ready || !ref.current) return;
    const gaVals  = gaData?.[targetKey]  || [];
    const gnnVals = gnnData?.[targetKey] || [];
    const t       = gaData?.t || Array.from({length: gaVals.length}, (_,i) => i);
    if (!gaVals.length && !gnnVals.length) return;

    const bg  = dark ? "#111827" : "#fff";
    const gc  = dark ? "#374151" : "#e5e7eb";
    const tc  = dark ? "#d1d5db" : "#374151";
    const tEnd = t[t.length-1] || 250;

    const phases = phaseList?.length > 0 ? phaseList : [
      {name:"İndüksiyon",start:0,end:29},
      {name:"Konsolidasyon",start:29,end:84},
      {name:"Re-indüksiyon",start:84,end:140},
      {name:"İdame",start:140,end:tEnd},
    ].filter(p => p.start < tEnd);

    const phA = dark ? "0.10" : "0.12";
    const phC = [
      `rgba(239,68,68,${phA})`,`rgba(245,158,11,${phA})`,
      `rgba(168,85,247,${phA})`,`rgba(16,185,129,${phA})`,
      `rgba(59,130,246,${phA})`,`rgba(236,72,153,${phA})`,
    ];

    const shapes = phases.map((ph,i) => ({
      type:"rect", xref:"x", yref:"paper",
      x0:ph.start, x1:Math.min(ph.end, tEnd), y0:0, y1:1,
      fillcolor:phC[i%phC.length], line:{width:0}, layer:"below",
    }));

    if (targetBand) {
      shapes.push({type:"rect", xref:"paper", yref:"y",
        x0:0, x1:1, y0:targetBand[0], y1:targetBand[1],
        fillcolor:dark?"rgba(100,200,100,0.08)":"rgba(100,200,100,0.12)",
        line:{width:0}});
    }
    if (threshold != null) {
      shapes.push({type:"line", xref:"paper", yref:"y",
        x0:0, x1:1, y0:threshold, y1:threshold,
        line:{color:"#f59e0b", width:1.5, dash:"dash"}});
    }

    const annotations = phases.map((ph,i) => {
      const fc=["#C62828","#E65100","#6A1B9A","#2E7D32","#1B3A6B","#9D174D"][i%6];
      return {
        x:(ph.start+ph.end)/2, y:1.06, xref:"x", yref:"paper",
        text:ph.name||`P${i+1}`, showarrow:false,
        yanchor:"bottom", font:{color:fc, size:9},
      };
    }).filter(a => a.x <= tEnd);

    // R² hesapla
    let r2Label = "";
    if (gaVals.length && gnnVals.length) {
      const n = Math.min(gaVals.length, gnnVals.length);
      const mean = gaVals.slice(0,n).reduce((a,v)=>a+v,0)/n;
      const ssTot = gaVals.slice(0,n).reduce((a,v)=>a+(v-mean)**2,0);
      const ssRes = gnnVals.slice(0,n).reduce((a,v,i)=>a+(gaVals[i]-v)**2,0);
      if (ssTot > 1e-12) {
        const r2 = Math.max(0, 1-ssRes/ssTot);
        r2Label = ` — R²=${r2.toFixed(3)}`;
      }
    }

    const traces = [];
    if (gaVals.length) {
      traces.push({
        x:t, y:gaVals, name:isEN?"GA/ODE (real)":"GA/ODE (gerçek)",
        line:{color, width:2.5}, mode:"lines",
        hovertemplate:`<b>${isEN?"Day":"Gün"} %{x:.0f}</b><br>${targetKey}: %{y:.4f}<extra></extra>`,
      });
    }
    if (gnnVals.length) {
      traces.push({
        x:t, y:gnnVals, name:isEN?"GNN (predicted)":"GNN (tahmin)",
        line:{color:"#f97316", width:2.0, dash:"dash"}, mode:"lines",
        hovertemplate:`<b>${isEN?"Day":"Gün"} %{x:.0f}</b><br>GNN: %{y:.4f}<extra></extra>`,
      });
    }

    window.Plotly.newPlot(ref.current, traces, {
      paper_bgcolor:bg, plot_bgcolor:bg,
      font:{color:tc, size:11, family:"system-ui,sans-serif"},
      margin:{t:75, b:50, l:70, r:30, pad:4},
      title:{text:(title||targetKey)+r2Label, font:{size:12,color:tc}, x:0.02, xanchor:"left"},
      xaxis:{title:{text:isEN?"Day":"Gün",standoff:12}, gridcolor:gc, range:[0, tEnd*1.02]},
      yaxis:{title:{text:targetKey,standoff:12}, gridcolor:gc},
      shapes, annotations,
      legend:{orientation:"h", x:0, y:1.22, xanchor:"left", yanchor:"bottom", font:{size:10}},
      hovermode:"x unified",
    },{
      responsive:true, displayModeBar:true,
      modeBarButtonsToRemove:["lasso2d","select2d","autoScale2d"],
      toImageButtonOptions:{format:"png",filename:`sting_gnn_${targetKey.toLowerCase()}_${Date.now()}`,scale:2},
    });
  }, [ready, gaData, gnnData, dark, isEN, phaseList, targetKey]);

  return <div ref={ref} style={{width:"100%",height:300}} className="rounded-xl overflow-hidden"/>;
}

const TC = {
  WBC:{col:"#1e40af",lbl:"WBC (G/L)"},
  ANC:{col:"#065f46",lbl:"ANC (G/L)"},
  VIPN_N:{col:"#7c3aed",lbl:"VIPN N(t)"},
  Lt:{col:"#be123c",lbl:"Lösemi Yükü Lt"},
  PEG_A:{col:"#0891b2",lbl:"PEG_A (IU/L)"},
  ASN:{col:"#15803d",lbl:"Asparagin"},
  cum_DNR_mgm2:{col:"#b45309",lbl:"Küm. DNR (mg/m²)"},
  CCS:{col:"#0f766e",lbl:"Kortizol CCS"},
};

function phaseColor(name) {
  const n=(name||"").toLowerCase();
  if(n.includes("ind")&&!n.includes("re")) return "#fecaca";
  if(n.includes("cons")||n.includes("kons")) return "#fde68a";
  if(n.includes("re")) return "#ddd6fe";
  if(n.includes("maint")||n.includes("idame")) return "#bbf7d0";
  const c=["#fecaca","#fde68a","#ddd6fe","#bbf7d0","#bfdbfe","#fbcfe8"];
  return c[Math.abs([...name].reduce((a,ch)=>a+ch.charCodeAt(0),0))%c.length];
}

// ── Protokol Grafik ─────────────────────────────────────────────────────────
function ProtocolChart({ dark, phaseList, odeData, gnnData, targetKey, height=120 }) {
  const d=dark;
  const odeVals = odeData?.[targetKey]||[];
  const gnnVals = gnnData?.[targetKey]||[];
  const t       = odeData?.t||gnnData?.t||[];
  const allVals = [...odeVals,...gnnVals].filter(v=>v!=null&&isFinite(v));
  if(!allVals.length) return null;

  const W=480,H=height,pad={t:14,r:10,b:22,l:42};
  const iW=W-pad.l-pad.r,iH=H-pad.t-pad.b;
  const tEnd=phaseList?.length?phaseList[phaseList.length-1].end:t.length?t[t.length-1]:250;
  const mn=Math.min(...allVals),mx=Math.max(...allVals),rng=mx-mn||1;
  const tx=ti=>pad.l+(ti/tEnd)*iW;
  const vy=v=>pad.t+iH-((v-mn)/rng)*iH;
  const makePath=(vals,tArr)=>{
    if(!vals.length)return"";
    const step=Math.max(1,Math.floor(vals.length/200));
    return vals.filter((_,i)=>i%step===0).map((v,i)=>{
      const ti=tArr?.[i*step]??((i*step/(vals.length-1))*tEnd);
      return `${i===0?"M":"L"}${tx(ti).toFixed(1)},${vy(v).toFixed(1)}`;
    }).join(" ");
  };
  const {col,lbl}=TC[targetKey]||{col:"#6366f1",lbl:targetKey};

  let r2=null;
  if(odeVals.length&&gnnVals.length){
    const n=Math.min(odeVals.length,gnnVals.length);
    const mean=odeVals.slice(0,n).reduce((a,v)=>a+v,0)/n;
    const ssTot=odeVals.slice(0,n).reduce((a,v)=>a+(v-mean)**2,0);
    const ssRes=gnnVals.slice(0,n).reduce((a,v,i)=>a+(odeVals[i]-v)**2,0);
    r2=ssTot>1e-12?Math.max(0,1-ssRes/ssTot):null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold" style={{color:col}}>{lbl}</p>
        {r2!=null&&(
          <span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${
            r2>=0.95?"bg-emerald-500/20 text-emerald-400"
            :r2>=0.80?"bg-amber-500/20 text-amber-400"
            :"bg-red-500/20 text-red-400"}`}>
            R²={r2.toFixed(3)}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
        {(phaseList||[]).map((ph,i)=>(
          <rect key={i} x={tx(ph.start)} y={pad.t}
            width={Math.max(0,tx(ph.end)-tx(ph.start))} height={iH}
            fill={phaseColor(ph.name)} opacity="0.28"/>
        ))}
        {(phaseList||[]).map((ph,i)=>(
          <text key={i} x={(tx(ph.start)+tx(ph.end))/2} y={pad.t+9}
            textAnchor="middle" fontSize="6.5" fontFamily="system-ui"
            fill={d?"#64748b":"#94a3b8"} opacity="0.8">{ph.name}</text>
        ))}
        {[0,0.5,1].map(f=>(
          <line key={f} x1={pad.l} y1={pad.t+iH*(1-f)} x2={pad.l+iW} y2={pad.t+iH*(1-f)}
            stroke={d?"#1e293b":"#e2e8f0"} strokeWidth="0.6"/>
        ))}
        {odeVals.length>0&&(
          <path d={makePath(odeVals,t)} fill="none" stroke={col} strokeWidth="2.0" opacity="0.9"/>
        )}
        {gnnVals.length>0&&(
          <path d={makePath(gnnVals,t)} fill="none" stroke="#f97316"
            strokeWidth="1.6" strokeDasharray="5,3" opacity="0.85"/>
        )}
        {[mn,mx].map((v,i)=>(
          <text key={i} x={pad.l-3} y={i===0?pad.t+iH:pad.t+8}
            textAnchor="end" fontSize="7.5" fill={d?"#94a3b8":"#64748b"}
            fontFamily="monospace">{v.toFixed(2)}</text>
        ))}
        <text x={W-pad.r} y={H-3} textAnchor="end" fontSize="7"
          fill={d?"#475569":"#94a3b8"}>Gün</text>
      </svg>
    </div>
  );
}

// ── GNN v2 Mimari Görsel ────────────────────────────────────────────────────
function GNNv2ArchViz({ dark, phase="idle", epoch=0, maxEpoch=150, curLoss=null }) {
  const d=dark,run=phase==="training",done=phase==="done";
  const animRef=useRef(null);
  const [tick,setTick]=useState(0);
  useEffect(()=>{
    if(!run){cancelAnimationFrame(animRef.current);return;}
    const loop=()=>{setTick(t=>t+1);animRef.current=requestAnimationFrame(loop);};
    animRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(animRef.current);
  },[run]);
  const t=tick/60,pct=maxEpoch>0?Math.min(epoch/maxEpoch,1):0;
  const bg=d?"#070d1a":"#f0f4ff";
  const LED=["#38bdf8","#818cf8","#a78bfa","#f97316","#34d399"];
  const lc=(o=0)=>done?"#34d399":run?LED[Math.floor((t*0.7+o)%LED.length)]:"#334155";
  const W=680,H=200;
  const nodes=[{x:55,y:44},{x:95,y:28},{x:140,y:44},{x:158,y:88},{x:140,y:132},{x:95,y:148},{x:50,y:132},{x:28,y:88}];
  const edges=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,3],[1,4],[2,5],[3,6],[0,4],[1,5]];
  const msgIdx=run?Math.floor(t*2.5)%nodes.length:-1;
  const Box=({x,y=30,w,h=135,col,label,sub})=>{
    const ls=(label||"").split("\n");
    return <g>
      <rect x={x} y={y} width={w} height={h} rx="9"
        fill={d?`${col}14`:`${col}10`} stroke={col}
        strokeWidth={run?1.8:done?1.5:0.7} strokeOpacity={run||done?1:0.3}/>
      {ls.map((l,i)=><text key={i} x={x+w/2} y={y+h/2+(i-ls.length/2+0.5)*13}
        textAnchor="middle" fontSize="8.5" fontWeight="700" fill={col}
        fontFamily="system-ui" opacity={run||done?1:0.45}>{l}</text>)}
      {sub&&<text x={x+w/2} y={y+h-9} textAnchor="middle" fontSize="6.5"
        fill={d?"#475569":"#64748b"} fontFamily="monospace" opacity="0.6">{sub}</text>}
    </g>;
  };
  const Arr=({x1,y1,x2,y2,col})=>{
    const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1,ux=dx/len,uy=dy/len;
    return <g>
      <line x1={x1} y1={y1} x2={x2-ux*6} y2={y2-uy*6}
        stroke={col} strokeWidth="1.4" opacity={run||done?0.8:0.2}/>
      <polygon points={`${x2},${y2} ${x2-ux*8-uy*3.5},${y2-uy*8+ux*3.5} ${x2-ux*8+uy*3.5},${y2-uy*8-ux*3.5}`}
        fill={col} opacity={run||done?0.8:0.2}/>
    </g>;
  };
  return (
    <div className={`rounded-2xl overflow-hidden border ${d?"border-slate-700":"border-indigo-200"}`}
         style={{background:bg,boxShadow:run?"0 0 30px rgba(129,140,248,0.10)":"none"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
        {Array.from({length:10}).map((_,i)=>(
          <line key={i} x1={0} y1={i*20} x2={W} y2={i*20}
            stroke={d?"#0d1829":"#e8f0fe"} strokeWidth="0.4"/>
        ))}
        {run&&Array.from({length:7}).map((_,i)=>{
          const fx=170+((t*16+i*120)%(W-190)),fy=18+Math.abs(Math.sin(t*0.5+i*1.4))*155;
          return <text key={i} x={fx} y={fy} fontSize="6.5" fontFamily="monospace"
            fill={LED[i%LED.length]} opacity={0.10+0.14*Math.abs(Math.sin(t*0.4+i))}>
            {(Math.abs(Math.sin(t+i*0.9))*9.99).toFixed(2)}</text>;
        })}
        <rect x={10} y={16} width={168} height={172} rx="11"
          fill={d?"#0d1829":"#e8f0fe"} opacity="0.45"/>
        <text x={94} y={13} textAnchor="middle" fontSize="7.5" fontWeight="700"
          fill={lc(0)} fontFamily="system-ui" opacity={run||done?0.9:0.4}>Patient Graph</text>
        <text x={94} y={H-4} textAnchor="middle" fontSize="6"
          fill={d?"#475569":"#64748b"} fontFamily="monospace" opacity="0.6">30 features · k=3 lag</text>
        {edges.map(([a,b],i)=>{
          const na=nodes[a],nb=nodes[b],act=run&&(a===msgIdx||b===msgIdx);
          return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke={act?lc(i*0.3):d?"#1e3a5f":"#bfdbfe"} strokeWidth={act?2.5:0.9} opacity={act?1.0:0.35}/>;
        })}
        {nodes.map((n,i)=>{
          const act=run&&i===msgIdx,col=lc(i*0.4);
          return <g key={i}>
            {act&&<circle cx={n.x} cy={n.y} r={16} fill={col} opacity="0.07">
              <animate attributeName="r" values="8;22;8" dur="0.6s" repeatCount="indefinite"/>
            </circle>}
            <circle cx={n.x} cy={n.y} r={act?9:7}
              fill={d?`${col}20`:`${col}15`} stroke={col}
              strokeWidth={act?2:1.1} opacity={run||done?1:0.45}/>
            <text x={n.x} y={n.y+3} textAnchor="middle" fontSize="6"
              fill={col} fontFamily="monospace" fontWeight="700"
              opacity={run||done?0.9:0.45}>t{i}</text>
          </g>;
        })}
        <Arr x1={180} y1={H/2} x2={205} y2={H/2} col={lc(0)}/>
        <Box x={205} w={80} col={lc(0)} label={"GCNConv\n1"} sub="h=256"/>
        <Arr x1={285} y1={H/2} x2={308} y2={H/2} col={lc(1)}/>
        <Box x={308} w={80} col={lc(1)} label={"GCNConv\n2"} sub="h=256"/>
        <Arr x1={388} y1={H/2} x2={415} y2={H/2} col={lc(2)}/>
        <Box x={415} w={58} col={lc(2)} label={"Drop\n0.2"} sub=""/>
        <Arr x1={473} y1={H/2} x2={498} y2={H/2} col={lc(3)}/>
        <Box x={498} w={75} col={done?"#10b981":lc(3)} label={"Linear\nOutput"} sub="8 hedef"/>
        {[{x:245,l:"ReLU(GCN₁)",c:lc(0)},{x:348,l:"ReLU(GCN₂)",c:lc(1)},
          {x:444,l:"drop(0.2)",c:lc(2)},{x:535,l:"ŷ∈ℝ⁸",c:done?"#10b981":lc(3)}
        ].map(({x,l,c})=>(
          <text key={x} x={x} y={H-4} textAnchor="middle" fontSize="6.5"
            fill={c} fontFamily="monospace" opacity={run||done?0.75:0.35}>{l}</text>
        ))}
        {(run||done)&&<>
          <rect x={10} y={5} width={W-20} height={2.5} rx="1.2" fill={d?"#1e293b":"#dde7ff"}/>
          <rect x={10} y={5} width={(W-20)*pct} height={2.5} rx="1.2"
            fill={done?"#10b981":"#818cf8"}/>
          <text x={W-12} y={11} textAnchor="end" fontSize="6.5" fontFamily="monospace"
            fill={done?"#10b981":"#818cf8"} opacity="0.8">{epoch}/{maxEpoch}</text>
          {curLoss!=null&&<text x={14} y={11} fontSize="6.5" fontFamily="monospace"
            fill={done?"#10b981":"#94a3b8"} opacity="0.8">loss={curLoss.toFixed(5)}</text>}
        </>}
        {done&&<g transform={`translate(${W-18},13)`}>
          <circle r="7" fill="#10b981" opacity="0.9"/>
          <text x={0} y={3.5} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">✓</text>
        </g>}
      </svg>
    </div>
  );
}

// ── Pool Paneli ─────────────────────────────────────────────────────────────
function PoolPanel({ dark, isEN }) {
  const d=dark;
  const [stats,setStats]=useState(null);
  const refresh=useCallback(()=>{apiGet("/gnn/pool/stats").then(setStats).catch(()=>{});},[]);
  useEffect(()=>{
    refresh();
    window.addEventListener("sting:pool_updated",refresh);
    return()=>window.removeEventListener("sting:pool_updated",refresh);
  },[refresh]);
  const card=`rounded-2xl border p-4 ${d?"bg-slate-900 border-slate-700":"bg-white border-indigo-100 shadow-sm"}`;
  return (
    <div className={card}>
      <p className={`text-xs font-bold mb-2 ${d?"text-slate-400":"text-slate-600"}`}>
        📊 {isEN?"GNN Training Pool (GA Results)":"GNN Eğitim Havuzu (GA Sonuçları)"}
      </p>
      {stats?(
        <div className="space-y-2">
          <div className="flex gap-3 flex-wrap text-xs">
            {[[isEN?"Total":"Toplam",stats.total,"#6366f1"],
              ["GA",stats.ga||0,"#10b981"],
              [isEN?"Upload":"Yüklü",stats.uploaded||0,"#f59e0b"]
            ].map(([l,v,c])=>(
              <div key={l} className={`rounded-xl px-3 py-1.5 ${d?"bg-slate-800":"bg-slate-50"}`}>
                <span className={d?"text-slate-400":"text-slate-500"}>{l}: </span>
                <span className="font-bold" style={{color:c}}>{v}</span>
              </div>
            ))}
          </div>
          {(stats.total||0)===0
            ?<p className={`text-xs ${d?"text-amber-400":"text-amber-600"}`}>
                ⚠ {isEN?"Run GA optimizations in Tab 4 to populate the pool.":"Tab 4'te GA optimizasyonu çalıştırarak havuzu doldurun."}
              </p>
            :<p className={`text-xs ${d?"text-indigo-300":"text-indigo-600"}`}>
                {isEN
                  ?`${stats.total} records available for GNN v2 training.`
                  :`${stats.total} kayıt GNN v2 eğitimi için mevcut.`}
              </p>
          }
        </div>
      ):(
        <p className={`text-xs ${d?"text-slate-600":"text-slate-400"}`}>Yükleniyor…</p>
      )}
    </div>
  );
}

// ── Hazır Model Paneli ──────────────────────────────────────────────────────
function PretrainedModelPanel({ dark, isEN }) {
  const d=dark;
  const [status,   setStatus]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [uploading,setUploading]= useState(false);
  const [uploadMsg,setUploadMsg]= useState(null);
  const fileRef = useRef(null);

  const fetchStatus = useCallback(()=>{
    setLoading(true);
    apiGet("/gnn/v2/status").then(setStatus).catch(()=>setStatus({status:"error"})).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{ fetchStatus(); },[fetchStatus]);

  const handleUpload = async(e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    setUploading(true); setUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE}/gnn/v2/upload-model`, {
        method:"POST",
        headers:{ Authorization:`Bearer ${tok()}` },
        body: formData,
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.detail||"Yükleme hatası");
      setUploadMsg({ok:true, msg:data.message});
      fetchStatus();
    } catch(e) {
      setUploadMsg({ok:false, msg:e.message});
    } finally {
      setUploading(false);
      if(fileRef.current) fileRef.current.value="";
    }
  };

  const ready = status?.status==="ready";
  const card=`rounded-2xl border p-5 ${d?"bg-slate-900 border-slate-700":"bg-white border-indigo-100 shadow-sm"}`;

  return (
    <div className={card}>
      <p className={`text-sm font-semibold mb-3 ${d?"text-slate-200":"text-slate-700"}`}>
        🤖 {isEN?"Active GNN v2 Model":"Aktif GNN v2 Modeli"}
      </p>

      {/* Model durumu */}
      <div className={`rounded-xl border p-3 mb-3 ${
        ready
          ?(d?"bg-emerald-500/10 border-emerald-500/20":"bg-emerald-50 border-emerald-200")
          :(d?"bg-amber-500/10 border-amber-500/20":"bg-amber-50 border-amber-200")}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm ${ready?"text-emerald-400":"text-amber-400"}`}>
            {ready?"✓":"⚠"}
          </span>
          <span className={`text-xs font-semibold ${
            ready?(d?"text-emerald-300":"text-emerald-700"):(d?"text-amber-300":"text-amber-700")}`}>
            {ready
              ?(isEN?"Pre-trained model loaded (trained_alldrugs_gnn_model.pth)":"Hazır model yüklü (trained_alldrugs_gnn_model.pth)")
              :(isEN?"Model not found":"Model bulunamadı")}
          </span>
        </div>
        {ready&&(
          <div className="space-y-1.5 mt-1">
            <div className="flex gap-3 flex-wrap text-xs">
              <span className={d?"text-slate-400":"text-slate-500"}>
                {isEN?"Features:":"Özellik:"} <span className="font-mono font-bold">{status.n_features}</span>
              </span>
              <span className={d?"text-slate-400":"text-slate-500"}>
                {isEN?"Targets:":"Hedef:"} <span className="font-mono font-bold">{status.n_targets}</span>
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${d?"bg-indigo-500/20 text-indigo-300":"bg-indigo-100 text-indigo-700"}`}>
                meanR²≈0.996
              </span>
            </div>
            <p className={`text-xs ${d?"text-slate-400":"text-slate-500"}`}>
              {isEN
                ?"GAN-based synthetic patient generation in the next tab will be validated through this model."
                :"Sonraki aşamadaki GAN tabanlı sentetik hasta üretimi bu model üzerinden teyit edilecektir."}
            </p>
          </div>
        )}
        {!ready&&(
          <p className={`text-xs mt-1 ${d?"text-amber-300":"text-amber-600"}`}>
            {isEN
              ?"Copy trained_alldrugs_gnn_model.pth and alldrugs_gnn_scaler.json to backend/data/models/"
              :"trained_alldrugs_gnn_model.pth ve alldrugs_gnn_scaler.json dosyalarını backend/data/models/ klasörüne kopyalayın."}
          </p>
        )}
      </div>

      {/* Model yükleme */}
      <div className={`rounded-xl border p-3 ${d?"border-slate-700 bg-slate-800/40":"border-slate-200 bg-slate-50"}`}>
        <p className={`text-xs font-semibold mb-2 ${d?"text-slate-300":"text-slate-600"}`}>
          📤 {isEN?"Upload Custom Model (.pth)":"Özel Model Yükle (.pth)"}
        </p>
        <p className={`text-xs mb-2 ${d?"text-slate-500":"text-slate-400"}`}>
          {isEN
            ?"Upload your own trained GNN v2 model to replace the pre-trained one."
            :"Kendi eğittiğiniz GNN v2 modelini hazır modelin yerine yükleyin."}
        </p>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".pth" onChange={handleUpload}
            className="hidden" id="gnn-model-upload"/>
          <label htmlFor="gnn-model-upload"
            className={`cursor-pointer text-xs px-4 py-1.5 rounded-xl font-medium transition-all border ${
              uploading?"opacity-50 cursor-not-allowed ":""
            }${d?"bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30"
                :"bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"}`}>
            {uploading?"Yükleniyor…":"📁 Dosya Seç"}
          </label>
          <button onClick={fetchStatus} disabled={loading}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
              d?"text-slate-400 border-slate-700 hover:border-slate-600":"text-slate-500 border-slate-200 hover:border-slate-300"}`}>
            {loading?"…":"↺"}
          </button>
          <button onClick={async()=>{
            try {
              const res = await apiGet("/gnn/v2/reset-to-default");
              alert(res.message);
              fetchStatus();
            } catch(e){ alert(e.message); }
          }} className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
            d?"bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500"
             :"bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"}`}>
            ↩ {isEN?"Restore Default":"Varsayılan Modele Dön"}
          </button>
        </div>
        {uploadMsg&&(
          <p className={`text-xs mt-2 ${uploadMsg.ok?(d?"text-emerald-400":"text-emerald-600"):(d?"text-red-400":"text-red-600")}`}>
            {uploadMsg.ok?"✓":"✗"} {uploadMsg.msg}
          </p>
        )}
      </div>
    </div>
  );
}


// ── Eğitim Pool Paneli — detaylı GA listesi, dışla/sil seçenekleri ─────────
function TrainPoolPanel({ dark, isEN, config }) {
  const d = dark;
  const [records,   setRecords]   = useState([]);
  const [excluded,  setExcluded]  = useState(new Set());
  const [loading,   setLoading]   = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [stats,     setStats]     = useState(null);
  const [gaInfo,    setGaInfo]    = useState({});

  const refresh = useCallback(()=>{
    setLoading(true);
    Promise.all([
      apiGet("/gnn/pool/list?limit=100"),
      apiGet("/gnn/pool/stats"),
      apiGet("/ga/results"),
    ]).then(([list, st, gaRes])=>{
      setRecords(list.records||[]);
      setStats(st);
      // GA results → her pool kaydına session_name, BRR, t_end ekle
      const gaMap = {};
      (gaRes.results||[]).forEach(g=>{ gaMap[g.job_id]=g; });
      setGaInfo(gaMap);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{ refresh(); },[refresh]);

  const handleExclude = (rid) => {
    setExcluded(prev => {
      const next = new Set(prev);
      next.has(rid) ? next.delete(rid) : next.add(rid);
      return next;
    });
  };

  const handleDelete = async(rid) => {
    if(!window.confirm(isEN?"Delete this record from the pool?":"Bu kaydı havuzdan tamamen sil?")) return;
    setDeleting(rid);
    try {
      await api(`/gnn/pool/${rid}`, {method:"DELETE"});
      setRecords(r => r.filter(x => x.record_id !== rid));
      setExcluded(prev => { const n=new Set(prev); n.delete(rid); return n; });
    } catch(e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const cfgProtocol = config?.protocol_key || "";
  const cfgDrugs    = config?.active_drugs  || [];

  const card = `rounded-2xl border p-4 ${d?"bg-slate-900 border-slate-700":"bg-white border-indigo-100 shadow-sm"}`;

  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className={`text-sm font-semibold ${d?"text-slate-200":"text-slate-700"}`}>
            📊 {isEN?"GNN Training Pool":"GNN Eğitim Havuzu"}
          </p>
          <p className={`text-xs mt-0.5 ${d?"text-slate-500":"text-slate-400"}`}>
            {isEN
              ?"Select which records to include in training. Excluded records are skipped."
              :"Eğitime hangi kayıtların dahil edileceğini seçin. Dışlanan kayıtlar atlanır."}
          </p>
        </div>
        <button onClick={refresh} disabled={loading}
          className={`text-xs px-3 py-1.5 rounded-xl border ${d?"border-slate-700 text-slate-400 hover:border-slate-600":"border-slate-200 text-slate-500 hover:border-slate-300"}`}>
          {loading?"…":"↺"}
        </button>
      </div>

      {/* İstatistikler */}
      {stats&&(
        <div className="flex gap-3 flex-wrap text-xs mb-3">
          {[[isEN?"Total":"Toplam",stats.total,"#6366f1"],
            [isEN?"In training":"Eğitimde",(records.length-excluded.size),"#10b981"],
            [isEN?"Excluded":"Dışlanan",excluded.size,"#f59e0b"],
          ].map(([l,v,c])=>(
            <div key={l} className={`rounded-xl px-3 py-1.5 ${d?"bg-slate-800":"bg-slate-50"}`}>
              <span className={d?"text-slate-400":"text-slate-500"}>{l}: </span>
              <span className="font-bold" style={{color:c}}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Kayıt listesi */}
      <div className="max-h-64 overflow-y-auto space-y-1">
        {loading&&!records.length&&(
          <p className={`text-xs ${d?"text-slate-600":"text-slate-400"}`}>Yükleniyor…</p>
        )}
        {!loading&&records.length===0&&(
          <p className={`text-xs ${d?"text-amber-400":"text-amber-600"}`}>
            ⚠ {isEN?"No pool records. Run GA optimization in Tab 4.":"Havuz boş. Tab 4'te GA optimizasyonu çalıştırın."}
          </p>
        )}
        {records.map((rec)=>{
          const rid        = rec.record_id;
          const isExcluded = excluded.has(rid);
          const isDeleting = deleting === rid;
          const ga         = gaInfo[rec.source_id] || {};
          const missingTargets = ["Lt","PEG_A","ASN","CCS"].filter(
            k => !rec.timeseries?.[k]?.length
          );
          const hasWarning = missingTargets.length > 0;

          return (
            <div key={rid} className={`rounded-xl border px-3 py-2 text-xs transition-all ${
              isExcluded
                ? (d ? "bg-slate-800/40 border-slate-700 opacity-50" : "bg-slate-50 border-slate-200 opacity-50")
                : (d ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")
            }`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono ${d ? "text-slate-300" : "text-slate-600"}`}>
                      {ga.session_name || (rid.slice(0,8) + "…")}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${d ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}>
                      {rec.source || "ga"}
                    </span>
                    <span className={d ? "text-slate-500" : "text-slate-400"}>
                      {rec.added_at ? rec.added_at.slice(0,10) : ""}
                    </span>
                  </div>
                  <GARecordDetail rec={rec} ga={ga} dark={d} isEN={isEN} compact={false}/>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={()=>handleExclude(rid)}
                    className={`text-xs px-2 py-1 rounded-lg border font-medium transition-all ${
                      isExcluded
                        ? (d ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-600 border-indigo-200")
                        : (d ? "bg-slate-700 text-slate-400 border-slate-600" : "bg-slate-50 text-slate-500 border-slate-200")
                    }`}>
                    {isExcluded ? (isEN ? "Include" : "Dahil Et") : (isEN ? "Exclude" : "Dışla")}
                  </button>
                  <button onClick={()=>handleDelete(rid)} disabled={isDeleting}
                    className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                      d ? "text-red-400 border-red-900/30 hover:bg-red-500/10" : "text-red-600 border-red-200 hover:bg-red-50"
                    } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {isDeleting ? "…" : (isEN ? "Delete" : "Sil")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dışlanan kayıt varsa bilgi */}
      {excluded.size>0&&(
        <div className={`mt-2 text-xs rounded-lg px-3 py-2 ${d?"bg-amber-500/10 text-amber-300 border border-amber-500/20":"bg-amber-50 text-amber-700 border border-amber-200"}`}>
          {isEN
            ?`${excluded.size} records excluded from training. Training will use ${records.length-excluded.size} records.`
            :`${excluded.size} kayıt eğitim dışı. Eğitim ${records.length-excluded.size} kayıt üzerinden yapılacak.`}
        </div>
      )}

      {/* excluded set'i dışarıya export — TrainingPanel bunu okuyabilmeli */}
      <input type="hidden" id="gnn-excluded-ids" value={JSON.stringify([...excluded])}/>
    </div>
  );
}


// ── Training Console V2 ─────────────────────────────────────────────────────
function TrainingConsoleV2({ dark, phase, epoch, maxEpoch, losses, trainResult, isEN, lr }) {
  const d = dark;
  const run  = phase === "training";
  const done = phase === "done";
  const fl   = trainResult?.final_loss ?? losses[losses.length-1];

  // Loss grafiği
  const LossChart = () => {
    if (losses.length < 2) return null;
    const W=400, H=90;
    const mn=Math.min(...losses), mx=Math.max(...losses), rng=mx-mn||0.001;
    const pts = losses.map((v,i) =>
      `${16+(i/(losses.length-1))*(W-32)},${H-14-((v-mn)/rng)*(H-28)}`
    ).join(" ");
    const firstLoss = losses[0], lastLoss = losses[losses.length-1];
    const improvement = firstLoss > 0 ? ((firstLoss-lastLoss)/firstLoss*100) : 0;
    const col = done ? "#10b981" : "#818cf8";
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className={`text-xs font-semibold ${d?"text-slate-400":"text-slate-600"}`}>
            {isEN ? "Loss Curve" : "Kayıp Eğrisi"}
          </p>
          {improvement > 0 && (
            <span className={`text-xs font-bold ${d?"text-emerald-400":"text-emerald-600"}`}>
              ↓ {improvement.toFixed(1)}% {isEN ? "improvement" : "iyileşme"}
            </span>
          )}
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`}
          style={{borderRadius:"10px", background:d?"#070d1a":"#f0f4ff", border:`1px solid ${d?"#1e293b":"#dde7ff"}`}}>
          {[0.25,0.5,0.75].map(r=>(
            <line key={r} x1={16} y1={14+r*(H-28)} x2={W-16} y2={14+r*(H-28)}
              stroke={d?"#0d1829":"#e8f0fe"} strokeWidth="1"/>
          ))}
          <defs>
            <linearGradient id="lcg2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={col}/>
              <stop offset="100%" stopColor={col} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <polyline
            points={`16,${H-14} ${pts} ${W-16},${H-14}`}
            fill="url(#lcg2)" opacity="0.12"/>
          <polyline points={pts} fill="none" stroke={col} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
          <text x={16} y={H-3} fontSize="7" fill={d?"#475569":"#94a3b8"} fontFamily="monospace">
            {firstLoss?.toFixed(5)}
          </text>
          <text x={W-16} y={H-3} textAnchor="end" fontSize="7" fill={col} fontFamily="monospace" fontWeight="bold">
            {lastLoss?.toFixed(5)}
          </text>
        </svg>
      </div>
    );
  };

  if (phase === "idle") return null;

  return (
    <div className={`rounded-2xl border font-mono text-xs overflow-hidden mt-3 ${d?"bg-[#070d1a] border-slate-700":"bg-[#f0f4ff] border-indigo-200"}`}>
      {/* Console header */}
      <div className={`flex items-center gap-2 px-4 py-2 border-b ${d?"border-slate-800 bg-[#0d1829]":"border-indigo-100 bg-[#e8f0fe]"}`}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400"/>
          <div className="w-3 h-3 rounded-full bg-amber-400"/>
          <div className="w-3 h-3 rounded-full bg-emerald-400"/>
        </div>
        <span className={`text-xs ${d?"text-slate-500":"text-indigo-400"}`}>
          gnn_v2_training_console — {run?"running...":done?"completed":"error"}
        </span>
        {run && <span className={`ml-auto ${d?"text-amber-400":"text-amber-600"}`}>● LIVE</span>}
        {done && <span className="ml-auto text-emerald-400">✓ DONE</span>}
      </div>

      <div className="p-4 space-y-3">
        {/* Log satırları */}
        <div className="space-y-0.5">
          <p className={d?"text-violet-400":"text-violet-600"}>
            {">>"} arch: GCNConv×2 hidden=256 dropout=0.2 | out=8 targets
          </p>
          <p className={d?"text-slate-400":"text-indigo-400"}>
            {">>"} ADAM lr={lr||0.001} weight_decay=1e-4 | k=3 lag | 30 features
          </p>
          <p className={d?"text-slate-400":"text-indigo-400"}>
            {">>"} targets: WBC ANC VIPN_N Lt PEG_A ASN cum_DNR_mgm2 CCS
          </p>
          {run && (
            <p className={d?"text-amber-400":"text-amber-600"}>
              {">>"} epoch {epoch}/{maxEpoch} — loss: {losses[losses.length-1]?.toFixed(6) ?? "..."}
            </p>
          )}
          {done && (
            <p className="text-emerald-400">
              {">>"} {isEN?"Training complete!":"Eğitim tamamlandı!"} final_loss={fl?.toFixed(6)}
            </p>
          )}
        </div>

        {/* Metrik grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {l:"final_loss",   v: fl?.toFixed(6) ?? "-",           c: done?"#10b981":"#818cf8"},
            {l:"n_graphs",     v: trainResult?.n_graphs ?? "-",     c: "#38bdf8"},
            {l:"epochs",       v: `${epoch}/${maxEpoch}`,           c: "#a78bfa"},
            {l:"n_records",    v: trainResult?.n_records ?? "-",    c: "#f97316"},
            {l:"hidden_dim",   v: 256,                               c: "#818cf8"},
            {l:"lr",           v: lr||0.001,                         c: "#f97316"},
            {l:"in_channels",  v: trainResult?.in_channels ?? 30,   c: "#38bdf8"},
            {l:"out_channels", v: trainResult?.out_channels ?? 8,   c: "#10b981"},
          ].map(({l,v,c}) => (
            <div key={l} className={`rounded-xl p-2 text-center border ${d?"border-slate-700 bg-slate-900":"border-indigo-100 bg-white"}`}>
              <p className="text-xs font-bold" style={{color:c}}>{v ?? "-"}</p>
              <p className={`text-xs mt-0.5 ${d?"text-slate-600":"text-slate-400"}`}>{l}</p>
            </div>
          ))}
        </div>

        {/* Loss grafiği */}
        <LossChart/>
      </div>
    </div>
  );
}

// ── Eğitim Paneli ───────────────────────────────────────────────────────────
function TrainingPanel({ dark, isEN, onTrainDone }) {
  const d=dark;
  const [phase,setPhase]=useState("idle");
  const [epoch,setEpoch]=useState(0);
  const [maxEpoch,setMaxEpoch]=useState(150);
  const [curLoss,setCurLoss]=useState(null);
  const [losses,setLosses]=useState([]);
  const [trainResult,setTrainResult]=useState(null);
  const [error,setError]=useState(null);
  const [epochs,    setEpochs]    = useState(150);
  const [lr,        setLr]        = useState(0.001);
  const [hiddenDim, setHiddenDim] = useState(256);
  const [dropout,   setDropout]   = useState(0.2);
  const abortRef=useRef(null);

  const handleStop=()=>{if(abortRef.current)abortRef.current.abort();setPhase("idle");setEpoch(0);setCurLoss(null);setLosses([]);};
  const handleTrain=async()=>{
    if(phase==="training"){handleStop();return;}
    abortRef.current=new AbortController();
    setPhase("training");setEpoch(0);setCurLoss(null);setError(null);setTrainResult(null);setMaxEpoch(epochs);
    try{
      const res=await fetch(`${BASE}/gnn/train-stream`,{
        method:"POST",headers:{Authorization:`Bearer ${tok()}`,"Content-Type":"application/json"},
        body:JSON.stringify({epochs,lr,use_v2:true,optimizer:"adam",weight_decay:1e-4,hidden_channels:hiddenDim,dropout}),
        signal:abortRef.current.signal,
      });
      if(!res.ok){const e=await res.json().catch(()=>({detail:"Hata"}));throw new Error(e.detail);}
      const reader=res.body.getReader();const dec=new TextDecoder();let buf="";
      while(true){
        const{done,value}=await reader.read();if(done)break;
        buf+=dec.decode(value,{stream:true});
        const lines=buf.split("\n");buf=lines.pop()||"";
        for(const line of lines){
          if(!line.startsWith("data:"))continue;
          try{
            const msg=JSON.parse(line.slice(5).trim());
            if(msg.type==="start"){setMaxEpoch(msg.epochs||epochs);setLosses([]);}
            else if(msg.type==="epoch"){setEpoch(msg.epoch);if(msg.loss!=null){setCurLoss(msg.loss);setLosses(h=>[...h,msg.loss]);}}
            else if(msg.type==="done"){setEpoch(msg.epochs||epochs);setPhase("done");setTrainResult(msg);setCurLoss(msg.final_loss);setLosses(msg.losses||[]);if(onTrainDone)onTrainDone(msg.job_id);}
            else if(msg.type==="error"){setError(msg.message);setPhase("error");}
          }catch{}
        }
      }
    }catch(e){if(e.name==="AbortError"){setPhase("idle");return;}setError(e.message);setPhase("error");}
  };
  useEffect(()=>()=>{if(abortRef.current)abortRef.current.abort();},[]);

  const card=`rounded-2xl border p-5 ${d?"bg-slate-900 border-slate-700":"bg-white border-indigo-100 shadow-sm"}`;
  return (
    <div className={card}>
      <p className={`text-sm font-semibold mb-1 ${d?"text-slate-200":"text-slate-700"}`}>
        🧠 {isEN?"Train GNN v2 on Pool Data":"Havuz Verisiyle GNN v2 Eğit"}
      </p>
      <p className={`text-xs mb-3 ${d?"text-slate-500":"text-slate-400"}`}>
        {isEN
          ?"GNN v2 learns 8-target ODE dynamics from your GA optimization pool records."
          :"GNN v2, GA optimizasyon havuz kayıtlarınızdan 8 hedefli ODE dinamiğini öğrenir."}
      </p>
      <GNNv2ArchViz dark={d} phase={phase} epoch={epoch} maxEpoch={maxEpoch} curLoss={curLoss}/>
      <div className="flex flex-wrap gap-3 mt-4 items-end">
        {/* Uyarı notu */}
        <div className={`w-full text-xs rounded-lg px-3 py-1.5 mb-1 ${d?"bg-amber-500/10 text-amber-400 border border-amber-500/20":"bg-amber-50 text-amber-700 border border-amber-200"}`}>
          ⚠ {isEN
            ?"Changing parameters beyond defaults may deviate from the validated model behavior."
            :"Varsayılan parametrelerin dışına çıkmak, doğrulanmış model davranışından sapmanıza yol açabilir."}
        </div>
        <div>
          <label className={`text-xs block mb-1 ${d?"text-slate-400":"text-slate-600"}`}>Epoch</label>
          <input type="number" value={epochs} min={10} max={500} step={10}
            onChange={e=>setEpochs(+e.target.value)}
            className={`w-20 border rounded-xl px-2 py-1.5 text-sm ${d?"bg-slate-800 border-slate-700 text-slate-200":"bg-white border-indigo-200"}`}/>
        </div>
        <div>
          <label className={`text-xs block mb-1 ${d?"text-slate-400":"text-slate-600"}`}>LR</label>
          <select value={lr} onChange={e=>setLr(+e.target.value)}
            className={`border rounded-xl px-2 py-1.5 text-sm ${d?"bg-slate-800 border-slate-700 text-slate-200":"bg-white border-indigo-200"}`}>
            {[0.0001,0.001,0.005,0.01].map(v=><option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={`text-xs block mb-1 ${d?"text-slate-400":"text-slate-600"}`}>
            {isEN?"Hidden Dim":"Gizli Katman"}
          </label>
          <select value={hiddenDim} onChange={e=>setHiddenDim(+e.target.value)}
            className={`border rounded-xl px-2 py-1.5 text-sm ${d?"bg-slate-800 border-slate-700 text-slate-200":"bg-white border-indigo-200"}`}>
            {[64,128,256,512].map(v=><option key={v} value={v}>{v}{v===256?" ✓":""}</option>)}
          </select>
        </div>
        <div>
          <label className={`text-xs block mb-1 ${d?"text-slate-400":"text-slate-600"}`}>Dropout</label>
          <select value={dropout} onChange={e=>setDropout(+e.target.value)}
            className={`border rounded-xl px-2 py-1.5 text-sm ${d?"bg-slate-800 border-slate-700 text-slate-200":"bg-white border-indigo-200"}`}>
            {[0.0,0.1,0.2,0.3,0.5].map(v=><option key={v} value={v}>{v}{v===0.2?" ✓":""}</option>)}
          </select>
        </div>
        <button onClick={handleTrain}
          className={`px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all ${
            phase==="training"?"bg-red-500 hover:bg-red-400"
            :"bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500"}`}>
          {phase==="training"?"⬛ Durdur":phase==="done"?"↺ Yeniden Eğit":"▶ Eğit"}
        </button>
      </div>
      {/* Training Console */}
      <TrainingConsoleV2 dark={d} isEN={isEN} phase={phase}
        epoch={epoch} maxEpoch={maxEpoch} losses={losses}
        trainResult={trainResult} lr={lr}/>
      {trainResult&&(
        <div className={`mt-3 rounded-xl px-3 py-2 text-xs ${d?"bg-emerald-500/10 border border-emerald-500/20 text-emerald-300":"bg-emerald-50 border border-emerald-200 text-emerald-700"}`}>
          ✓ Eğitim tamamlandı · final_loss={trainResult.final_loss?.toFixed(6)} · {trainResult.n_graphs} graf
        </div>
      )}
      {trainResult&&(
        <div className={`mt-2 rounded-xl px-3 py-2 text-xs space-y-2 ${d?"bg-indigo-500/10 border border-indigo-500/20 text-indigo-300":"bg-indigo-50 border border-indigo-200 text-indigo-700"}`}>
          <p>💡 {isEN
            ?"To use this model: download it below, switch to 'Use Pre-trained Model' mode, then upload via 'Upload Custom Model'."
            :"Bu modeli kullanmak için: aşağıdan indirin, 'Hazır Modeli Kullan' moduna geçin, ardından 'Özel Model Yükle' bölümünden yükleyin."}</p>
          {trainResult.job_id&&(
            <button onClick={async()=>{
              try {
                const res = await fetch(`/api/v1/gnn/v2/download-model/${trainResult.job_id}`,
                  {headers:{Authorization:`Bearer ${tok()}`}});
                if(!res.ok) throw new Error("İndirme başarısız");
                const blob = await res.blob();
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href     = url;
                a.download = `gnn_v2_model_${(trainResult.job_id||"").slice(0,8)}.pth`;
                a.click();
                URL.revokeObjectURL(url);
              } catch(e){ alert(e.message); }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              d?"bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-500/30"
               :"bg-indigo-100 text-indigo-700 border border-indigo-300 hover:bg-indigo-200"}`}>
              ⬇ {isEN?"Download Model (.pth)":"Modeli İndir (.pth)"}
            </button>
          )}
          {trainResult.model_path&&(
            <p className="font-mono text-xs opacity-60">📁 {trainResult.model_path}</p>
          )}
        </div>
      )}
      {error&&<p className={`mt-2 text-xs ${d?"text-red-400":"text-red-600"}`}>✗ {error}</p>}
    </div>
  );
}


// ── GA Liste Satırı (protokol uyumluluk dahil) ─────────────────────────────
function GAListItem({ item, selected, onSelect, dark, isEN, cfgProtocol, cfgDrugs }) {
  const d = dark;
  const itemProtocol = item.protocol_key || item.best_metrics?.protocol_key || "";
  const itemEngine   = item.engine || item.best_metrics?.engine || "";
  const itemDrugs    = item.active_drugs || [];
  const isOldEngine  = itemEngine && itemEngine !== "full_drug_48dim";
  const protocolMismatch = cfgProtocol && itemProtocol && cfgProtocol !== itemProtocol;
  // İlaç uyumsuzluğu: config'de var ama kayıtta yok
  const missingDrugs = cfgDrugs.filter(d =>
    d !== "corticosteroid" && itemDrugs.length > 0 && !itemDrugs.includes(d)
  );
  const drugMismatch = missingDrugs.length > 0;
  const hasWarning = isOldEngine || protocolMismatch || drugMismatch;
  const warningTitle = [
    isOldEngine ? "Eski motor — GNN uyumu sınırlı" : "",
    protocolMismatch ? `Protokol: seçili=${cfgProtocol}, kayıt=${itemProtocol}` : "",
    drugMismatch ? `Kayıtta eksik ilaçlar: ${missingDrugs.join(", ")}` : "",
  ].filter(Boolean).join(" | ");
  const isSelected = selected?.job_id === item.job_id;

  const cls = `w-full text-left rounded-xl px-3 py-2 text-xs transition-all border mb-1 ${
    isSelected
      ?(d?"bg-indigo-600/20 border-indigo-500 text-indigo-300":"bg-indigo-50 border-indigo-400 text-indigo-700")
      :(d?"border-slate-700 hover:border-slate-600 text-slate-400":"border-slate-200 hover:border-indigo-200 text-slate-600")}`;

  return (
    <button onClick={()=>onSelect(item)} className={cls}>
      <div className="flex items-center gap-2 flex-wrap mb-0.5">
        <span className="font-semibold">{item.session_name||item.job_id?.slice(0,12)}</span>
        <span className={d?"text-slate-500":"text-slate-400"}>{item.created_at?.slice(0,16)}</span>
        {hasWarning&&(
          <span className={`px-1.5 py-0.5 rounded font-semibold text-xs ${d?"bg-amber-500/20 text-amber-400":"bg-amber-100 text-amber-700"}`}
            title={warningTitle}>
            ⚠ {isOldEngine?(isEN?"old engine":"eski motor"):drugMismatch?(isEN?"drug mismatch":"ilaç uyumsuz"):(isEN?"protocol mismatch":"protokol uyumsuz")}
          </span>
        )}
      </div>
      <GARecordDetail rec={null} ga={item} dark={d} isEN={isEN} compact={false}/>
    </button>
  );
}

// ── Doğrulama Paneli ────────────────────────────────────────────────────────

// ── GNN XAI Paneli ──────────────────────────────────────────────────────────
const XAI_METHODS = [
  {
    key: "shap",
    endpoint: "/gnn/xai/shap",
    color_dark: "text-violet-400", color_light: "text-violet-700",
    border_dark: "border-violet-900/40", border_light: "border-violet-200",
    bg_dark: "bg-violet-950/40 hover:bg-violet-950/60", bg_light: "bg-violet-50 hover:bg-violet-100",
    badge_dark: "bg-violet-900/60 text-violet-400", badge_light: "bg-violet-100 text-violet-600",
    label_tr: "SHAP", label_en: "SHAP",
    desc_tr: "KernelExplainer — her özelliğin tahmine katkısı (±yön dahil)",
    desc_en: "KernelExplainer — each feature's contribution to prediction (±direction)",
    badge_tr: "~30s", badge_en: "~30s",
    valueKey: "shap", absKey: "abs_shap",
  },
  {
    key: "permutation",
    endpoint: "/gnn/xai/permutation",
    color_dark: "text-teal-400", color_light: "text-teal-700",
    border_dark: "border-teal-900/40", border_light: "border-teal-200",
    bg_dark: "bg-teal-950/40 hover:bg-teal-950/60", bg_light: "bg-teal-50 hover:bg-teal-100",
    badge_dark: "bg-teal-900/60 text-teal-400", badge_light: "bg-teal-100 text-teal-600",
    label_tr: "Permutation", label_en: "Permutation",
    desc_tr: "Her özelliği bozarak tahmin düşüşünü ölçer — model-agnostic",
    desc_en: "Measures prediction drop when each feature is shuffled — model-agnostic",
    badge_tr: "~10s", badge_en: "~10s",
    valueKey: "importance", absKey: "importance",
  },
  {
    key: "gemex",
    endpoint: "/gnn/xai/gemex",
    color_dark: "text-amber-400", color_light: "text-amber-700",
    border_dark: "border-amber-900/40", border_light: "border-amber-200",
    bg_dark: "bg-amber-950/40 hover:bg-amber-950/60", bg_light: "bg-amber-50 hover:bg-amber-100",
    badge_dark: "bg-amber-900/60 text-amber-400", badge_light: "bg-amber-100 text-amber-600",
    label_tr: "GEMEX", label_en: "GEMEX",
    desc_tr: "GSF — Geodesic Sensitivity Field, Riemannian manifold üzerinde özellik önemi",
    desc_en: "GSF — Geodesic Sensitivity Field, feature importance on Riemannian manifold",
    badge_tr: "~20s", badge_en: "~20s",
    valueKey: "gsf", absKey: "abs_gsf",
  },
  {
    key: "counterfactual",
    endpoint: "/gnn/xai/counterfactual",
    color_dark: "text-rose-400", color_light: "text-rose-700",
    border_dark: "border-rose-900/40", border_light: "border-rose-200",
    bg_dark: "bg-rose-950/40 hover:bg-rose-950/60", bg_light: "bg-rose-50 hover:bg-rose-100",
    badge_dark: "bg-rose-900/60 text-rose-400", badge_light: "bg-rose-100 text-rose-600",
    label_tr: "Counterfactual", label_en: "Counterfactual",
    desc_tr: "Hedef eşiğe ulaşmak için minimum değişiklik — greedy koordinat arama",
    desc_en: "Minimum changes to reach the target threshold — greedy coordinate search",
    badge_tr: "~20s", badge_en: "~20s",
    valueKey: null, absKey: null,
  },
];

const CF_TARGETS = [
  { col: "WBC",    dir: "increase", thr: 1.5,  label_tr: "WBC ≥ 1.5 (hedef alt sınır)",    label_en: "WBC ≥ 1.5 (target lower bound)" },
  { col: "ANC",    dir: "increase", thr: 0.5,  label_tr: "ANC ≥ 0.5 (nötropeni eşiği)",    label_en: "ANC ≥ 0.5 (neutropenia threshold)" },
  { col: "Lt",     dir: "decrease", thr: 0.01, label_tr: "Lt ≤ 0.01 (tümör kontrolü)",     label_en: "Lt ≤ 0.01 (tumor control)" },
  { col: "VIPN_N", dir: "increase", thr: 0.78, label_tr: "VIPN ≥ 0.78 (nörotoksisite)",   label_en: "VIPN ≥ 0.78 (neurotoxicity threshold)" },
];

const XAI_TARGET_COLS = ["WBC","ANC","Lt","VIPN_N","PEG_A","ASN","cum_DNR_mgm2","CCS"];

function XAIResultBars({ features, valueKey, absKey, dark, isEN, positiveLabel, negativeLabel }) {
  const d = dark;
  if (!features?.length) return null;
  const maxAbs = Math.max(...features.map(f => Math.abs(f[absKey] ?? 0)), 1e-9);

  return (
    <div className="space-y-2 mt-3">
      {features.slice(0, 12).map((f, i) => {
        const absVal  = Math.abs(f[absKey] ?? 0);
        const rawVal  = f[valueKey] ?? 0;
        const pct     = (absVal / maxAbs) * 100;
        const isPos   = rawVal >= 0;
        const barCol  = isPos
          ? (d ? "#22c55e" : "#16a34a")
          : (d ? "#ef4444" : "#dc2626");
        const label   = isEN ? f.label_en : f.label_tr;

        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-0.5">
              <span className={`text-xs font-medium ${d?"text-slate-300":"text-slate-700"}`}>{label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${d?"text-slate-500":"text-slate-400"}`}>
                  {f.value !== undefined ? `${Number(f.value).toFixed(2)}` : ""}
                </span>
                <span className="text-xs font-bold w-16 text-right font-mono" style={{color: barCol}}>
                  {rawVal >= 0 ? "+" : ""}{rawVal.toFixed(4)}
                </span>
              </div>
            </div>
            <div className={`w-full rounded-full h-1.5 ${d?"bg-slate-700":"bg-slate-200"}`}>
              <div className="h-1.5 rounded-full" style={{width:`${pct}%`, background: barCol}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GNNXAIPanel({ dark, isEN, gaResult, config }) {
  const d = dark;
  const BASE = "/api/v1";
  const getToken = () => localStorage.getItem("sting_token");

  // Her method için ayrı state
  const [openMethod, setOpenMethod] = useState(null);
  const [results,    setResults]    = useState({});
  const [statuses,   setStatuses]   = useState({});
  const [errors,     setErrors]     = useState({});

  // Ortak ayarlar
  const [targetCol,  setTargetCol]  = useState("WBC");
  const [cfTarget,   setCfTarget]   = useState(CF_TARGETS[0]);

  // GA seçimi
  const [gaList,      setGaList]      = useState([]);
  const [selectedGA,  setSelectedGA]  = useState(null);  // seçilen GA job
  const [gaListOpen,  setGaListOpen]  = useState(false);
  const [gaListLoading, setGaListLoading] = useState(false);

  // GA listesini yükle
  useEffect(() => {
    setGaListLoading(true);
    fetch(`${BASE}/ga/results`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => {
        const list = d.results || [];
        setGaList(list);
        // Varsayılan: Tab4'ten gelen gaResult varsa onu seç, yoksa listedeki ilk
        if (gaResult?.job_id) {
          const match = list.find(g => g.job_id === gaResult.job_id);
          setSelectedGA(match || list[0] || null);
        } else {
          setSelectedGA(list[0] || null);
        }
      })
      .catch(() => {})
      .finally(() => setGaListLoading(false));
  }, []);

  // Seçilen GA job_id — her XAI çağrısına geçilir
  const ga_job_id = selectedGA?.job_id ?? gaResult?.job_id ?? null;

  // GA değişince sonuçları sıfırla
  const handleSelectGA = (item) => {
    setSelectedGA(item);
    setGaListOpen(false);
    setResults({});
    setStatuses({});
    setErrors({});
  };

  const buildPayload = (method) => {
    // Seçili GA'nın hasta parametrelerini öncelikli kullan
    const ga = selectedGA || {};
    const pat = ga.patient || {};
    const base = {
      ga_job_id,
      target_col:     method === "counterfactual" ? cfTarget.col : targetCol,
      n_days:         Math.round(ga.t_end || 250),
      weight_kg:      pat.weight_kg      ?? config?.weight_kg     ?? 30,
      height_cm:      pat.height_cm      ?? config?.height_cm     ?? 120,
      tpmt:           pat.tpmt           ?? config?.tpmt          ?? 1,
      vitamin_d:      pat.vitamin_d      ?? config?.vitamin_d     ?? 28,
      diet:           pat.diet           ?? config?.diet          ?? 0.75,
      exercise:       pat.exercise       ?? config?.exercise      ?? 0.75,
      wbc0:           pat.wbc0           ?? config?.wbc0          ?? 4.5,
      anc0:           pat.anc0           ?? config?.anc0          ?? 2.36,
      dose_6mp_mg:    pat.dose_6mp_mg    ?? config?.dose_6mp_mg   ?? 50,
      dose_mtx_mg:    pat.dose_mtx_mg    ?? config?.dose_mtx_mg   ?? 20,
      dose_vcr_mg:    pat.dose_vcr_mg    ?? config?.dose_vcr_mg   ?? 1.5,
      dose_dnr_mg_m2: pat.dose_dnr_mg_m2 ?? config?.dose_dnr_mg_m2 ?? 25,
      peg_dose_per_m2:pat.peg_dose_per_m2 ?? config?.peg_dose_per_m2 ?? 2500,
      dose_ster_mg_m2:pat.dose_ster_mg_m2 ?? config?.dose_ster_mg_m2 ?? 60,
      dose_cpm_mg_m2: pat.dose_cpm_mg_m2  ?? config?.dose_cpm_mg_m2  ?? 1000,
      dose_arac_mg_m2:pat.dose_arac_mg_m2  ?? config?.dose_arac_mg_m2 ?? 75,
    };
    if (method === "counterfactual") {
      base.cf_target_col  = cfTarget.col;
      base.cf_direction   = cfTarget.dir;
      base.cf_threshold   = cfTarget.thr;
      base.max_change_pct = 30;
      base.max_steps      = 40;
    }
    return base;
  };

  const runMethod = async (method) => {
    if (!ga_job_id) {
      setErrors(e => ({...e, [method]: isEN
        ? "Please select a GA job first."
        : "Lütfen önce bir GA kaydı seçin."}));
      return;
    }
    const m = XAI_METHODS.find(x => x.key === method);
    setStatuses(s => ({...s, [method]: "running"}));
    setErrors(e   => ({...e, [method]: null}));
    try {
      const res = await fetch(`${BASE}${m.endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(method)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "XAI hatası");
      setResults(r  => ({...r, [method]: data}));
      setStatuses(s => ({...s, [method]: "done"}));
    } catch(e) {
      setErrors(er  => ({...er, [method]: e.message}));
      setStatuses(s => ({...s, [method]: "error"}));
    }
  };

  const hasGA = !!ga_job_id;

  return (
    <div className="space-y-3">
      {/* ── GA Kayıt Seçici ── */}
      <div className={`rounded-2xl border overflow-hidden ${d?"border-slate-700":"border-slate-200"}`}>
        {/* Header */}
        <button
          onClick={() => setGaListOpen(o => !o)}
          className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
            d?"bg-slate-800 hover:bg-slate-700":"bg-slate-50 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <svg className={`w-4 h-4 flex-shrink-0 ${d?"text-slate-400":"text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${d?"text-slate-300":"text-slate-600"}`}>
                {isEN?"XAI Data Source — GA Job":"XAI Veri Kaynağı — GA Kaydı"}
              </p>
              {selectedGA ? (
                <p className={`text-xs truncate ${d?"text-indigo-300":"text-indigo-600"}`}>
                  ✓ {selectedGA.session_name || selectedGA.job_id?.slice(0,12)}
                  <span className={`ml-2 ${d?"text-slate-500":"text-slate-400"}`}>
                    · {selectedGA.created_at?.slice(0,16)}
                    {selectedGA.best_score != null && ` · score: ${selectedGA.best_score.toFixed(1)}`}
                  </span>
                </p>
              ) : (
                <p className={`text-xs ${d?"text-amber-400":"text-amber-600"}`}>
                  {gaListLoading
                    ? (isEN?"Loading…":"Yükleniyor…")
                    : (isEN?"No GA job selected — click to choose":"GA kaydı seçilmedi — seçmek için tıklayın")}
                </p>
              )}
            </div>
          </div>
          <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${gaListOpen?"rotate-180":""} ${d?"text-slate-500":"text-slate-400"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {/* GA Listesi */}
        {gaListOpen && (
          <div className={`p-3 space-y-1 max-h-72 overflow-y-auto ${d?"bg-slate-900":"bg-white"}`}>
            {gaListLoading && (
              <p className={`text-xs text-center py-4 ${d?"text-slate-500":"text-slate-400"}`}>
                {isEN?"Loading GA jobs…":"GA kayıtları yükleniyor…"}
              </p>
            )}
            {!gaListLoading && gaList.length === 0 && (
              <div className={`text-xs text-center py-6 ${d?"text-slate-500":"text-slate-400"}`}>
                <p>{isEN?"No GA jobs found.":"GA kaydı bulunamadı."}</p>
                <p className="mt-1">{isEN?"Run Tab 4 first to generate dose optimization data.":"Doz optimizasyonu verisi için önce Tab 4'ü çalıştırın."}</p>
              </div>
            )}
            {gaList.map((item, i) => {
              const isSel = selectedGA?.job_id === item.job_id;
              const bm    = item.best_metrics || {};
              const drugs = (item.active_drugs || []).map(d => ({
                "6mp":"6-MP","mtx":"MTX","vcr":"VCR","daunorubicin":"DNR",
                "asparaginase":"PEG","corticosteroid":"CS","cytarabine":"Ara-C",
                "cyclophosphamide":"CPM","6tg":"6-TG","copanlisib":"COP","novobiocin":"NOV",
              }[d] || d)).join(", ");

              return (
                <button key={i} onClick={() => handleSelectGA(item)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-xs transition-all border ${
                    isSel
                      ? d?"bg-indigo-600/20 border-indigo-500":"bg-indigo-50 border-indigo-400"
                      : d?"border-slate-700 hover:border-slate-500 hover:bg-slate-800":"border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                  }`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`font-semibold ${isSel?(d?"text-indigo-300":"text-indigo-700"):(d?"text-slate-200":"text-slate-700")}`}>
                      {item.session_name || item.job_id?.slice(0,12)}
                    </span>
                    <span className={`font-mono ${d?"text-slate-500":"text-slate-400"}`}>
                      {item.created_at?.slice(0,16)}
                    </span>
                  </div>
                  <div className={`flex flex-wrap gap-x-3 gap-y-0.5 ${d?"text-slate-500":"text-slate-400"}`}>
                    {drugs && <span>💊 {drugs}</span>}
                    {item.best_score != null && <span>🏆 {item.best_score.toFixed(2)}</span>}
                    {bm.wbc_target_frac != null && <span>WBC {((bm.wbc_target_frac||0)*100).toFixed(0)}%</span>}
                    {bm.anc_target_frac != null && <span>ANC {((bm.anc_target_frac||0)*100).toFixed(0)}%</span>}
                    {item.patient?.weight_kg && <span>{item.patient.weight_kg}kg</span>}
                    {item.patient?.age && <span>{item.patient.age}y</span>}
                    {item.protocol_key && <span className={`px-1.5 py-0.5 rounded ${d?"bg-slate-800":"bg-slate-100"}`}>{item.protocol_key}</span>}
                  </div>
                  {isSel && (
                    <div className={`mt-1 text-xs font-semibold ${d?"text-indigo-400":"text-indigo-600"}`}>
                      ✓ {isEN?"Selected for XAI":"XAI için seçildi"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Başlık & Hedef Seçici ── */}
      <div className={`rounded-2xl border p-4 ${d?"border-slate-700 bg-slate-900":"border-slate-200 bg-white"}`}>
        <div className="flex items-center gap-2 mb-2">
          <svg className={`w-4 h-4 ${d?"text-slate-400":"text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span className={`text-sm font-semibold ${d?"text-slate-200":"text-slate-700"}`}>
            GNN v2 XAI — {isEN?"Explainability Methods":"Yorumlanabilirlik Yöntemleri"}
          </span>
        </div>
        <p className={`text-xs leading-relaxed mb-3 ${d?"text-slate-500":"text-slate-400"}`}>
          {isEN
            ? "Each method runs independently on the selected GA job above. Select a target output, then click a method's run button."
            : "Her yöntem yukarıda seçilen GA kaydı üzerinde bağımsız çalışır. Bir çıktı hedefi seçin, ardından istediğiniz yöntemin Çalıştır butonuna tıklayın."}
        </p>
        {!hasGA && (
          <div className={`rounded-xl border px-3 py-2 text-xs mb-3 ${d?"border-amber-800/40 bg-amber-900/20 text-amber-400":"border-amber-200 bg-amber-50 text-amber-700"}`}>
            ⚠ {isEN
              ? "No GA job selected. Please select one above."
              : "GA kaydı seçilmedi. Lütfen yukarıdan bir kayıt seçin."}
          </div>
        )}
        {/* Hedef çıktı seçici */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`text-xs ${d?"text-slate-500":"text-slate-400"}`}>
            {isEN?"Target output:":"Hedef çıktı:"}
          </span>
          {XAI_TARGET_COLS.map(col => (
            <button key={col} onClick={() => setTargetCol(col)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                targetCol === col
                  ? d?"bg-indigo-600 text-white":"bg-indigo-600 text-white"
                  : d?"bg-slate-800 text-slate-400 hover:bg-slate-700":"bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}>{col}</button>
          ))}
        </div>
      </div>

      {/* Yöntem kartları — her biri ayrı accordion */}
      {XAI_METHODS.map(m => {
        const isOpen  = openMethod === m.key;
        const status  = statuses[m.key] ?? "idle";
        const result  = results[m.key];
        const err     = errors[m.key];
        const isCF    = m.key === "counterfactual";

        return (
          <div key={m.key} className={`rounded-2xl border overflow-hidden ${d?m.border_dark:m.border_light}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-3 ${d?m.bg_dark:m.bg_light}`}>
              <button className="flex items-center gap-2.5 flex-1 text-left"
                onClick={() => setOpenMethod(isOpen ? null : m.key)}>
                <span className={`text-sm font-bold ${d?m.color_dark:m.color_light}`}>{m.label_en}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d?m.badge_dark:m.badge_light}`}>
                  {isEN?m.badge_en:m.badge_tr}
                </span>
                <span className={`text-xs hidden sm:block ${d?"text-slate-500":"text-slate-400"}`}>
                  {isEN?m.desc_en:m.desc_tr}
                </span>
              </button>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Çalıştır butonu */}
                <button
                  onClick={() => runMethod(m.key)}
                  disabled={status === "running"}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    status === "running"
                      ? d?"bg-slate-700 text-slate-500 cursor-wait":"bg-slate-200 text-slate-400 cursor-wait"
                      : status === "done"
                        ? d?"bg-slate-800 text-slate-400 hover:bg-slate-700":"bg-slate-100 text-slate-500 hover:bg-slate-200"
                        : d?`bg-indigo-700 hover:bg-indigo-600 text-white`:`bg-indigo-600 hover:bg-indigo-700 text-white`
                  }`}
                >
                  {status === "running"
                    ? <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        {isEN?"Running…":"Çalışıyor…"}
                      </span>
                    : status === "done"
                      ? isEN?"↺ Re-run":"↺ Tekrar"
                      : isEN?"▶ Run":"▶ Çalıştır"}
                </button>
                {/* Durum badge */}
                {status === "done" && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d?"bg-emerald-900/40 text-emerald-400":"bg-emerald-100 text-emerald-700"}`}>✓</span>
                )}
                {status === "error" && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d?"bg-red-900/40 text-red-400":"bg-red-100 text-red-700"}`}>✗</span>
                )}
                {/* Accordion ok */}
                <svg className={`w-4 h-4 transition-transform ${isOpen?"rotate-180":""} ${d?"text-slate-500":"text-slate-400"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>

            {/* İçerik */}
            {isOpen && (
              <div className={`p-5 space-y-4 ${d?"bg-slate-900":"bg-white"}`}>

                {/* Counterfactual: hedef seçici */}
                {isCF && (
                  <div>
                    <p className={`text-xs font-semibold mb-2 ${d?"text-slate-400":"text-slate-600"}`}>
                      {isEN?"Counterfactual goal:":"Counterfactual hedefi:"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CF_TARGETS.map((ct, i) => (
                        <button key={i} onClick={() => setCfTarget(ct)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            cfTarget.col === ct.col && cfTarget.dir === ct.dir
                              ? d?"bg-rose-700 text-white":"bg-rose-600 text-white"
                              : d?"bg-slate-800 text-slate-400 hover:bg-slate-700":"bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}>
                          {isEN?ct.label_en:ct.label_tr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hata */}
                {err && (
                  <div className={`rounded-xl border px-4 py-2 text-xs ${d?"border-red-800 bg-red-900/20 text-red-400":"border-red-200 bg-red-50 text-red-600"}`}>
                    ⚠ {err}
                  </div>
                )}

                {/* Sonuç */}
                {result && status === "done" && (() => {
                  if (isCF) {
                    // Counterfactual özel render
                    const goalIcon = result.goal_reached ? "✓" : "⚠";
                    const goalColor = result.goal_reached
                      ? (d?"text-emerald-400":"text-emerald-600")
                      : (d?"text-amber-400":"text-amber-600");

                    return (
                      <div className="space-y-4">
                        {/* Özet kartlar */}
                        <div className="flex flex-wrap gap-2">
                          {[
                            {l: isEN?"Baseline":"Baseline", v: result.baseline_pred?.toFixed(3)},
                            {l: isEN?"Final":"Final", v: result.final_pred?.toFixed(3)},
                            {l: isEN?"Steps":"Adım", v: result.n_steps},
                            {l: isEN?"Goal":"Hedef", v: `${goalIcon} ${result.goal_reached?(isEN?"Reached":"Ulaşıldı"):(isEN?"Not reached":"Ulaşılamadı")}`, col: goalColor},
                          ].map((card, i) => (
                            <div key={i} className={`rounded-xl border px-3 py-2 text-center ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-slate-50"}`}>
                              <p className={`text-xs ${d?"text-slate-500":"text-slate-400"}`}>{card.l}</p>
                              <p className={`text-sm font-bold font-mono ${card.col||(d?"text-slate-200":"text-slate-700")}`}>{card.v}</p>
                            </div>
                          ))}
                        </div>

                        {/* Pred history mini chart */}
                        {result.pred_history?.length > 1 && (
                          <div>
                            <p className={`text-xs font-semibold mb-2 ${d?"text-slate-400":"text-slate-600"}`}>
                              {isEN?"Prediction trajectory (per step)":"Adım başına tahmin seyri"}
                            </p>
                            <div className="flex items-end gap-0.5 h-10">
                              {result.pred_history.map((v, i) => {
                                const mn = Math.min(...result.pred_history);
                                const mx = Math.max(...result.pred_history) || 1;
                                const h  = ((v - mn) / (mx - mn || 1)) * 100;
                                return (
                                  <div key={i} title={v}
                                    className="flex-1 rounded-sm min-w-[4px]"
                                    style={{height:`${Math.max(h,4)}%`, background: i===result.pred_history.length-1?"#22c55e":"#6366f1"}}/>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Değiştirilen özellikler */}
                        {result.changed_features?.length > 0 && (
                          <div>
                            <p className={`text-xs font-semibold mb-2 ${d?"text-slate-400":"text-slate-600"}`}>
                              {isEN?"Required changes:":"Gerekli değişiklikler:"}
                            </p>
                            <div className="space-y-2">
                              {result.changed_features.map((cf, i) => (
                                <div key={i} className={`rounded-xl border px-4 py-2.5 ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-slate-50"}`}>
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className={`text-xs font-semibold ${d?"text-slate-200":"text-slate-700"}`}>
                                      {isEN?cf.label_en:cf.label_tr}
                                    </span>
                                    <div className="flex items-center gap-2 font-mono text-xs">
                                      <span className={d?"text-slate-400":"text-slate-500"}>{cf.original?.toFixed(3)}</span>
                                      <span className={d?"text-slate-600":"text-slate-300"}>→</span>
                                      <span className="font-bold" style={{color: cf.delta>=0?"#22c55e":"#ef4444"}}>
                                        {cf.counterfactual?.toFixed(3)}
                                      </span>
                                      <span style={{color: cf.delta>=0?"#22c55e":"#ef4444"}}>
                                        ({cf.delta>=0?"+":""}{cf.delta_pct?.toFixed(1)}%)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className={`text-xs italic ${d?"text-slate-600":"text-slate-400"}`}>
                          {isEN
                            ? "Only actionable features (doses, lifestyle) are modified. Age, sex, TPMT and resistant fraction are fixed."
                            : "Yalnızca actionable özellikler (dozlar, yaşam tarzı) değiştirilir. Yaş, cinsiyet, TPMT ve direnç fraksiyonu sabit tutulur."}
                        </p>
                      </div>
                    );
                  }

                  // SHAP / Permutation / GEMEX — ortak bar render
                  const features = result.features || [];
                  const vk = m.valueKey;
                  const ak = m.absKey;
                  return (
                    <div className="space-y-3">
                      {/* Üst bilgi */}
                      <div className="flex flex-wrap gap-2">
                        {result.baseline !== undefined && (
                          <div className={`rounded-xl border px-3 py-1.5 text-center ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-slate-50"}`}>
                            <p className={`text-xs ${d?"text-slate-500":"text-slate-400"}`}>{isEN?"Baseline":"Baseline"}</p>
                            <p className={`text-sm font-bold font-mono ${d?"text-slate-200":"text-slate-700"}`}>{result.baseline?.toFixed(4)}</p>
                          </div>
                        )}
                        {result.prediction !== undefined && (
                          <div className={`rounded-xl border px-3 py-1.5 text-center ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-slate-50"}`}>
                            <p className={`text-xs ${d?"text-slate-500":"text-slate-400"}`}>{isEN?"Prediction":"Tahmin"}</p>
                            <p className={`text-sm font-bold font-mono ${d?"text-slate-200":"text-slate-700"}`}>{result.prediction?.toFixed(4)}</p>
                          </div>
                        )}
                        {result.manifold_curvature !== undefined && (
                          <div className={`rounded-xl border px-3 py-1.5 text-center ${d?"border-amber-900/40 bg-amber-900/10":"border-amber-200 bg-amber-50"}`}>
                            <p className={`text-xs ${d?"text-amber-500":"text-amber-600"}`}>Manifold κ</p>
                            <p className={`text-sm font-bold font-mono ${d?"text-amber-300":"text-amber-700"}`}>{result.manifold_curvature?.toFixed(4)}</p>
                          </div>
                        )}
                        {result.geodesic_arc_length !== undefined && (
                          <div className={`rounded-xl border px-3 py-1.5 text-center ${d?"border-amber-900/40 bg-amber-900/10":"border-amber-200 bg-amber-50"}`}
                            title={isEN
                              ? "Fisher-Rao distance from background mean to this patient. Large value = rare/atypical profile."
                              : "Background ortalamasından bu hastaya Fisher-Rao mesafesi. Büyük değer = nadir/atipik profil."}>
                            <p className={`text-xs ${d?"text-amber-500":"text-amber-600"}`}>
                              {isEN ? "Arc-Length" : "Ark Uzunluğu"}
                            </p>
                            <p className={`text-sm font-bold font-mono ${d?"text-amber-300":"text-amber-700"}`}>
                              {result.geodesic_arc_length?.toFixed(4)}
                            </p>
                          </div>
                        )}
                        {result.geodesic_profile?.length > 1 && (
                          <div className={`w-full rounded-xl border p-3 ${d?"border-amber-900/40 bg-amber-900/10":"border-amber-200 bg-amber-50"}`}>
                            <p className={`text-xs font-semibold mb-2 ${d?"text-amber-400":"text-amber-700"}`}>
                              {isEN
                                ? "Geodesic Arc-Length Profile (baseline → patient)"
                                : "Geodesik Ark Uzunluğu Profili (baseline → hasta)"}
                            </p>
                            <div className="flex items-end gap-px h-12">
                              {(() => {
                                const prof = result.geodesic_profile;
                                const mn   = Math.min(...prof);
                                const mx   = Math.max(...prof) || 1;
                                // Adım başına artış (türev) — eğim değişimini göster
                                const deltas = prof.map((v,i) => i===0 ? v : v - prof[i-1]);
                                const dMax   = Math.max(...deltas, 1e-9);
                                return deltas.map((dv, i) => {
                                  const h = Math.max((dv / dMax) * 100, 2);
                                  // Eğim büyüdükçe turuncu→kırmızı
                                  const ratio = dv / dMax;
                                  const col   = `hsl(${Math.round(40 - ratio*40)}, 90%, ${d?55:45}%)`;
                                  return (
                                    <div key={i}
                                      className="flex-1 rounded-sm min-w-[2px]"
                                      style={{height:`${h}%`, background: col}}
                                      title={`Step ${i+1}: Δ=${dv.toFixed(4)}, total=${prof[i].toFixed(4)}`}
                                    />
                                  );
                                });
                              })()}
                            </div>
                            <div className={`flex justify-between text-xs mt-1 ${d?"text-amber-600":"text-amber-500"}`}>
                              <span>{isEN?"Baseline":"Baseline"}</span>
                              <span>{isEN?"→ Patient":"→ Hasta"}</span>
                            </div>
                            <p className={`text-xs mt-1.5 leading-relaxed ${d?"text-amber-700":"text-amber-600"}`}>
                              {isEN
                                ? "Each bar = arc-length gained per step. Tall bars = rapid divergence from background — the patient profile bends the manifold here."
                                : "Her çubuk = adım başına kazanılan ark uzunluğu. Uzun çubuklar = background'dan hızlı sapma — hasta profili manifoldu burada büküyor."}
                            </p>
                          </div>
                        )}

                        <div className={`rounded-xl border px-3 py-1.5 text-center ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-slate-50"}`}>
                          <p className={`text-xs ${d?"text-slate-500":"text-slate-400"}`}>{isEN?"Target":"Hedef"}</p>
                          <p className={`text-sm font-bold font-mono ${d?"text-indigo-300":"text-indigo-700"}`}>{result.target_col}</p>
                        </div>
                      </div>

                      {/* Bar'lar */}
                      <XAIResultBars features={features} valueKey={vk} absKey={ak} dark={d} isEN={isEN}/>

                      {/* Not */}
                      {result.note && (
                        <p className={`text-xs italic leading-relaxed ${d?"text-slate-600":"text-slate-400"}`}>{result.note}</p>
                      )}
                    </div>
                  );
                })()}

                {/* Boş durum */}
                {status === "idle" && !result && (
                  <p className={`text-xs ${d?"text-slate-600":"text-slate-400"}`}>
                    {isEN
                      ? `Click ▶ Run to start ${m.label_en} analysis on the current patient profile.`
                      : `Mevcut hasta profili için ${m.label_tr} analizini başlatmak için ▶ Çalıştır'a tıklayın.`}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ValidationPanel({ dark, isEN, onValidated, config }) {
  const d=dark;
  const [v2Status, setV2Status] = useState(null);
  const [gaList,   setGaList]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [gaTs,     setGaTs]     = useState(null);
  const [gnnPreds, setGnnPreds] = useState(null);
  const [phaseList,setPhaseList]= useState([]);
  const [activeTarget,setActiveTarget]=useState("WBC");
  const [error,    setError]    = useState(null);

  useEffect(()=>{
    apiGet("/gnn/v2/status").then(setV2Status).catch(()=>{});
    apiGet("/ga/results").then(r=>setGaList(r.results||[])).catch(()=>{});
  },[]);

  const modelReady = v2Status?.status==="ready";

  const handleSelect = async(item) => {
    setSelected(item);  // item içinde t_end, patient, n_days bilgileri var
    setGaTs(null); setGnnPreds(null); setError(null);
    try {
      const full = await apiGet(`/ga/result/${item.job_id}`);
      const ts   = full.timeseries||{};
      setGaTs({
        t:      ts.t   ||[],
        WBC:    ts.WBC ||[],
        ANC:    ts.ANC ||[],
        VIPN_N: ts.VIPN||[],
        Lt:     ts.Lt  ||[],
        CCS:    ts.CCS ||[],
        PEG_A:  [],
        ASN:    [],
        cum_DNR_mgm2: [],
      });
      setPhaseList(full.phase_list||[]);
    } catch(e) {
      setError(e.message);
    }
  };

  const handlePredict = async() => {
    if(!selected) return;
    setLoading(true); setGnnPreds(null); setError(null);
    try {
      const nDays = Math.max(
        gaTs?.t?.length || 0,
        selected?.n_days || 0,
        Math.round(selected?.t_end || 250),
        250
      );
      const res = await apiPost("/gnn/v2/predict-from-sim",
        {ga_job_id: selected.job_id, n_days: nDays});
      setGnnPreds({t: gaTs?.t||[], ...res.predictions});
      if(onValidated) onValidated();
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const availableTargets = Object.keys(TC).filter(k=>
    (gaTs?.[k]?.length||0)>0 || (gnnPreds?.[k]?.length||0)>0
  );

  const card=`rounded-2xl border p-5 ${d?"bg-slate-900 border-slate-700":"bg-white border-indigo-100 shadow-sm"}`;

  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <p className={`text-sm font-semibold ${d?"text-slate-200":"text-slate-700"}`}>
            🔬 {isEN?"GNN Validation (GA Optimization vs GNN)":"GNN Doğrulama (GA Optimizasyonu vs GNN)"}
          </p>
          <p className={`text-xs mt-0.5 ${d?"text-slate-500":"text-slate-400"}`}>
            {isEN
              ?"Select a dose optimization and treatment flow record → compare with GNN prediction. Confirm GNN performance before synthetic patient generation."
              :"Bir doz optimizasyonu ve tedavi akışı verisi seçerek GNN tahminiyle karşılaştırın. Böylelikle sentetik hasta üretimi öncesi GNN başarımını onaylayabilirsiniz."}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          modelReady?"bg-emerald-500/20 text-emerald-400":"bg-amber-500/20 text-amber-400"}`}>
          {modelReady?"✓ GNN v2 Hazır":"⚠ Model Yok"}
        </span>
      </div>

      {/* GA listesi */}
      <div className="max-h-48 overflow-y-auto mt-3 mb-3">
        {gaList.length===0
          ?<p className={`text-xs ${d?"text-amber-400":"text-amber-600"}`}>
              ⚠ {isEN?"No GA runs yet. Run GA optimization in Tab 4.":"Henüz GA koşusu yok. Tab 4'te GA optimizasyonu çalıştırın."}
            </p>
          :gaList.map((item,i)=>(
            <GAListItem key={i} item={item} selected={selected}
              onSelect={handleSelect} dark={d} isEN={isEN}
              cfgProtocol={config?.protocol_key||""}
              cfgDrugs={config?.active_drugs||[]}/>
          ))
        }
      </div>

      {error&&<p className={`text-xs mb-2 ${d?"text-red-400":"text-red-600"}`}>✗ {error}</p>}

      {/* GNN tahmin butonu — sadece GA seçiliyse görünür */}
      {gaTs&&(
        <button onClick={handlePredict} disabled={loading||!modelReady}
          className={`px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all mb-4 ${
            !modelReady||loading
              ?"opacity-40 cursor-not-allowed bg-slate-600"
              :"bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"}`}>
          {loading?"…":isEN?"▶ Get GNN Prediction":"▶ GNN Tahmini Al"}
        </button>
      )}

      {/* Legenda + açıklama */}
      {(gaTs||gnnPreds)&&(
        <div className="space-y-2 mb-3">
          <div className="flex gap-4 flex-wrap">
            {gaTs&&<div className="flex items-center gap-1.5">
              <div className="w-7 h-0.5 rounded" style={{background:"#1e40af"}}/>
              <span className={`text-xs ${d?"text-slate-400":"text-slate-600"}`}>
                {isEN?"GA/ODE (real trajectory)":"GA/ODE (gerçek trajektori)"}
              </span>
            </div>}
            {gnnPreds&&<div className="flex items-center gap-1.5">
              <svg width="28" height="4"><line x1="0" y1="2" x2="28" y2="2"
                stroke="#f97316" strokeWidth="2" strokeDasharray="5,3"/></svg>
              <span className={`text-xs ${d?"text-slate-400":"text-slate-600"}`}>
                {isEN?"GNN (predicted trajectory)":"GNN (tahmin trajektorisi)"}
              </span>
            </div>}
          </div>
          {gaTs&&!gnnPreds&&(
            <p className={`text-xs ${d?"text-amber-400":"text-amber-600"}`}>
              {isEN
                ?"↑ This is the real GA/ODE trajectory. Click 'Get GNN Prediction' to overlay the GNN estimate."
                :"↑ Bu gerçek GA/ODE trajektorisi. GNN tahminini eklemek için 'GNN Tahmini Al' düğmesine tıklayın."}
            </p>
          )}
        </div>
      )}

      {/* Plotly grafikleri — aktif hedef + 3 ana hedef */}
      {(gaTs||gnnPreds)&&(
        <div className="space-y-4 mt-2">
          {/* Hedef sekmeleri */}
          {availableTargets.length>0&&(
            <div className="flex gap-1.5 flex-wrap">
              {availableTargets.map(k=>(
                <button key={k} onClick={()=>setActiveTarget(k)}
                  className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition-all ${
                    activeTarget===k?"text-white border-transparent"
                    :(d?"bg-slate-800 text-slate-400 border-slate-700":"bg-white text-slate-500 border-slate-200")}`}
                  style={activeTarget===k?{background:TC[k]?.col||"#6366f1"}:{}}>
                  {k}
                </button>
              ))}
            </div>
          )}

          {/* Aktif hedef Plotly grafiği */}
          {availableTargets.includes(activeTarget)&&(
            <GNNCompareChart dark={d} phaseList={phaseList}
              gaData={gaTs} gnnData={gnnPreds}
              targetKey={activeTarget}
              color={TC[activeTarget]?.col||"#6366f1"}
              title={TC[activeTarget]?.lbl||activeTarget}
              targetBand={activeTarget==="WBC"?[1.5,3.0]:activeTarget==="ANC"?[0.5,1.5]:null}
              threshold={activeTarget==="VIPN_N"?0.70:null}
              isEN={isEN}/>
          )}

          {/* 8 hedef özet grid — GNN varsa */}
          {gnnPreds&&(
            <div className="grid grid-cols-4 gap-2">
              {Object.keys(TC).map(k=>{
                const odeV=gaTs?.[k]||[], gnnV=gnnPreds?.[k]||[];
                if(!odeV.length&&!gnnV.length) return null;
                const last=gnnV[gnnV.length-1];
                let r2=null;
                if(odeV.length&&gnnV.length){
                  const n=Math.min(odeV.length,gnnV.length);
                  const mean=odeV.slice(0,n).reduce((a,v)=>a+v,0)/n;
                  const ssTot=odeV.slice(0,n).reduce((a,v)=>a+(v-mean)**2,0);
                  const ssRes=gnnV.slice(0,n).reduce((a,v,i)=>a+(odeV[i]-v)**2,0);
                  if(ssTot>1e-12) r2=Math.max(0,1-ssRes/ssTot);
                }
                return (
                  <div key={k} className={`rounded-xl p-2 text-center border ${
                    d?"bg-slate-800 border-slate-700":"bg-slate-50 border-slate-200"}`}>
                    <p className="text-xs font-bold truncate" style={{color:TC[k]?.col||"#6366f1"}}>{k}</p>
                    <p className={`text-xs font-mono mt-0.5 ${d?"text-slate-300":"text-slate-600"}`}>
                      {last!=null?last.toFixed(3):"—"}
                    </p>
                    {r2!=null&&(
                      <p className={`text-xs mt-0.5 font-semibold ${
                        r2>=0.95?"text-emerald-400":r2>=0.80?"text-amber-400":"text-red-400"}`}>
                        R²={r2.toFixed(3)}
                      </p>
                    )}
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Ana Tab5 ────────────────────────────────────────────────────────────────
export default function Tab5GNN({ dark, config, gaResult, activeDrugs=[], onGoTo }) {
  const{lang}=useLang(); const isEN=lang==="en"; const d=dark;
  const [mode,      setMode]      = useState("pretrained");
  const [validated, setValidated] = useState(false);

  const card=`rounded-2xl border ${d?"bg-slate-900 border-slate-700":"bg-white border-indigo-100 shadow-sm"}`;

  const howToSteps=isEN?[
    {title:"Choose Mode",desc:"Use the pre-trained GNN v2 model (meanR²≈0.996, recommended) or train on your own GA pool data."},
    {title:"Validate",desc:"Select a dose optimization and treatment flow record → compare with GNN prediction. This way you can confirm GNN performance before synthetic patient generation."},
    {title:"Go to Tab 6",desc:"GNN v2 is ready. Tab 6 uses it to validate GAN-generated synthetic patients with 8-target trajectories and risk scores."},
  ]:[
    {title:"Mod Seçin",desc:"Hazır GNN v2 modelini kullanın (ort. R²≈0.996, önerilen) veya kendi GA havuz verilerinizle eğitin."},
    {title:"Doğrulayın",desc:"Bir doz optimizasyonu ve tedavi akışı verisi seçerek GNN tahminiyle karşılaştırın. Böylelikle sentetik hasta üretimi öncesi GNN başarımını onaylayabilirsiniz."},
    {title:"Tab 6'ya Geçin",desc:"GNN v2 hazır. Tab 6, GAN'ın ürettiği sentetik hastaları 8 hedefli trajektori ve risk skorlarıyla doğrulamak için bunu kullanır."},
  ];

  return (
    <div className="space-y-5">
      <HowToUse steps={howToSteps} dark={d}/>

      <button onClick={()=>onGoTo&&onGoTo("tab6")}
        className="flex-shrink-0 font-semibold px-6 py-2.5 rounded-xl transition-all text-sm shadow-lg bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-rose-500/20 active:scale-95">
        ▶ {isEN?"Synthetic Patient Generation":"Sentetik Hasta Oluşturma Aşaması"}
      </button>

      {/* Mod seçimi */}
      <div className={card+" p-5"}>
        <p className={`text-sm font-semibold mb-3 ${d?"text-slate-200":"text-slate-700"}`}>
          🧬 GNN v2 — {isEN?"Select Mode":"Mod Seçin"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[["pretrained",
              isEN?"Use Pre-trained Model":"Hazır Modeli Kullan",
              isEN?"Trained on 1000 synthetic patients (meanR²≈0.996). Upload your own model if needed."
                  :"1000 sentetik hasta üzerinde eğitilmiş (ort. R²≈0.996). Gerekirse kendi modelinizi yükleyin.",
              "✓"],
            ["train",
              isEN?"Train New Model":"Yeni Model Eğit",
              isEN?"Train GNN v2 on your GA pool records to learn your protocol's specific ODE dynamics."
                  :"GA havuz kayıtlarınızda GNN v2 eğiterek protokolünüze özgü ODE dinamiğini öğretin.",
              "⚙"],
          ].map(([v,title,desc,icon])=>(
            <button key={v} onClick={()=>setMode(v)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                mode===v
                  ?(d?"bg-indigo-600/20 border-indigo-500":"bg-indigo-50 border-indigo-400")
                  :(d?"bg-slate-800 border-slate-700 hover:border-slate-600":"bg-white border-slate-200 hover:border-indigo-200")}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{icon}</span>
                <span className={`text-sm font-semibold ${
                  mode===v?(d?"text-indigo-300":"text-indigo-700"):(d?"text-slate-300":"text-slate-700")}`}>
                  {title}
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${d?"text-slate-500":"text-slate-400"}`}>{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Hazır model paneli — sadece pretrained modda */}
      {mode==="pretrained"&&<PretrainedModelPanel dark={d} isEN={isEN}/>}

      {/* Eğitim modu */}
      {mode==="train"&&<>
        <TrainPoolPanel dark={d} isEN={isEN} config={config}/>
        <TrainingPanel dark={d} isEN={isEN} onTrainDone={()=>{}}/>
      </>}

      {/* Doğrulama — sadece pretrained modda */}
      {mode==="pretrained"&&<ValidationPanel dark={d} isEN={isEN} onValidated={()=>setValidated(true)} config={config}/>}


      {/* ── GNN XAI PANELİ ── */}
      {mode==="pretrained" && <GNNXAIPanel dark={d} isEN={isEN} gaResult={gaResult} config={config} />}

    </div>
  );
}
