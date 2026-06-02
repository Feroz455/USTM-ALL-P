// src/components/ui/ModelStatusPanel.jsx
import { useState, useEffect, useCallback } from "react";
import { useLang } from "../../i18n/LangContext";
import { uploadModel } from "../../services/api";

const BASE = "/api/v1";

function getToken() { return localStorage.getItem("sting_token"); }

async function fetchModels() {
  try {
    const res = await fetch(`${BASE}/training/models`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function StatusRow({ label, ok, dark }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
      <span className={`text-xs font-medium flex items-center gap-1.5 ${
        ok ? (dark ? "text-green-400" : "text-green-600")
           : (dark ? "text-red-400" : "text-red-500")
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />
        {ok ? "✓" : "✗"}
      </span>
    </div>
  );
}

export default function ModelStatusPanel({ dark }) {
  const { t } = useLang();
  const [models, setModels]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [uploadFile,    setUploadFile]    = useState(null);
  const [uploading,     setUploading]     = useState(false);
  const [uploadMsg,     setUploadMsg]     = useState(null);
  const [uploadError,   setUploadError]   = useState(null);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true); setUploadMsg(null); setUploadError(null);
    try {
      const res = await uploadModel(uploadFile);
      setUploadMsg(res.message);
      setUploadFile(null);
      await load(); // refresh status
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchModels();
      setModels(data?.models || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pick the first model with tokenizers as "active"
  const activeModel = models.find(m => m.has_tokenizers) || models[0];
  const hasModel      = !!activeModel;
  const hasTokenizers = activeModel?.has_tokenizers ?? false;
  const allGood       = hasModel && hasTokenizers;

  const panelCls = `rounded-xl border p-4 ${
    allGood
      ? dark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"
      : dark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"
  }`;

  return (
    <div className={panelCls}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${allGood ? "bg-green-400" : "bg-amber-400"} animate-pulse`} />
          <p className={`text-sm font-semibold ${dark ? "text-gray-200" : "text-gray-800"}`}>{t("modelStatus")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${dark ? "text-gray-500 hover:bg-gray-800" : "text-gray-400 hover:bg-white"}`}>
            {t("modelRefresh")}
          </button>
          <button onClick={() => setExpanded(e => !e)}
            className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>{t("modelStatusDesc")}</p>

      {/* Active model pill */}
      {activeModel && (
        <div className={`mt-2 flex items-center gap-2 text-xs px-2 py-1 rounded-lg ${dark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700"} border ${dark ? "border-gray-700" : "border-gray-200"}`}>
          <span className="font-mono truncate">{activeModel.filename}</span>
          <span className={`flex-shrink-0 ${dark ? "text-gray-600" : "text-gray-400"}`}>· {activeModel.size_mb} MB</span>
        </div>
      )}

      {/* Expanded status rows */}
      {expanded && (
        <div className={`mt-3 border-t pt-3 space-y-0.5 ${dark ? "border-gray-700" : "border-gray-200"}`}>
          <StatusRow label={t("modelFile")}      ok={hasModel}       dark={dark} />
          <StatusRow label={t("tokenizerLigand")} ok={hasTokenizers}  dark={dark} />
          <StatusRow label={t("tokenizerProtein")} ok={hasTokenizers} dark={dark} />
          <StatusRow label={t("scalerFile")}     ok={hasTokenizers}  dark={dark} />

          {/* Metrics if available */}
          {activeModel?.metrics && (
            <div className={`mt-3 pt-3 border-t grid grid-cols-3 gap-2 ${dark ? "border-gray-700" : "border-gray-200"}`}>
              {[
                ["MSE",     activeModel.metrics.mse],
                ["R²",      activeModel.metrics.r2],
                ["C-index", activeModel.metrics.c_index],
              ].map(([label, val]) => (
                <div key={label} className={`text-center rounded-lg p-2 ${dark ? "bg-gray-800" : "bg-white"}`}>
                  <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{label}</p>
                  <p className={`text-xs font-mono font-semibold mt-0.5 ${dark ? "text-gray-200" : "text-gray-700"}`}>
                    {val?.toFixed ? val.toFixed(4) : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Setup guide if not ready */}
          {!allGood && (
            <div className={`mt-3 pt-3 border-t text-xs space-y-1 ${dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-500"}`}>
              <p className="font-medium">{t("modelSetupGuide")}:</p>
              <p className="font-mono">{t("modelSetupStep1")}</p>
              <p className="font-mono">{t("modelSetupStep2")}</p>
              <p className="font-mono">{t("modelSetupStep3")}</p>
            </div>
          )}
        </div>
      )}

      {/* ── H5 upload zone (always visible) ── */}
      <div className={`mt-3 pt-3 border-t ${dark ? "border-gray-700" : "border-gray-200"}`}>
        <p className={`text-xs font-semibold mb-2 ${dark ? "text-gray-400" : "text-gray-600"}`}>
          .h5 Model Yükle
        </p>
        <div className="flex items-center gap-2">
          <label className={`flex-1 flex items-center justify-center h-9 border-2 border-dashed rounded-xl cursor-pointer text-xs transition-colors ${
            dark ? "border-gray-700 hover:border-blue-500 text-gray-500 hover:text-blue-400"
                 : "border-gray-300 hover:border-blue-400 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
          }`}>
            {uploadFile
              ? <span className={`font-medium truncate px-2 ${dark ? "text-blue-400" : "text-blue-600"}`}>{uploadFile.name}</span>
              : <span>bilstm_model.h5 seçin…</span>
            }
            <input type="file" accept=".h5,.keras" className="hidden"
                   onChange={e => { setUploadFile(e.target.files[0]); setUploadMsg(null); setUploadError(null); }} />
          </label>
          <button
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
              !uploadFile || uploading
                ? dark ? "bg-gray-800 text-gray-600" : "bg-gray-100 text-gray-400"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            }`}>
            {uploading ? "Yükleniyor…" : "Yükle"}
          </button>
        </div>
        {uploadMsg && (
          <p className="mt-1.5 text-xs text-green-500">✓ {uploadMsg}</p>
        )}
        {uploadError && (
          <p className="mt-1.5 text-xs text-red-400">✗ {uploadError}</p>
        )}
        <p className={`mt-1.5 text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>
          Yükledikten sonra tokenizer'lar eksikse Model Eğitimi → Kayıtlı Modeller sekmesinden yükleyin.
        </p>
      </div>
    </div>
  );
}
