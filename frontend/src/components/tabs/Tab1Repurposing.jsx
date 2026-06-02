// src/components/tabs/Tab1Repurposing.jsx
import { useState, useCallback, useRef } from "react";
import { runRepurposing, explainPair, getSourceCode } from "../../services/api";
import { useLang } from "../../i18n/LangContext";
import TrainingPanel from "../ui/TrainingPanel";
import ModelStatusPanel from "../ui/ModelStatusPanel";
import HowToUse   from "../ui/HowToUse";
import DockingPanel from "../ui/DockingPanel";
import NextTabBanner from "../ui/NextTabBanner";

// ── Helpers ────────────────────────────────────────────────────────────────
function FileDropZone({ label, accept, file, onChange, dark }) {
  return (
    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
      dark ? "border-gray-700 hover:border-blue-500 hover:bg-blue-500/5"
           : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
    }`}>
      <svg className={`w-6 h-6 mb-1 ${dark ? "text-gray-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-xs text-gray-400">
        {file ? <span className="text-blue-500 font-medium">{file.name}</span> : label}
      </p>
      <input type="file" className="hidden" accept={accept} onChange={e => onChange(e.target.files[0])} />
    </label>
  );
}

function MetricCard({ label, value, dark }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
      <p className={`text-2xl font-bold ${dark ? "text-gray-100" : "text-gray-800"}`}>{value ?? "—"}</p>
      <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>{label}</p>
    </div>
  );
}

function PlotPanel({ title, b64, dark }) {
  if (!b64) return null;
  return (
    <div className={`rounded-xl border overflow-hidden ${dark ? "border-gray-800" : "border-gray-200"}`}>
      <div className={`px-4 py-2 border-b text-sm font-medium ${dark ? "border-gray-800 text-gray-300 bg-gray-900" : "border-gray-100 text-gray-700 bg-white"}`}>{title}</div>
      <img src={`data:image/png;base64,${b64}`} alt={title} className="w-full" />
    </div>
  );
}

function CodeViewer({ source, dark }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-xl overflow-hidden bg-gray-950 text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-400 text-xs">
        <span>python</span>
        <button onClick={copy} className="hover:text-white transition-colors">
          {copied ? t("codeCopied") : t("codeCopy")}
        </button>
      </div>
      <pre className="p-4 overflow-auto max-h-96 text-green-300 leading-relaxed">
        <code>{source}</code>
      </pre>
    </div>
  );
}

// ── CHEMBL / PubChem search URLs ───────────────────────────────────────────
function ExternalLinks({ smiles, drugName, dark }) {
  const { t } = useLang();
  const pubchem = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smiles || drugName)}`;
  const chembl  = `https://www.ebi.ac.uk/chembl/compound_report_card/search_results/${encodeURIComponent(drugName)}`;
  return (
    <div className="flex gap-1">
      <a href={pubchem} target="_blank" rel="noopener noreferrer"
        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
          dark ? "border-blue-700 text-blue-400 hover:bg-blue-500/10" : "border-blue-200 text-blue-600 hover:bg-blue-50"
        }`}>
        {t("pubchemLink")} ↗
      </a>
      <a href={chembl} target="_blank" rel="noopener noreferrer"
        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
          dark ? "border-purple-700 text-purple-400 hover:bg-purple-500/10" : "border-purple-200 text-purple-600 hover:bg-purple-50"
        }`}>
        {t("chemblLink")} ↗
      </a>
    </div>
  );
}

