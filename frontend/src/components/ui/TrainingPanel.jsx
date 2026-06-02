// src/components/ui/TrainingPanel.jsx
// Tamamen bağımsız bileşen — Tab1Repurposing.jsx içinde import edilir
import { useState, useEffect, useRef, useCallback } from "react";
import { useLang } from "../../i18n/LangContext";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

function getToken() {
  return localStorage.getItem("sting_token");
}

async function apiReq(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Hata");
  return data;
}

// ── Mini components ────────────────────────────────────────────────────────

function ProgressBar({ value, max, label, color = "bg-blue-500" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800 font-mono">{value ?? "—"}</p>
    </div>
  );
}

function FileZone({ label, file, onChange, accept }) {
  return (
    <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
      <p className="text-xs text-gray-500">
        {file
          ? <span className="text-blue-600 font-medium">{file.name}</span>
          : label}
      </p>
      <input type="file" className="hidden" accept={accept}
             onChange={e => onChange(e.target.files[0])} />
    </label>
  );
}

// ── Main TrainingPanel ─────────────────────────────────────────────────────

export default function TrainingPanel({ onModelLoaded, dark }) {
  const { t } = useLang();
  const d = dark;
  // Panel open/close
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("train"); // train | models

  // Files
  const [ligandFile, setLigandFile]   = useState(null);
  const [proteinFile, setProteinFile] = useState(null);
  const [affinityFile, setAffinityFile] = useState(null);

  // Config
  const [cfg, setCfg] = useState({
    lstm_units_1: 128,
    lstm_units_2: 64,
    dropout_rate: 0.5,
    l2_reg: 0.01,
    embedding_dim: 128,
    epochs: 50,
    batch_size: 32,
    optimizer: "adam",
    early_stopping_patience: 8,
    use_hpo: false,
    hpo_max_trials: 10,
    model_filename: "bilstm_trained.h5",
    pair_mode: "all_vs_all",
  });

  // Job state
  const [jobId, setJobId]         = useState(null);
  const [progress, setProgress]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);
  const pollRef                   = useRef(null);

  // Models list
  const [models, setModels]       = useState([]);
  const [loadingModel, setLoadingModel] = useState(null);

  const setProp = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  // ── Polling ──────────────────────────────────────────────────────────────

  const startPolling = useCallback((jid) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const data = await apiReq(`/training/progress/${jid}`);
        setProgress(data);
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          if (data.status === "completed") fetchModels();
        }
      } catch (e) {
        console.warn("Poll error:", e);
      }
    }, 2000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Fetch model list ─────────────────────────────────────────────────────

  const fetchModels = useCallback(async () => {
    try {
      const data = await apiReq("/training/models");
      setModels(data.models || []);
    } catch (e) {
      console.warn("Model list error:", e);
    }
  }, []);

  useEffect(() => { if (open) fetchModels(); }, [open, fetchModels]);

  // ── Start training ────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!ligandFile || !proteinFile || !affinityFile) {
      setError("Lütfen ligand, protein ve afinite (Y.tab) dosyalarını seçin.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setProgress(null);

    const form = new FormData();
    form.append("ligand_file", ligandFile);
    form.append("protein_file", proteinFile);
    form.append("affinity_file", affinityFile);
    Object.entries(cfg).forEach(([k, v]) => form.append(k, String(v)));

    try {
      const res = await fetch(`${BASE}/training/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Hata");

      setJobId(data.job_id);
      setProgress({ status: "running", phase: "starting", epoch: 0,
                    total_epochs: cfg.epochs, message: "Başlatılıyor…" });
      startPolling(data.job_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Load model ────────────────────────────────────────────────────────────

  const handleLoad = async (filename) => {
    setLoadingModel(filename);
    try {
      await apiReq(`/training/load/${encodeURIComponent(filename)}`, { method: "POST" });
      if (onModelLoaded) onModelLoaded(filename);
      alert(`✓ "${filename}" aktif model olarak yüklendi.`);
    } catch (e) {
      alert(`Yükleme hatası: ${e.message}`);
    } finally {
      setLoadingModel(null);
    }
  };

  // ── Status helpers ────────────────────────────────────────────────────────

  const statusColor = {
    starting: "text-blue-500", running: "text-blue-600",
    completed: "text-green-600", failed: "text-red-600",
  };
  const statusLabel = {
    starting: "Başlatılıyor", running: "Eğitim devam ediyor",
    completed: "Tamamlandı", failed: "Hata oluştu",
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`rounded-2xl border overflow-hidden ${d ? "border-orange-500/30 bg-gray-900" : "border-orange-200 bg-white"}`}>

      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors text-left ${d ? "hover:bg-gray-800" : "hover:bg-orange-50"}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🏋️</span>
          <div>
            <p className={`text-sm font-semibold ${d ? "text-gray-200" : "text-gray-800"}`}>{t("trainTitle")}</p>
            <p className={`text-xs ${d ? "text-gray-500" : "text-gray-400"}`}>{t("trainDesc")}</p>
          </div>
        </div>
        <span className={`text-sm ${d ? "text-gray-500" : "text-gray-400"}`}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={`border-t ${d ? "border-gray-800" : "border-orange-100"}`}>
          {/* Sub-tabs */}
          <div className={`flex border-b ${d ? "border-gray-800" : "border-gray-100"}`}>
            {[["train", t("trainSubNew")], ["models", t("trainSubModels")]].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                  activeSection === id
                    ? `border-b-2 border-orange-500 ${d ? "text-orange-400" : "text-orange-700"}`
                    : d ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5">

            {/* ── Train section ── */}
            {activeSection === "train" && (
              <>
                {/* Files */}
                <div>
                  <p className={`text-xs font-semibold mb-2 ${d ? "text-gray-400" : "text-gray-600"}`}>{t("trainFiles")}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      [t("trainLigandFile"),  ".txt,.json",       ligandFile,   setLigandFile],
                      [t("trainProteinFile"), ".txt,.json,.fasta", proteinFile,  setProteinFile],
                      [t("trainAffinityFile"),".tab,.tsv,.txt",   affinityFile, setAffinityFile],
                    ].map(([label, accept, file, setFile]) => (
                      <div key={label}>
                        <p className={`text-xs mb-1 ${d ? "text-gray-500" : "text-gray-500"}`}>{label}</p>
                        <label className={`flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                          d ? "border-gray-700 hover:border-orange-500/50" : "border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                        }`}>
                          <p className="text-xs text-gray-400">
                            {file ? <span className="text-orange-500">{file.name}</span> : label}
                          </p>
                          <input type="file" className="hidden" accept={accept}
                                 onChange={e => setFile(e.target.files[0])} />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Architecture config */}
                <div>
                  <p className={`text-xs font-semibold mb-2 ${d ? "text-gray-400" : "text-gray-600"}`}>{t("trainArchitecture")}</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      ["LSTM Unit 1", "lstm_units_1"], ["LSTM Unit 2", "lstm_units_2"],
                      ["Dropout",     "dropout_rate"], ["L2 Reg",      "l2_reg"],
                      ["Embedding",   "embedding_dim"], ["Epoch",       "epochs"],
                      ["Batch size",  "batch_size"],   ["Early stop",  "early_stopping_patience"],
                    ].map(([label, key]) => (
                      <div key={key}>
                        <label className={`text-xs block mb-1 ${d ? "text-gray-500" : "text-gray-500"}`}>{label}</label>
                        <input type="number" value={cfg[key]}
                          step={key.includes("rate") || key.includes("reg") ? 0.01 : 1}
                          onChange={e => setProp(key, Number(e.target.value))}
                          className={`w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none ${
                            d ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-800"
                          }`} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Training config */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`text-xs block mb-1 ${d ? "text-gray-500" : "text-gray-500"}`}>Optimizer</label>
                    <select value={cfg.optimizer} onChange={e => setProp("optimizer", e.target.value)}
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none ${
                        d ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200"
                      }`}>
                      {["adam", "rmsprop", "nadam"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs block mb-1 ${d ? "text-gray-500" : "text-gray-500"}`}>{t("trainSaved")} (.h5)</label>
                    <input type="text" value={cfg.model_filename} onChange={e => setProp("model_filename", e.target.value)}
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none ${
                        d ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200"
                      }`} />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                      <input type="checkbox" checked={cfg.use_hpo}
                        onChange={e => setProp("use_hpo", e.target.checked)}
                        className="w-4 h-4 rounded accent-orange-500" />
                      <span className={`text-xs ${d ? "text-gray-400" : "text-gray-600"}`}>HPO (keras_tuner)</span>
                    </label>
                    {cfg.use_hpo && (
                      <div>
                        <label className={`text-xs block mb-1 ${d ? "text-gray-500" : "text-gray-500"}`}>HPO trials</label>
                        <input type="number" min={3} max={50} value={cfg.hpo_max_trials}
                          onChange={e => setProp("hpo_max_trials", Number(e.target.value))}
                          className={`w-20 border rounded-lg px-2 py-1.5 text-sm ${
                            d ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200"
                          }`} />
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm">{error}</div>
                )}

                <button onClick={handleStart}
                  disabled={submitting || progress?.status === "running"}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-all text-sm">
                  {submitting ? t("trainPreparing")
                   : progress?.status === "running" ? t("trainInProgress")
                   : t("trainStart")}
                </button>

                {/* Progress */}
                {progress && (
                  <div className={`rounded-xl border p-4 space-y-3 ${d ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        progress.status === "completed" ? "text-green-500"
                        : progress.status === "failed"    ? "text-red-500"
                        : "text-blue-500"
                      }`}>
                        {progress.status === "completed" ? t("trainCompleted")
                         : progress.status === "failed"   ? t("trainFailed")
                         : t("trainInProgress")}
                      </span>
                      <span className={`text-xs font-mono ${d ? "text-gray-500" : "text-gray-400"}`}>{progress.elapsed_sec}s</span>
                    </div>
                    <p className={`text-xs ${d ? "text-gray-500" : "text-gray-500"}`}>{progress.message}</p>
                    {progress.total_epochs > 0 && (
                      <ProgressBar value={progress.epoch} max={progress.total_epochs}
                        label={`Epoch ${progress.epoch} / ${progress.total_epochs}`}
                        color={progress.status === "completed" ? "bg-green-500" : "bg-orange-500"} />
                    )}
                    {progress.epoch > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        <MetricPill label="Train loss" value={progress.train_loss} />
                        <MetricPill label="Val loss"   value={progress.val_loss} />
                        <MetricPill label="Best val"   value={progress.best_val_loss} />
                        <MetricPill label="Val MAE"    value={progress.val_mae} />
                      </div>
                    )}
                    {progress.status === "completed" && progress.full_metrics && (
                      <div className={`mt-2 pt-3 border-t ${d ? "border-gray-700" : "border-gray-200"}`}>
                        <p className={`text-xs font-semibold mb-2 ${d ? "text-gray-400" : "text-gray-600"}`}>Test seti</p>
                        <div className="grid grid-cols-4 gap-2">
                          <MetricPill label="MSE"     value={progress.full_metrics.mse} />
                          <MetricPill label="MAE"     value={progress.full_metrics.mae} />
                          <MetricPill label="R²"      value={progress.full_metrics.r2} />
                          <MetricPill label="C-index" value={progress.full_metrics.c_index} />
                        </div>
                        <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5 text-xs text-green-400">
                          ✓ {t("trainSaved")}: <span className="font-mono">{cfg.model_filename}</span>
                        </div>
                      </div>
                    )}
                    {progress.status === "failed" && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-xs text-red-400">{progress.message}</div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Models section ── */}
            {activeSection === "models" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${d ? "text-gray-500" : "text-gray-500"}`}>{models.length} model</p>
                  <button onClick={fetchModels} className="text-xs text-blue-500 hover:underline">{t("trainRefresh")}</button>
                </div>
                {models.length === 0 && (
                  <p className={`text-sm text-center py-6 ${d ? "text-gray-600" : "text-gray-400"}`}>{t("trainNoModels")}</p>
                )}
                {models.map((m, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${d ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${d ? "text-gray-200" : "text-gray-800"}`}>{m.filename}</p>
                        <p className={`text-xs mt-0.5 ${d ? "text-gray-500" : "text-gray-400"}`}>
                          {m.size_mb} MB ·{" "}
                          {m.has_tokenizers
                            ? <span className="text-green-500">tokenizer ✓</span>
                            : <span className="text-red-500">tokenizer ✗</span>}
                        </p>
                        {m.metrics && (
                          <div className={`flex gap-3 mt-1.5 text-xs ${d ? "text-gray-500" : "text-gray-500"}`}>
                            <span>MSE: <b>{m.metrics.mse}</b></span>
                            <span>R²: <b>{m.metrics.r2}</b></span>
                            <span>C-index: <b>{m.metrics.c_index}</b></span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleLoad(m.filename)}
                        disabled={loadingModel === m.filename || !m.has_tokenizers}
                        className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:text-gray-400 text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                        {loadingModel === m.filename ? t("trainLoading") : t("trainLoadUse")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
