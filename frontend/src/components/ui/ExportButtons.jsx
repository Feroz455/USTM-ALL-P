// src/components/ui/ExportButtons.jsx — CSV only
import { useState } from "react";
import { useLang } from "../../i18n/LangContext";

function getToken() { return localStorage.getItem("sting_token"); }

async function downloadCSV(url, filename) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    let msg = "İndirme hatası";
    try { const d = await res.json(); msg = d.detail || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const obj = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = obj; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(obj);
}

export default function ExportButtons({ type, id, dark }) {
  const { lang } = useLang();
  const isEN = lang === "en";
  const d = dark;
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  if (!id) return null;

  const paths = {
    ode:         `/api/v1/admin/export/ode/${id}?fmt=csv`,
    ga:          `/api/v1/admin/export/ga/${id}?fmt=csv`,
    repurposing: `/api/v1/admin/export/repurposing/${id}?fmt=csv`,
  };
  const names = {
    ode:         `sting_ode_${id.slice(0,8)}.csv`,
    ga:          `sting_ga_${id.slice(0,8)}.csv`,
    repurposing: `sting_repurposing_${id.slice(0,8)}.csv`,
  };

  if (!paths[type]) return null;

  const handle = async () => {
    setLoading(true); setError(null);
    try { await downloadCSV(paths[type], names[type]); }
    catch(e) { setError(e.message); setTimeout(()=>setError(null),4000); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={handle} disabled={loading}
        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-medium transition-colors disabled:opacity-50 ${
          d?"border-green-500/30 text-green-400 hover:bg-green-500/10"
           :"border-green-300 text-green-700 hover:bg-green-50"}`}>
        {loading
          ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>}
        {isEN?"Download CSV":"CSV İndir"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