// ── Sub-tab bar ────────────────────────────────────────────────────────────
function SubTabBar({ active, onChange, dark }) {
  const { t } = useLang();
  const tabs = [
    { id: "predict", label: t("subtabPredict"),  icon: "🎯" },
    { id: "docking", label: t("subtabDocking"),  icon: "⚗️" },
    { id: "train",   label: t("subtabTrain"),    icon: "🏋️" },
  ];
  return (
    <div className={`flex gap-1 border-b ${dark ? "border-gray-800" : "border-gray-200"}`}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            active === tab.id
              ? dark ? "border-blue-500 text-blue-400" : "border-blue-600 text-blue-700"
              : dark ? "border-transparent text-gray-500 hover:text-gray-300" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          <span className="text-sm">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

// ── Araştırma Hikayesi Modal ──────────────────────────────────────────────────
const STORY_STEPS = [
  {
    icon: "🗄️",
    title_tr: "Veri Toplama",
    title_en: "Data Collection",
    content_tr: (
      <div className="space-y-3">
        <p>Çocukluk çağı akut lenfoblastik lösemi (ALL) ile ilişkili protein ve ligand verileri dört büyük veritabanından derlendi:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {["DrugBank", "ChEMBL", "PubChem", "KIBA"].map(db => (
            <div key={db} className="rounded-lg bg-indigo-900/30 border border-indigo-800/40 px-3 py-2 font-semibold text-indigo-300">{db}</div>
          ))}
        </div>
        <p>Sorgulama terimleri: <span className="font-mono text-amber-300">"acute lymphoblastic leukemia"</span>, <span className="font-mono text-amber-300">"ALL"</span>, <span className="font-mono text-amber-300">"leukemia"</span></p>
        <p>Bilinen anti-lösemik ilaçlar (Methotrexate, Vincristine, Dasatinib vb.) de dahil edildi.</p>
        <div className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-3">
          <p className="text-xs text-slate-400 mb-1">Veri seti (açık erişim):</p>
          <a href="https://data.mendeley.com/datasets/r5ftnf4j9f/1" target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-xs underline break-all">
            https://data.mendeley.com/datasets/r5ftnf4j9f/1
          </a>
          <div className="flex gap-4 mt-2 text-xs text-slate-400">
            <span>📊 314.531 ligand</span>
            <span>🧬 2.701 protein</span>
          </div>
        </div>
      </div>
    ),
    content_en: (
      <div className="space-y-3">
        <p>Protein and ligand data associated with childhood acute lymphoblastic leukemia (ALL) were compiled from four major databases:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {["DrugBank", "ChEMBL", "PubChem", "KIBA"].map(db => (
            <div key={db} className="rounded-lg bg-indigo-900/30 border border-indigo-800/40 px-3 py-2 font-semibold text-indigo-300">{db}</div>
          ))}
        </div>
        <p>Query terms: <span className="font-mono text-amber-300">"acute lymphoblastic leukemia"</span>, <span className="font-mono text-amber-300">"ALL"</span>, <span className="font-mono text-amber-300">"leukemia"</span></p>
        <p>Known anti-leukemic drugs (Methotrexate, Vincristine, Dasatinib etc.) were also included.</p>
        <div className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-3">
          <p className="text-xs text-slate-400 mb-1">Dataset (open access):</p>
          <a href="https://data.mendeley.com/datasets/r5ftnf4j9f/1" target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-xs underline break-all">
            https://data.mendeley.com/datasets/r5ftnf4j9f/1
          </a>
          <div className="flex gap-4 mt-2 text-xs text-slate-400">
            <span>📊 314,531 ligands</span>
            <span>🧬 2,701 proteins</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: "🧠",
    title_tr: "Bi-LSTM Model Eğitimi",
    title_en: "Bi-LSTM Model Training",
    content_tr: (
      <div className="space-y-3">
        <p>5 farklı derin öğrenme mimarisi test edildi. En iyi performansı L2 regularizasyonlu Bi-LSTM + Bi-LSTM (HPO) modeli gösterdi:</p>
        <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400">Model</th>
                <th className="text-right px-3 py-2 text-slate-400">Test Loss</th>
                <th className="text-right px-3 py-2 text-slate-400">Test MAE</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Bi-LSTM + CNN", "0.2218", "0.0698"],
                ["(Bi-LSTM+L2)+(CNN+L2)", "0.4188", "0.1402"],
                ["Bi-LSTM + Bi-LSTM", "0.3273", "0.0621"],
                ["(Bi-LSTM+L2)+(Bi-LSTM+L2) HPO ✓", "0.2100", "0.0410"],
                ["DeepDTA (baseline)", "0.3018", "0.0581"],
              ].map(([name, loss, mae], i) => (
                <tr key={i} className={`border-b border-slate-700/50 ${i===3?"bg-emerald-900/20":""}`}>
                  <td className={`px-3 py-2 ${i===3?"text-emerald-300 font-semibold":"text-slate-300"}`}>{name}</td>
                  <td className={`px-3 py-2 text-right font-mono ${i===3?"text-emerald-300 font-bold":"text-slate-400"}`}>{loss}</td>
                  <td className={`px-3 py-2 text-right font-mono ${i===3?"text-emerald-300 font-bold":"text-slate-400"}`}>{mae}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">SMILES (maks. 85 karakter) ve protein sekansları (maks. 1346 karakter) karakter düzeyinde tokenize edildi.</p>
      </div>
    ),
    content_en: (
      <div className="space-y-3">
        <p>Five deep learning architectures were tested. The L2-regularized Bi-LSTM + Bi-LSTM (HPO) model achieved the best performance:</p>
        <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400">Model</th>
                <th className="text-right px-3 py-2 text-slate-400">Test Loss</th>
                <th className="text-right px-3 py-2 text-slate-400">Test MAE</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Bi-LSTM + CNN", "0.2218", "0.0698"],
                ["(Bi-LSTM+L2)+(CNN+L2)", "0.4188", "0.1402"],
                ["Bi-LSTM + Bi-LSTM", "0.3273", "0.0621"],
                ["(Bi-LSTM+L2)+(Bi-LSTM+L2) HPO ✓", "0.2100", "0.0410"],
                ["DeepDTA (baseline)", "0.3018", "0.0581"],
              ].map(([name, loss, mae], i) => (
                <tr key={i} className={`border-b border-slate-700/50 ${i===3?"bg-emerald-900/20":""}`}>
                  <td className={`px-3 py-2 ${i===3?"text-emerald-300 font-semibold":"text-slate-300"}`}>{name}</td>
                  <td className={`px-3 py-2 text-right font-mono ${i===3?"text-emerald-300 font-bold":"text-slate-400"}`}>{loss}</td>
                  <td className={`px-3 py-2 text-right font-mono ${i===3?"text-emerald-300 font-bold":"text-slate-400"}`}>{mae}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">SMILES (max 85 chars) and protein sequences (max 1346 chars) were tokenized at character level.</p>
      </div>
    ),
  },
  {
    icon: "🎯",
    title_tr: "Top 10 Aday — Predicted Affinity",
    title_en: "Top 10 Candidates — Predicted Affinity",
    content_tr: (
      <div className="space-y-3">
        <p>Model çıktısından en düşük (en güçlü) predicted affinity skoruna sahip 10 protein-ligand çifti seçildi:</p>
        <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400">Protein</th>
                <th className="text-left px-3 py-2 text-slate-400">Ligand</th>
                <th className="text-right px-3 py-2 text-slate-400">Affinity</th>
                <th className="text-left px-3 py-2 text-slate-400">Kullanım</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["P25815","CHEMBL4856031","-0.411","Kalsiyum sensörü, hücre çoğalması"],
                ["Q8N668","CHEMBL?","-0.407","NF-κB düzenleyici, kanser"],
                ["P41181","CHEMBL?","-0.396","Böbrek suyu homeostazı"],
                ["P17813","CHEMBL100120","-0.394","Anjiyogenez düzenleyici"],
                ["Q8TBP6","CHEMBL302326","-0.386","Glutatyon taşıyıcı"],
                ["A0A1M4BL28","CHEMBL10592","-0.363","Glutatyon proteini"],
                ["P02545","CHEMBL11131","-0.356","DNA onarımı, Lamin A/C"],
                ["-","CHEMBL1044","-0.348","-"],
                ["P28335","CHEMBL4777604","-0.342","Serotonin reseptörü"],
                ["P78334","CHEMBL81923","-0.341","GABA kanalı"],
              ].map(([prot, lig, aff, use], i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  <td className="px-3 py-2 font-mono text-slate-300">{prot}</td>
                  <td className="px-3 py-2 font-mono text-slate-400 text-xs">{lig}</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-300">{aff}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
    content_en: (
      <div className="space-y-3">
        <p>The 10 protein-ligand pairs with the lowest (strongest) predicted affinity scores were selected:</p>
        <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400">Protein</th>
                <th className="text-left px-3 py-2 text-slate-400">Ligand</th>
                <th className="text-right px-3 py-2 text-slate-400">Affinity</th>
                <th className="text-left px-3 py-2 text-slate-400">Indication</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["P25815","CHEMBL4856031","-0.411","Calcium sensor, cell proliferation"],
                ["Q8N668","CHEMBL?","-0.407","NF-κB regulator, cancer"],
                ["P41181","CHEMBL?","-0.396","Renal water homeostasis"],
                ["P17813","CHEMBL100120","-0.394","Angiogenesis regulator"],
                ["Q8TBP6","CHEMBL302326","-0.386","Glutathione transport"],
                ["A0A1M4BL28","CHEMBL10592","-0.363","Glutathione protein"],
                ["P02545","CHEMBL11131","-0.356","DNA repair, Lamin A/C"],
                ["-","CHEMBL1044","-0.348","-"],
                ["P28335","CHEMBL4777604","-0.342","Serotonin receptor"],
                ["P78334","CHEMBL81923","-0.341","GABA channel"],
              ].map(([prot, lig, aff, use], i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  <td className="px-3 py-2 font-mono text-slate-300">{prot}</td>
                  <td className="px-3 py-2 font-mono text-slate-400 text-xs">{lig}</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-300">{aff}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    icon: "⚗️",
    title_tr: "Docking Doğrulaması (PandaDock)",
    title_en: "Docking Validation (PandaDock)",
    content_tr: (
      <div className="space-y-3">
        <p>Top adaylar PandaDock ile moleküler docking analizine tabi tutuldu. Protein yapıları SwissModel/AlphaFold ile, ligand yapıları RDKit ile hazırlandı.</p>
        <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400">Protein</th>
                <th className="text-left px-3 py-2 text-slate-400">Ligand</th>
                <th className="text-right px-3 py-2 text-slate-400">Docking (kcal/mol)</th>
                <th className="text-center px-3 py-2 text-slate-400">Güç</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["P02545","CHEMBL11131","-207.11","Strong","bg-emerald-900/30 text-emerald-300"],
                ["A0A1M4BL28","CHEMBL10592","-200.80","Strong","bg-emerald-900/30 text-emerald-300"],
                ["P28335","CHEMBL4777604","-171.17","Strong","bg-emerald-900/30 text-emerald-300"],
                ["P25815","CHEMBL4856031","-115.96","Weak",""],
                ["P17813","CHEMBL100120","-104.54","Weak",""],
                ["P78334","CHEMBL81923","-99.71","Weak",""],
              ].map(([prot, lig, score, str, cls], i) => (
                <tr key={i} className={`border-b border-slate-700/50 ${i<3?"bg-emerald-900/10":""}`}>
                  <td className="px-3 py-2 font-mono text-slate-300">{prot}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{lig}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-300">{score}</td>
                  <td className={`px-3 py-2 text-center font-semibold ${cls||"text-slate-500"}`}>{str}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">Daha negatif docking skoru → daha güçlü bağlanma. –200 kcal/mol altı "Strong" olarak sınıflandırıldı.</p>
      </div>
    ),
    content_en: (
      <div className="space-y-3">
        <p>Top candidates were subjected to molecular docking with PandaDock. Protein structures were prepared via SwissModel/AlphaFold, ligand structures via RDKit.</p>
        <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400">Protein</th>
                <th className="text-left px-3 py-2 text-slate-400">Ligand</th>
                <th className="text-right px-3 py-2 text-slate-400">Docking (kcal/mol)</th>
                <th className="text-center px-3 py-2 text-slate-400">Strength</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["P02545","CHEMBL11131","-207.11","Strong"],
                ["A0A1M4BL28","CHEMBL10592","-200.80","Strong"],
                ["P28335","CHEMBL4777604","-171.17","Strong"],
                ["P25815","CHEMBL4856031","-115.96","Weak"],
                ["P17813","CHEMBL100120","-104.54","Weak"],
                ["P78334","CHEMBL81923","-99.71","Weak"],
              ].map(([prot, lig, score, str], i) => (
                <tr key={i} className={`border-b border-slate-700/50 ${i<3?"bg-emerald-900/10":""}`}>
                  <td className="px-3 py-2 font-mono text-slate-300">{prot}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{lig}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-300">{score}</td>
                  <td className={`px-3 py-2 text-center font-semibold ${i<3?"text-emerald-300":"text-slate-500"}`}>{str}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">More negative docking score → stronger binding. Below –200 kcal/mol classified as "Strong".</p>
      </div>
    ),
  },
  {
    icon: "📚",
    title_tr: "Literatür Analizi & İlaç Seçimi",
    title_en: "Literature Analysis & Drug Selection",
    content_tr: (
      <div className="space-y-3">
        <p>Docking skorları ve tahmin edilen afinite değerleri, ligand bileşenlerinin mekanizma/yapı benzerliği üzerinden onaylı ilaçlarla ilişkilendirildi. Literatür desteği değerlendirilerek 7 aday belirlendi:</p>
        <div className="space-y-2">
          {[
            {name:"Copanlisib", mech:"PI3K inhibitörü (PI3Kα/δ)", all:"B-ALL dahil B-hücre malignitelerinde pre-klinik kanıt mevcut", highlight:true},
            {name:"Novobiocin", mech:"DNA gyrase inhibitörü (aminocoumarin)", all:"Lösemi hücrelerinde anti-proliferatif etki gösterilmiş", highlight:true},
            {name:"Dutasteride", mech:"5α-redüktaz inhibitörü", all:"Steroid metabolizması üzerinden lösemi proliferasyonuyla bağlantı"},
            {name:"Linezolid", mech:"Oksazolidinon antibiyotik", all:"Mitokondriyal etki ile lösemik hücrelerde apoptoz indüksiyonu"},
            {name:"Iptacopan", mech:"Kompleman inhibitörü", all:"Lösemi mikroçevresinde immün kaçış mekanizması"},
            {name:"Urea C-14", mech:"Metabolizma düzenleyici", all:"Hücresel büyüme yolakları"},
            {name:"Enprofylline", mech:"Enerji metabolizması", all:"Lenfoid malignitelerle bağlantı"},
          ].map((d, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 ${d.highlight?"border-amber-700/50 bg-amber-900/20":"border-slate-700 bg-slate-800/50"}`}>
              <div className="flex items-center gap-2 mb-1">
                {d.highlight && <span className="text-amber-400 text-sm">★</span>}
                <span className={`font-bold text-sm ${d.highlight?"text-amber-300":"text-slate-200"}`}>{d.name}</span>
                <span className="text-xs text-slate-500">— {d.mech}</span>
              </div>
              <p className="text-xs text-slate-400">{d.all}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    content_en: (
      <div className="space-y-3">
        <p>Docking scores and predicted affinities were linked to approved drugs via mechanism/scaffold similarity of ligand components. Literature support was evaluated to identify 7 candidates:</p>
        <div className="space-y-2">
          {[
            {name:"Copanlisib", mech:"PI3K inhibitor (PI3Kα/δ)", all:"Pre-clinical evidence in B-ALL and other B-cell malignancies", highlight:true},
            {name:"Novobiocin", mech:"DNA gyrase inhibitor (aminocoumarin)", all:"Anti-proliferative effect demonstrated in leukemia cells", highlight:true},
            {name:"Dutasteride", mech:"5α-reductase inhibitor", all:"Linked to leukemia proliferation via steroid metabolism"},
            {name:"Linezolid", mech:"Oxazolidinone antibiotic", all:"Apoptosis induction via mitochondrial effects in leukemic cells"},
            {name:"Iptacopan", mech:"Complement inhibitor", all:"Immune evasion in leukemia microenvironment"},
            {name:"Urea C-14", mech:"Metabolic regulator", all:"Cellular growth pathway modulation"},
            {name:"Enprofylline", mech:"Energy metabolism", all:"Lymphoid malignancy association"},
          ].map((d, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 ${d.highlight?"border-amber-700/50 bg-amber-900/20":"border-slate-700 bg-slate-800/50"}`}>
              <div className="flex items-center gap-2 mb-1">
                {d.highlight && <span className="text-amber-400 text-sm">★</span>}
                <span className={`font-bold text-sm ${d.highlight?"text-amber-300":"text-slate-200"}`}>{d.name}</span>
                <span className="text-xs text-slate-500">— {d.mech}</span>
              </div>
              <p className="text-xs text-slate-400">{d.all}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: "✅",
    title_tr: "STING DSS — Seçilen İlaçlar",
    title_en: "STING DSS — Selected Drugs",
    content_tr: (
      <div className="space-y-4">
        <p>Docking doğrulaması ve literatür analizi sonucunda STING projesi kapsamında iki ilaç yeniden konumlandırma adayı olarak belirlendi:</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            {
              name:"Copanlisib", brand:"Aliqopa™", status:"FDA Onaylı (Foliküler Lenfoma)",
              why:"PI3K/Akt yolağını inhibe ederek lösemi hücrelerinin hayatta kalmasını, metabolik regülasyonunu ve proliferasyonunu baskılar.",
              docking:"En güçlü docking adayı (–207.11 kcal/mol, P02545)",
              color:"text-blue-300", border:"border-blue-800/40 bg-blue-900/20"
            },
            {
              name:"Novobiocin", brand:"Albamycin™", status:"Aminocoumarin Antibiyotik",
              why:"DNA gyrase inhibisyonu yoluyla lösemik hücrelerde DNA onarım mekanizmalarını baskılar, mevcut kemoterapi ajanlara duyarlılığı artırır.",
              docking:"En güçlü docking adayı (–200.80 kcal/mol, A0A1M4BL28)",
              color:"text-emerald-300", border:"border-emerald-800/40 bg-emerald-900/20"
            },
          ].map((drug, i) => (
            <div key={i} className={`rounded-2xl border p-4 ${drug.border}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className={`text-lg font-black ${drug.color}`}>{drug.name}</p>
                  <p className="text-xs text-slate-400">{drug.brand} · {drug.status}</p>
                </div>
                <span className={`text-xs font-mono px-2 py-1 rounded-lg bg-slate-800 ${drug.color}`}>{drug.docking}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{drug.why}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-amber-300 font-semibold">✓ Analiz tamamlandı — sonraki adım:</p>
          <span className="text-amber-400 font-bold text-sm">Tedavi Kurulumu →</span>
        </div>
        <div className="rounded-xl border border-indigo-800/40 bg-indigo-900/20 px-4 py-3">
          <p className="text-xs text-indigo-300 font-semibold mb-1">📖 Kaynak:</p>
          <p className="text-xs text-indigo-200">Köse U. & Uysal I. — Drug Repositioning for Childhood Acute Lymphoblastic Leukemia Using an Explainable Regularized Bi-LSTM Ensemble and Molecular Docking Validation. <span className="italic">IEEE Access</span>, 2025. DOI: 10.1109/ACCESS.2025.3599025</p>
        </div>
      </div>
    ),
    content_en: (
      <div className="space-y-4">
        <p>Following docking validation and literature analysis, two drug repurposing candidates were identified within the STING project:</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            {
              name:"Copanlisib", brand:"Aliqopa™", status:"FDA Approved (Follicular Lymphoma)",
              why:"Inhibits PI3K/Akt pathway to suppress leukemia cell survival, metabolic regulation, and proliferation.",
              docking:"En güçlü docking adayı (–207.11 kcal/mol, P02545)",
              color:"text-blue-300", border:"border-blue-800/40 bg-blue-900/20"
            },
            {
              name:"Novobiocin", brand:"Albamycin™", status:"Aminocoumarin Antibiotic",
              why:"Suppresses DNA repair mechanisms in leukemic cells via DNA gyrase inhibition, enhancing sensitivity to existing chemotherapy agents.",
              docking:"En güçlü docking adayı (–200.80 kcal/mol, A0A1M4BL28)",
              color:"text-emerald-300", border:"border-emerald-800/40 bg-emerald-900/20"
            },
          ].map((drug, i) => (
            <div key={i} className={`rounded-2xl border p-4 ${drug.border}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className={`text-lg font-black ${drug.color}`}>{drug.name}</p>
                  <p className="text-xs text-slate-400">{drug.brand} · {drug.status}</p>
                </div>
                <span className={`text-xs font-mono px-2 py-1 rounded-lg bg-slate-800 ${drug.color}`}>{drug.docking}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{drug.why}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-amber-300 font-semibold">✓ Analysis complete — next step:</p>
          <span className="text-amber-400 font-bold text-sm">Patient & Treatment Setup →</span>
        </div>
        <div className="rounded-xl border border-indigo-800/40 bg-indigo-900/20 px-4 py-3">
          <p className="text-xs text-indigo-300 font-semibold mb-1">📖 Reference:</p>
          <p className="text-xs text-indigo-200">Köse U. & Uysal I. — Drug Repositioning for Childhood Acute Lymphoblastic Leukemia Using an Explainable Regularized Bi-LSTM Ensemble and Molecular Docking Validation. <span className="italic">IEEE Access</span>, 2025. DOI: 10.1109/ACCESS.2025.3599025</p>
        </div>
      </div>
    ),
  },
];

function ResearchStoryModal({ dark, isOpen, onClose, lang }) {
  const d = dark;
  const isEN = lang === "en";
  const [step, setStep] = useState(0);
  const total = STORY_STEPS.length;

  if (!isOpen) return null;

  const s = STORY_STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.75)"}}>
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] ${d?"bg-slate-900 border-slate-700":"bg-white border-slate-200"}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${d?"border-slate-700":"border-slate-200"}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className={`text-xs font-medium ${d?"text-slate-500":"text-slate-400"}`}>
                {isEN?"Research Story":"Araştırma Hikayesi"} — {step+1}/{total}
              </p>
              <p className={`font-bold text-base ${d?"text-slate-100":"text-slate-800"}`}>
                {isEN ? s.title_en : s.title_tr}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${d?"hover:bg-slate-800 text-slate-400":"hover:bg-slate-100 text-slate-500"}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className={`h-1 flex-shrink-0 ${d?"bg-slate-800":"bg-slate-100"}`}>
          <div className="h-1 bg-indigo-500 transition-all duration-300" style={{width:`${((step+1)/total)*100}%`}}/>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 text-sm ${d?"text-slate-300":"text-slate-700"}`}>
          {isEN ? s.content_en : s.content_tr}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t flex-shrink-0 ${d?"border-slate-700":"border-slate-200"}`}>
          <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={step===0}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${step===0?d?"text-slate-600 cursor-not-allowed":"text-slate-300 cursor-not-allowed":d?"bg-slate-800 hover:bg-slate-700 text-slate-200":"bg-slate-100 hover:bg-slate-200 text-slate-700"}`}>
            ← {isEN?"Previous":"Önceki"}
          </button>
          <div className="flex gap-1.5">
            {Array.from({length:total}).map((_,i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${i===step?"bg-indigo-500 w-4":d?"bg-slate-700 hover:bg-slate-500":"bg-slate-300 hover:bg-slate-400"}`}/>
            ))}
          </div>
          {step < total-1 ? (
            <button onClick={() => setStep(s => s+1)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
              {isEN?"Next":"Sonraki"} →
            </button>
          ) : (
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all">
              {isEN?"Finish":"Tamamla"} ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Tab1Repurposing({ onComplete, dark, onGoTo }) {
  const { t, lang } = useLang();

  // Sub-tab
  const [subTab, setSubTab] = useState("predict");
  const [storyOpen, setStoryOpen] = useState(false);

  // Wizard

  // Form
  const [ligandFile,  setLigandFile]  = useState(null);
  const [proteinFile, setProteinFile] = useState(null);
  const [topN,        setTopN]        = useState(20);
  const [pairMode,    setPairMode]    = useState("all_vs_all");
  const [sessionName, setSessionName] = useState("");

  // Results
  const [status,  setStatus]  = useState("idle");
  const [error,   setError]   = useState(null);
  const [results, setResults] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // XAI
  const [xaiRow,     setXaiRow]     = useState(null);
  const [xaiMethod,  setXaiMethod]  = useState("lime");
  const [xaiResult,  setXaiResult]  = useState(null);
  const [xaiLoading, setXaiLoading] = useState(false);

  // Code viewer
  const [codeModule,  setCodeModule]  = useState(null);
  const [codeSource,  setCodeSource]  = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  const [elapsed,   setElapsed]   = useState(0);
  const abortRef    = useRef(null);
  const elapsedRef  = useRef(null);

  // Status colors
  const statusColor = { idle: dark ? "text-gray-500" : "text-gray-500", running: "text-blue-500", done: "text-green-500", error: "text-red-500" };
  const statusDot   = { idle: dark ? "bg-gray-700" : "bg-gray-300", running: "bg-blue-500 animate-pulse", done: "bg-green-500", error: "bg-red-500" };
  const statusLabel = { idle: t("statusReady"), running: t("statusRunning"), done: t("statusDone"), error: t("statusError") };

  // ── Prediction ─────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    // Çalışıyorsa durdur
    if (status === "running") {
      if (abortRef.current) abortRef.current.abort();
      clearInterval(elapsedRef.current);
      setStatus("idle"); setError(null); setElapsed(0);
      return;
    }
    if (!ligandFile || !proteinFile) { setError("Lütfen hem ligand hem protein dosyasını seçin."); return; }
    abortRef.current = new AbortController();
    setStatus("running"); setError(null); setResults(null); setXaiResult(null); setXaiRow(null); setElapsed(0);
    const t0 = Date.now();
    elapsedRef.current = setInterval(() => setElapsed((Date.now()-t0)/1000), 500);
    try {
      const data = await runRepurposing({ ligandFile, proteinFile, topN, pairMode, sessionName }, abortRef.current.signal);
      clearInterval(elapsedRef.current);
      setResults(data);
      setStatus("done");
      if (onComplete) onComplete(data.session_id, data);
    } catch (e) {
      clearInterval(elapsedRef.current);
      if (e.name === "AbortError") { setStatus("idle"); setElapsed(0); return; }
      setError(e.message); setStatus("error");
    }
  }, [ligandFile, proteinFile, topN, pairMode, sessionName, onComplete, status]);

  // ── XAI ────────────────────────────────────────────────────────────────
  const handleExplain = useCallback(async (row) => {
    setXaiRow(row); setXaiResult(null); setXaiLoading(true);
    try {
      const res = await explainPair({ smiles: row.smiles, proteinSeq: row.protein_seq, method: xaiMethod });
      setXaiResult(res);
    } catch (e) { setXaiResult({ error: e.message }); }
    finally { setXaiLoading(false); }
  }, [xaiMethod]);

  // ── Code ───────────────────────────────────────────────────────────────
  const handleCodeView = useCallback(async (mod) => {
    if (codeModule === mod) { setCodeModule(null); return; }
    setCodeLoading(true); setCodeModule(mod);
    try {
      const res = await getSourceCode(mod);
      setCodeSource(res.source);
    } catch (e) { setCodeSource(`# ${e.message}`); }
    finally { setCodeLoading(false); }
  }, [codeModule]);

  const rows = results?.top_candidates ?? [];
  const displayRows = showAll ? rows : rows.slice(0, 10);

  const d = dark;
  const card = `rounded-2xl border ${d ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`;
  const inp  = `w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
    d ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-800"
  }`;

  return (
    <div className="space-y-5">


      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={`text-lg font-semibold ${d ? "text-gray-100" : "text-gray-800"}`}>{t("tab1Title")}</h2>
          <p className={`text-sm mt-0.5 ${d ? "text-gray-500" : "text-gray-500"}`}>{t("tab1Subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${statusColor[status]}`}>
            <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
            {statusLabel[status]}
          </div>
        </div>
      </div>

      {/* ── Araştırma Hikayesi Butonu ── */}
      <div className="flex justify-center">
        <button onClick={() => setStoryOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            d
              ? "bg-indigo-700 hover:bg-indigo-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
          {lang==="en"?"📖 Research Story — Read the repurposing journey and continue, or use this tab to experience the full process":"📖 Araştırma Hikayesi — Yeniden konumlandırma hikayesini okuyun, sonraki sekmeye geçin (ya da bu sekmeyi kullanarak bütün süreci deneyimleyin)"}
        </button>
      </div>

      {/* ── Nasıl Kullanılır ── */}
      <HowToUse dark={d} steps={lang==="en" ? [
        {title:"Check Model Status", desc:"Verify that the .h5 file and tokenizer pickles are loaded in the 'Model Status' panel. If missing, run the tokenizer generator script."},
        {title:"Upload Files", desc:"Upload ligands.txt (SMILES JSON) and proteins.txt (protein sequence JSON or FASTA)."},
        {title:"Run Prediction", desc:"Select Top-N candidates and pairing mode. Click 'Run Prediction'."},
        {title:"Review Results", desc:"Candidate drugs are ranked by affinity. Get XAI explanation or search CHEMBL/PubChem for each drug."},
        {title:"Docking Validation (Optional)", desc:"Run docking analysis for identified candidates in the 'Molecular Docking' sub-tab."},
      ] : [
        {title:"Model Durumunu Kontrol Edin", desc:"'Model Durumu' panelinde .h5 dosyası ve tokenizer pickle'larının yüklü olduğunu doğrulayın. Eksikse tokenizer oluşturucu scripti çalıştırın."},
        {title:"Dosyaları Yükleyin", desc:"ligands.txt (SMILES JSON) ve proteins.txt (protein sekans JSON veya FASTA) dosyalarını yükleyin."},
        {title:"Tahmini Başlatın", desc:"Top-N aday sayısını ve eşleştirme modunu seçin. 'Tahmin Başlat' butonuna tıklayın."},
        {title:"Sonuçları İnceleyin", desc:"Aday ilaçlar afiniteye göre sıralanır. Her ilaç için XAI açıklaması alabilir veya CHEMBL/PubChem'de arayabilirsiniz."},
        {title:"Docking Doğrulama (İsteğe Bağlı)", desc:"'Moleküler Docking' alt sekmesinde belirlenen adaylar için docking analizi yapabilirsiniz."},
      ]}/>

      {/* ── Model status ── */}
      <ModelStatusPanel dark={d} />

      {/* ── Sub-tab bar ── */}
      <div className={card}>
        <SubTabBar active={subTab} onChange={setSubTab} dark={d} />

        <div className="p-5">

          {/* ═══════════════ PREDICT TAB ═══════════════ */}
          {subTab === "predict" && (
            <div className="space-y-5">

              {/* ── Run butonu EN ÜSTTE ── */}
              <div className={`flex-col gap-3 p-3 rounded-xl border ${d?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-3">
                <button onClick={handleRun}
                  className={`flex-shrink-0 font-semibold px-6 py-2.5 rounded-xl transition-all text-sm shadow-lg text-white ${
                    status==="running"
                      ?"bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-500/20"
                      :"bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-blue-500/20"
                  }`}>
                  {status === "running"
                    ? <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                        {lang==="en"?"■ Stop":"■ Durdur"}
                      </span>
                    : t("runPrediction")}
                </button>
                <div className="flex gap-2 flex-wrap">
                  {ligandFile && <span className={`text-xs px-2 py-1 rounded-lg ${d?"bg-blue-500/20 text-blue-300":"bg-blue-100 text-blue-700"}`}>
                    📄 {ligandFile.name}
                  </span>}
                  {proteinFile && <span className={`text-xs px-2 py-1 rounded-lg ${d?"bg-green-500/20 text-green-300":"bg-green-100 text-green-700"}`}>
                    🧬 {proteinFile.name}
                  </span>}
                  {!ligandFile && !proteinFile && (
                    <span className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>
                      {t("ligandFile")} + {t("proteinFile")} {t("required") || "gerekli"}
                    </span>
                  )}
                </div>
                {error && <p className="text-xs text-red-400 ml-auto">{error}</p>}
                </div>
                {/* Progress bar — tahmin çalışırken */}
                {status === "running" && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={d?"text-blue-400":"text-blue-600"}>
                        {lang==="en"?"Running prediction model…":"Tahmin modeli çalışıyor…"}
                      </span>
                      <span className={d?"text-gray-500":"text-gray-400"}>{elapsed.toFixed(0)}s</span>
                    </div>
                    <div className={`w-full rounded-full h-1.5 overflow-hidden ${d?"bg-gray-700":"bg-gray-200"}`}>
                      <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" style={{width:"100%"}}/>
                    </div>
                    <p className={`text-xs mt-1 ${d?"text-gray-600":"text-gray-400"}`}>
                      {lang==="en"
                        ?"This may take 30–120 seconds depending on pair count. Click ■ Stop to cancel."
                        :"Çift sayısına bağlı olarak 30–120 saniye sürebilir. ■ Durdur ile iptal edebilirsiniz."}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Tamamlandı bildirimi (run butonunun hemen altında) ── */}
              {results && (
                <NextTabBanner
                  dark={d}
                  metrics={`${results.stats.top_n} aday · ${results.stats.n_pairs} çift · ${results.stats.n_ligands} ligand`}
                  nextTab="tab2"
                  nextLabel={lang === "en" ? "Tab 2 — Set Parameters" : "Tab 2 — Parametreleri Ayarla"}
                  onGoTo={onGoTo}
                />
              )}

              {/* File upload */}
              <div className={`rounded-xl border p-4 space-y-4 ${d ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs font-medium mb-1.5 ${d ? "text-gray-400" : "text-gray-600"}`}>
                      {t("ligandFile")} <span className={`font-normal ${d ? "text-gray-600" : "text-gray-400"}`}>— {t("supportedFormats")}</span>
                    </p>
                    <FileDropZone label={t("ligandFilePlaceholder")} accept=".txt,.json,.csv"
                                  file={ligandFile} onChange={setLigandFile} dark={d} />
                  </div>
                  <div>
                    <p className={`text-xs font-medium mb-1.5 ${d ? "text-gray-400" : "text-gray-600"}`}>
                      {t("proteinFile")} <span className={`font-normal ${d ? "text-gray-600" : "text-gray-400"}`}>— {t("supportedFormats")}</span>
                    </p>
                    <FileDropZone label={t("proteinFilePlaceholder")} accept=".txt,.json,.fasta,.fa"
                                  file={proteinFile} onChange={setProteinFile} dark={d} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${d ? "text-gray-400" : "text-gray-600"}`}>{t("sessionName")}</label>
                    <input type="text" value={sessionName} onChange={e => setSessionName(e.target.value)}
                           placeholder={t("sessionNamePlaceholder")} className={inp} />
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${d ? "text-gray-400" : "text-gray-600"}`}>{t("topNCandidates")}</label>
                    <input type="number" min={5} max={100} value={topN} onChange={e => setTopN(Number(e.target.value))} className={inp} />
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${d ? "text-gray-400" : "text-gray-600"}`}>{t("pairingMode")}</label>
                    <select value={pairMode} onChange={e => setPairMode(e.target.value)} className={inp}>
                      <option value="all_vs_all">{t("allVsAll")}</option>
                      <option value="paired">{t("paired")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Results */}
              {results && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <MetricCard label={t("ligandCount")}  value={results.stats.n_ligands}  dark={d} />
                    <MetricCard label={t("proteinCount")} value={results.stats.n_proteins} dark={d} />
                    <MetricCard label={t("pairCount")}    value={results.stats.n_pairs}    dark={d} />
                    <MetricCard label={t("topCount")}     value={results.stats.top_n}      dark={d} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <PlotPanel title={t("scatterTitle")} b64={results.plots?.scatter} dark={d} />
                    <PlotPanel title={t("heatmapTitle")} b64={results.plots?.heatmap} dark={d} />
                  </div>

                  {/* Candidate table */}
                  <div className={card}>
                    <div className={`px-5 py-3 border-b flex items-center justify-between ${d ? "border-gray-800" : "border-gray-100"}`}>
                      <h3 className={`text-sm font-semibold ${d ? "text-gray-200" : "text-gray-800"}`}>{t("candidateTableTitle")}</h3>
                      <span className={`text-xs ${d ? "text-gray-500" : "text-gray-400"}`}>{rows.length} {t("candidateTableDesc")}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className={d ? "bg-gray-800" : "bg-gray-50"}>
                          <tr>
                            {[t("rankCol"), t("drugCol"), t("proteinCol"), t("affinityCol"), "Links", t("xaiCol")].map(h => (
                              <th key={h} className={`px-4 py-2.5 text-left text-xs font-medium ${d ? "text-gray-500" : "text-gray-500"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${d ? "divide-gray-800" : "divide-gray-50"}`}>
                          {displayRows.map((row, i) => (
                            <tr key={i} className={`transition-colors ${d ? "hover:bg-gray-800/50" : "hover:bg-gray-50"}`}>
                              <td className={`px-4 py-2.5 font-mono text-xs ${d ? "text-gray-500" : "text-gray-400"}`}>{row.rank}</td>
                              <td className="px-4 py-2.5">
                                <p className={`font-medium text-xs ${d ? "text-gray-200" : "text-gray-800"}`}>{row.drug_name}</p>
                                <p className={`text-xs font-mono truncate max-w-xs ${d ? "text-gray-600" : "text-gray-400"}`}>{row.smiles?.slice(0, 25)}…</p>
                              </td>
                              <td className={`px-4 py-2.5 text-xs font-mono ${d ? "text-gray-400" : "text-gray-600"}`}>{row.protein_name}</td>
                              <td className={`px-4 py-2.5 font-mono text-xs font-semibold ${d ? "text-blue-400" : "text-blue-700"}`}>
                                {typeof row.predicted_affinity === "number" ? row.predicted_affinity.toFixed(4) : row.predicted_affinity}
                              </td>
                              <td className="px-4 py-2.5">
                                <ExternalLinks smiles={row.smiles} drugName={row.drug_name} dark={d} />
                              </td>
                              <td className="px-4 py-2.5">
                                <button onClick={() => handleExplain(row)}
                                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                                    d ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                                  }`}>{t("explainBtn")}</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > 10 && (
                      <div className={`px-5 py-3 border-t ${d ? "border-gray-800" : "border-gray-100"}`}>
                        <button onClick={() => setShowAll(s => !s)} className="text-sm text-blue-500 hover:underline">
                          {showAll ? t("showLess") : `${t("showAll")} (${rows.length})`}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* XAI panel */}
                  {xaiRow && (
                    <div className={`${card} p-5 space-y-3 border-purple-500/30`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-semibold ${d ? "text-gray-200" : "text-gray-800"}`}>
                          {t("xaiTitle")} — {xaiRow.drug_name}
                        </h3>
                        <div className="flex gap-2">
                          {["lime", "attention"].map(m => (
                            <button key={m} onClick={() => setXaiMethod(m)}
                              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                                xaiMethod === m
                                  ? "bg-purple-600 text-white border-purple-600"
                                  : d ? "border-gray-700 text-gray-400 hover:border-purple-600" : "border-gray-200 text-gray-600 hover:border-purple-400"
                              }`}>{m.toUpperCase()}</button>
                          ))}
                          <button onClick={() => handleExplain(xaiRow)}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg transition-colors">
                            {xaiLoading ? t("xaiCalculating") : t("xaiCalc")}
                          </button>
                        </div>
                      </div>
                      {xaiResult?.error && <p className="text-sm text-red-400">{xaiResult.error}</p>}
                      {xaiResult?.plot_b64 && (
                        <img src={`data:image/png;base64,${xaiResult.plot_b64}`} alt="XAI" className="w-full rounded-xl" />
                      )}
                    </div>
                  )}

                  {/* Completion banner */}
                  <div className={`rounded-2xl border p-5 ${d ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${d ? "bg-green-500/20 text-green-400" : "bg-green-600 text-white"}`}>✓</div>
                      <div>
                        <p className={`text-sm font-semibold ${d ? "text-green-400" : "text-green-800"}`}>{t("tab1Complete")}</p>
                        <p className={`text-xs mt-0.5 ${d ? "text-green-500" : "text-green-700"}`}>
                          {results.stats.top_n} {t("tab1CompleteDesc1")} <span className="font-mono">{results.session_id}</span>
                        </p>
                        <p className={`text-xs mt-2 ${d ? "text-green-600" : "text-green-600"}`}>{t("tab1CompleteDesc2")}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════ DOCKING TAB ═══════════════ */}
          {subTab === "docking" && (
            <DockingPanel dark={d} candidates={results?.top_candidates ?? []} />
          )}

          {/* ═══════════════ TRAIN TAB ═══════════════ */}
          {subTab === "train" && (
            <TrainingPanel
              dark={d}
              onModelLoaded={(filename) => {
                setResults(null);
                setStatus("idle");
                setError(`"${filename}" yüklendi. Tahmini yeniden çalıştırın.`);
              }}
            />
          )}


        </div>
      </div>
      {/* Araştırma Hikayesi Modal */}
      <ResearchStoryModal
        dark={d}
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
        lang={lang}
      />
    </div>
  );
}
