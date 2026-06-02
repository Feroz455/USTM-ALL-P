// src/components/ui/DockingPanel.jsx
import { useState } from "react";
import { useLang } from "../../i18n/LangContext";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
function getToken() { return localStorage.getItem("sting_token"); }

export default function DockingPanel({ dark, candidates = [] }) {
  const { t } = useLang();
  const [ligandFile,  setLigandFile]  = useState(null);
  const [proteinFile, setProteinFile] = useState(null);
  const [selectedLigand, setSelectedLigand] = useState("");
  const [running,  setRunning]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  const topCandidates = candidates.slice(0, 10);

  const handleRun = async () => {
    if (!ligandFile && !selectedLigand) { setError("Ligand dosyası veya aday ligand seçin."); return; }
    if (!proteinFile) { setError("Protein PDB dosyası gerekli."); return; }

    setRunning(true); setError(null); setResult(null);
    const form = new FormData();
    if (ligandFile)    form.append("ligand_file",  ligandFile);
    if (proteinFile)   form.append("protein_file", proteinFile);
    if (selectedLigand) form.append("smiles", selectedLigand);

    try {
      const res = await fetch(`${BASE}/repurposing/docking`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Docking hatası");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const inp = `w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
    dark ? "bg-gray-800 border-gray-700 text-gray-200 focus:ring-blue-500"
         : "bg-white border-gray-200 text-gray-800 focus:ring-blue-400"
  }`;

  const card = `rounded-xl border p-5 space-y-4 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className={`rounded-xl border px-4 py-3 flex gap-3 ${dark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"}`}>
        <span className="text-blue-500 text-lg flex-shrink-0">⚗️</span>
        <div>
          <p className={`text-sm font-medium ${dark ? "text-blue-300" : "text-blue-800"}`}>{t("dockingTitle")}</p>
          <p className={`text-xs mt-0.5 ${dark ? "text-blue-400" : "text-blue-600"}`}>{t("dockingDesc")}</p>
        </div>
      </div>

      <div className={card}>
        {/* Ligand: from candidates or upload */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${dark ? "text-gray-400" : "text-gray-600"}`}>{t("dockingSelectLigand")}</p>
          {topCandidates.length > 0 ? (
            <select value={selectedLigand} onChange={e => setSelectedLigand(e.target.value)} className={inp}>
              <option value="">— SMILES seçin —</option>
              {topCandidates.map((c, i) => (
                <option key={i} value={c.smiles}>{c.drug_name} (Rank {c.rank})</option>
              ))}
            </select>
          ) : (
            <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              Önce Tahmin sekmesinde çalıştırın — top adaylar burada görünecek.
            </p>
          )}
          <p className={`text-xs mt-2 ${dark ? "text-gray-500" : "text-gray-500"}`}>veya</p>
          <label className={`mt-2 flex flex-col items-center justify-center h-16 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dark ? "border-gray-700 hover:border-gray-600" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
          }`}>
            <p className="text-xs text-gray-400">
              {ligandFile ? <span className="text-blue-500">{ligandFile.name}</span> : t("dockingUploadLigand")}
            </p>
            <input type="file" className="hidden" accept=".sd,.mol,.sdf"
                   onChange={e => setLigandFile(e.target.files[0])} />
          </label>
        </div>

        {/* Protein PDB */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${dark ? "text-gray-400" : "text-gray-600"}`}>{t("dockingSelectProtein")}</p>
          <label className={`flex flex-col items-center justify-center h-16 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dark ? "border-gray-700 hover:border-gray-600" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
          }`}>
            <p className="text-xs text-gray-400">
              {proteinFile ? <span className="text-blue-500">{proteinFile.name}</span> : t("dockingUploadPDB")}
            </p>
            <input type="file" className="hidden" accept=".pdb,.pdbqt"
                   onChange={e => setProteinFile(e.target.files[0])} />
          </label>
        </div>

        {/* Note */}
        <div className={`text-xs rounded-lg px-3 py-2 ${dark ? "bg-gray-800 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
          ℹ️ {t("dockingNote")}
        </div>

        {error && <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</div>}

        <button onClick={handleRun} disabled={running}
          className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all text-sm">
          {running ? t("dockingRunning") : t("dockingRun")}
        </button>
      </div>

      {/* Results */}
      <div className={card}>
        <p className={`text-sm font-semibold ${dark ? "text-gray-200" : "text-gray-800"}`}>{t("dockingResultsTitle")}</p>
        {!result ? (
          <p className={`text-sm text-center py-8 ${dark ? "text-gray-600" : "text-gray-400"}`}>{t("dockingNoResults")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-lg p-3 text-center ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{t("dockingBindingAffinity")}</p>
                <p className={`text-lg font-bold font-mono mt-1 ${dark ? "text-green-400" : "text-green-600"}`}>
                  {result.binding_affinity ?? "—"}
                </p>
              </div>
              <div className={`rounded-lg p-3 text-center ${dark ? "bg-gray-800" : "bg-gray-50"}`}>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{t("dockingPose")}</p>
                <p className={`text-lg font-bold font-mono mt-1 ${dark ? "text-blue-400" : "text-blue-600"}`}>
                  {result.best_pose ?? "—"}
                </p>
              </div>
            </div>
            {result.plot_b64 && (
              <img src={`data:image/png;base64,${result.plot_b64}`} alt="Docking pose" className="w-full rounded-xl" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
