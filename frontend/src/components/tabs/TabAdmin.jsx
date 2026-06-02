// src/components/tabs/TabAdmin.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useLang } from "../../i18n/LangContext";

const API = "/api/v1";
function getToken() { return localStorage.getItem("sting_token"); }

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${getToken()}`, "Content-Type":"application/json", ...opts.headers },
  });
  if (opts.raw) return res;
  const d = await res.json();
  if (!res.ok) throw new Error(d.detail || "Hata");
  return d;
}

function Field({ label, value, onChange, type="text", options, dark, required }) {
  const cls = `w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
    dark?"bg-gray-800 border-gray-700 text-gray-200":"bg-white border-gray-200 text-gray-800"}`;
  return (
    <div>
      <label className={`text-xs font-medium block mb-1 ${dark?"text-gray-400":"text-gray-600"}`}>
        {label}{required&&<span className="text-red-400 ml-0.5">*</span>}
      </label>
      {options
        ? <select value={value} onChange={e=>onChange(e.target.value)} className={cls}>
            {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} className={cls}/>
      }
    </div>
  );
}

function RoleBadge({ role, dark }) {
  const isAdmin = role === "admin";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
    isAdmin ? dark?"bg-purple-500/20 text-purple-300":"bg-purple-100 text-purple-700"
            : dark?"bg-blue-500/20 text-blue-300":"bg-blue-100 text-blue-700"}`}>{role}</span>;
}

function TabBadge({ tab, dark }) {
  const colors = {
    tab1: dark?"bg-green-500/20 text-green-400":"bg-green-100 text-green-700",
    tab2: dark?"bg-blue-500/20 text-blue-400":"bg-blue-100 text-blue-700",
    tab3: dark?"bg-purple-500/20 text-purple-400":"bg-purple-100 text-purple-700",
    tab4: dark?"bg-amber-500/20 text-amber-400":"bg-amber-100 text-amber-700",
    admin: dark?"bg-gray-700 text-gray-400":"bg-gray-100 text-gray-600",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[tab]||colors.admin}`}>{tab}</span>;
}


// ── Anket Admin Paneli ────────────────────────────────────────────────────────
function SurveyAdminPanel({ dark, isEN, card }) {
  const d = dark;
  const [responses, setResponses] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [selected, setSelected]   = useState(null);

  const SURVEY_LABELS = {
    survey1: isEN ? "Survey-1: General" : "Anket-1: Genel",
    survey2: isEN ? "Survey-2: ALL" : "Anket-2: ALL",
  };

  const Q_TR = {
    survey1: [
      "1. Kullanım kolaylığı","2. Hız (ilaç konumlandırma)","3. Hız (sentetik hasta)",
      "4. Karmaşıklık","5. Farklı hastalıklarda kullanım","6. Gereksizlik algısı",
      "7. Verimlilik","8. YZ altyapısı başarısı","9. YZ güvenilirliği","10. Karar destek başarısı",
    ],
    survey2: [
      "1. Tespitlerin doğruluğu","2. Süreç hızlandırma","3. Gerçekçilik",
      "4. Uzman kullanılabilirliği","5. Araştırmaya katkı","6. Karar desteği",
      "7. Kullanmak istememe","8. YZ başarısı","9. Farklı hastalıklarda kullanım","10. Başka yöntem tercihi",
    ],
  };
  const LIKERT_LABELS = isEN
    ? ["","Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]
    : ["","Tamamen Katılmıyorum","Katılmıyorum","Kararsızım","Katılıyorum","Tamamen Katılıyorum"];
  const LIKERT_COLORS = ["","#ef4444","#f97316","#f59e0b","#84cc16","#10b981"];

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/survey/responses${filter !== "all" ? `?survey_type=${filter}` : ""}`);
      setResponses(res.responses || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const del = async (id) => {
    if (!window.confirm(isEN ? "Delete this response?" : "Bu yanıt silinsin mi?")) return;
    try {
      await apiFetch(`/admin/survey/response/${id}`, { method: "DELETE" });
      setResponses(r => r.filter(x => x.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {}
  };

  const exportCSV = () => {
    const url = `/api/v1/admin/survey/export?fmt=csv${filter !== "all" ? `&survey_type=${filter}` : ""}`;
    const a = document.createElement("a");
    a.href = url; a.click();
  };

  // İstatistik hesapla
  const stats = (stype) => {
    const rs = responses.filter(r => r.survey_type === stype);
    if (!rs.length) return null;
    const nQ = 10;
    return Array.from({length: nQ}, (_, qi) => {
      const vals = rs.map(r => r.answers?.[qi]).filter(v => v != null);
      const avg = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : null;
      return { qi, avg, n: vals.length };
    });
  };

  return (
    <div className={card + " p-5 space-y-4"}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className={`text-sm font-semibold ${d?"text-slate-200":"text-slate-700"}`}>
          📋 {isEN?"Survey Responses":"Anket Yanıtları"}
          <span className={`ml-2 text-xs font-normal ${d?"text-slate-500":"text-slate-400"}`}>
            ({responses.length} {isEN?"total":"toplam"})
          </span>
        </p>
        <div className="flex gap-2 flex-wrap">
          {["all","survey1","survey2"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                filter===f
                  ?(d?"border-amber-500/40 bg-amber-500/20 text-amber-300":"border-amber-300 bg-amber-100 text-amber-700")
                  :(d?"border-slate-700 text-slate-500":"border-slate-200 text-slate-400")
              }`}>
              {f==="all"?(isEN?"All":"Tümü"):SURVEY_LABELS[f]||f}
            </button>
          ))}
          <button onClick={exportCSV}
            className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${d?"border-emerald-500/30 text-emerald-400":"border-emerald-300 text-emerald-700"}`}>
            ⬇ CSV
          </button>
        </div>
      </div>

      {loading && <p className={`text-xs ${d?"text-slate-500":"text-slate-400"}`}>
        {isEN?"Loading…":"Yükleniyor…"}
      </p>}

      {!loading && responses.length === 0 && (
        <p className={`text-sm text-center py-6 ${d?"text-slate-500":"text-slate-400"}`}>
          {isEN?"No responses yet.":"Henüz yanıt yok."}
        </p>
      )}

      {/* Özet istatistik */}
      {!loading && ["survey1","survey2"].map(stype=>{
        if (filter !== "all" && filter !== stype) return null;
        const st = stats(stype);
        const rs = responses.filter(r=>r.survey_type===stype);
        if (!st || !rs.length) return null;
        return (
          <div key={stype} className={`rounded-xl border p-3 ${d?"border-slate-700 bg-slate-800":"border-slate-200 bg-slate-50"}`}>
            <p className={`text-xs font-semibold mb-2 ${d?"text-amber-300":"text-amber-700"}`}>
              {SURVEY_LABELS[stype]} — {rs.length} {isEN?"response(s)":"yanıt"}
            </p>
            <div className="space-y-1">
              {(Q_TR[stype]||[]).map((ql,qi)=>{
                const s = st[qi];
                const avg = s?.avg;
                const col = avg==null?"#64748b":LIKERT_COLORS[Math.round(avg)]||"#64748b";
                return (
                  <div key={qi} className="flex items-center gap-2">
                    <span className={`text-xs w-48 truncate flex-shrink-0 ${d?"text-slate-400":"text-slate-600"}`}>{ql}</span>
                    <div className={`flex-1 rounded-full h-1.5 ${d?"bg-slate-700":"bg-slate-200"}`}>
                      <div className="h-1.5 rounded-full" style={{width:`${avg?((avg-1)/4)*100:0}%`,background:col}}/>
                    </div>
                    <span className="text-xs font-bold w-8 text-right" style={{color:col}}>
                      {avg!=null?avg.toFixed(1):"—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Yanıt listesi */}
      {!loading && responses.length > 0 && (
        <div>
          <p className={`text-xs font-semibold mb-2 ${d?"text-slate-400":"text-slate-600"}`}>
            {isEN?"Individual Responses":"Bireysel Yanıtlar"}
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {responses.map(r=>(
              <div key={r.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer border ${
                  selected?.id===r.id
                    ?(d?"border-amber-500/40 bg-amber-500/10":"border-amber-300 bg-amber-50")
                    :(d?"border-slate-700 bg-slate-800":"border-slate-200 bg-white")
                }`}
                onClick={()=>setSelected(selected?.id===r.id?null:r)}>
                <span className={`font-semibold ${d?"text-slate-300":"text-slate-600"}`}>#{r.id}</span>
                <span className={`px-1.5 py-0.5 rounded font-semibold ${d?"bg-amber-500/20 text-amber-400":"bg-amber-100 text-amber-700"}`}>
                  {SURVEY_LABELS[r.survey_type]||r.survey_type}
                </span>
                <span className={d?"text-slate-400":"text-slate-500"}>{r.username}</span>
                <span className={`ml-auto ${d?"text-slate-600":"text-slate-400"}`}>
                  {r.submitted_at?.slice(0,16).replace("T"," ")}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${d?"border-slate-600 text-slate-500":"border-slate-300 text-slate-400"}`}>
                  {r.lang?.toUpperCase()}
                </span>
                <button onClick={e=>{e.stopPropagation();del(r.id);}}
                  className={`px-1.5 py-0.5 rounded border ${d?"border-red-500/30 text-red-400 hover:bg-red-500/10":"border-red-200 text-red-500 hover:bg-red-50"}`}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seçili yanıt detayı */}
      {selected && (
        <div className={`rounded-xl border p-4 ${d?"border-amber-900/30 bg-amber-500/5":"border-amber-200 bg-amber-50"}`}>
          <p className={`text-xs font-semibold mb-3 ${d?"text-amber-300":"text-amber-700"}`}>
            {isEN?"Response Detail — ":"Yanıt Detayı — "}{selected.username}
            {" · "}{SURVEY_LABELS[selected.survey_type]}
          </p>
          <div className="space-y-2">
            {(Q_TR[selected.survey_type]||[]).map((ql,qi)=>{
              const v = selected.answers?.[qi];
              return (
                <div key={qi} className="flex items-center gap-2">
                  <span className={`text-xs flex-1 ${d?"text-slate-400":"text-slate-600"}`}>{ql}</span>
                  {v!=null?(
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{background:`${LIKERT_COLORS[v]}22`,color:LIKERT_COLORS[v]}}>
                      {v} — {LIKERT_LABELS[v]}
                    </span>
                  ):(
                    <span className={`text-xs ${d?"text-slate-600":"text-slate-400"}`}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TabAdmin({ dark, user }) {
  const { lang } = useLang();
  const isEN = lang === "en";
  const d = dark;
  const isAdmin = user?.role === "admin";

  const [section, setSection] = useState(isAdmin ? "users" : "logs");
  const [surveyData, setSurveyData] = useState(null);
  const [surveyType, setSurveyType] = useState("all");
  const [users,   setUsers]   = useState([]);
  const [logs,    setLogs]    = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs,  setLoadingLogs]  = useState(false);
  const [msg, setMsg] = useState(null);
  const [logFilter, setLogFilter] = useState({ tab:"", username:"" });

  // New user form
  const [newUser, setNewUser] = useState({ username:"", email:"", full_name:"", password:"", role:"clinician" });
  const [creating, setCreating] = useState(false);

  // Edit user modal
  const [editUser, setEditUser]     = useState(null);
  const [editFields, setEditFields] = useState({});
  const [saving, setSaving]         = useState(false);

  // Reset password
  const [resetTarget, setResetTarget] = useState(null);
  const [newPw, setNewPw] = useState("");

  // Clear logs confirm
  const [clearTarget, setClearTarget] = useState(null); // null | "all" | username

  const flash = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg(null),3500); };

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try { const d2 = await apiFetch("/admin/users"); setUsers(d2.users||[]); }
    catch(e) { flash(e.message,false); }
    finally { setLoadingUsers(false); }
  }, [isAdmin]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const p = new URLSearchParams({ limit:"200" });
      if (logFilter.tab) p.set("tab", logFilter.tab);
      if (logFilter.username && isAdmin) p.set("username", logFilter.username);
      const ep = isAdmin ? `/admin/logs?${p}` : `/admin/logs/me?${p}`;
      const d2 = await apiFetch(ep);
      setLogs(d2.logs||[]);
    } catch(e) { flash(e.message,false); }
    finally { setLoadingLogs(false); }
  }, [isAdmin, logFilter]);

  useEffect(() => { if (section==="users") loadUsers(); }, [section, loadUsers]);
  // Logları her mount'ta ve section değişiminde yükle (admin girince anında görünsün)
  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Log yenileme — App'ten gelen "sting:log" event'ini her zaman dinle
  useEffect(() => {
    const handler = () => loadLogs();
    window.addEventListener("sting:log", handler);
    return () => window.removeEventListener("sting:log", handler);
  }, [loadLogs]);

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.email) {
      flash(isEN?"Fill required fields":"Zorunlu alanları doldurun",false); return;
    }
    setCreating(true);
    try {
      await apiFetch("/admin/users", { method:"POST", body:JSON.stringify(newUser) });
      flash(isEN?`User ${newUser.username} created`:`${newUser.username} oluşturuldu`);
      setNewUser({ username:"", email:"", full_name:"", password:"", role:"clinician" });
      loadUsers();
    } catch(e) { flash(e.message,false); }
    finally { setCreating(false); }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditFields({ email:u.email, full_name:u.full_name, role:u.role });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/admin/users/${editUser.id}`, { method:"PUT", body:JSON.stringify(editFields) });
      flash(isEN?"Updated":"Güncellendi");
      setEditUser(null);
      loadUsers();
    } catch(e) { flash(e.message,false); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (u) => {
    try {
      if (u.is_active) await apiFetch(`/admin/users/${u.id}`, { method:"DELETE" });
      else await apiFetch(`/admin/users/${u.id}`, { method:"PUT", body:JSON.stringify({ is_active:true }) });
      flash(isEN?`${u.username} updated`:`${u.username} güncellendi`);
      loadUsers();
    } catch(e) { flash(e.message,false); }
  };

  const handleResetPw = async () => {
    if (!newPw||newPw.length<4) { flash(isEN?"Min 4 chars":"Min 4 karakter",false); return; }
    try {
      await apiFetch(`/admin/users/${resetTarget.id}/reset-password`, {
        method:"POST", body:JSON.stringify({ new_password:newPw })
      });
      flash(isEN?"Password reset":"Şifre sıfırlandı");
      setResetTarget(null); setNewPw("");
    } catch(e) { flash(e.message,false); }
  };

  const handleClearLogs = async () => {
    try {
      const p = clearTarget==="all" ? "" : `?username=${clearTarget}`;
      await apiFetch(`/admin/logs${p}`, { method:"DELETE" });
      flash(isEN?"Logs cleared":"Loglar temizlendi");
      setClearTarget(null);
      loadLogs();
    } catch(e) { flash(e.message,false); }
  };

  const handleDownloadCSV = async () => {
    try {
      const p = logFilter.username ? `?username=${logFilter.username}` : "";
      const res = await apiFetch(`/admin/export/logs${p}&fmt=csv`, { raw:true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="sting_logs.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e) { flash(e.message,false); }
  };

  const card = `rounded-2xl border p-5 ${d?"bg-gray-900 border-gray-800":"bg-white border-gray-200"}`;

  const sBtn = (id, label) => (
    <button key={id} onClick={()=>setSection(id)}
      className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
        section===id ? d?"bg-blue-500/20 text-blue-300":"bg-blue-100 text-blue-700"
                     : d?"text-gray-400 hover:text-gray-200":"text-gray-500 hover:text-gray-700"}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className={card}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className={`text-base font-bold ${d?"text-gray-200":"text-gray-800"}`}>
              {isAdmin?(isEN?"Admin Panel":"Admin Paneli"):(isEN?"My Profile":"Profilim")}
            </h2>
            <p className={`text-xs mt-0.5 ${d?"text-gray-500":"text-gray-400"}`}>
              {user?.full_name||user?.username} · <RoleBadge role={user?.role} dark={d}/>
            </p>
          </div>
          {msg && <span className={`text-xs px-3 py-1.5 rounded-lg ${msg.ok
            ?d?"bg-green-500/20 text-green-400":"bg-green-100 text-green-700"
            :d?"bg-red-500/20 text-red-400":"bg-red-100 text-red-700"}`}>{msg.text}</span>}
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          {isAdmin && sBtn("users", isEN?"User List":"Kullanıcılar")}
          {isAdmin && sBtn("create", isEN?"Add User":"Kullanıcı Ekle")}
          {sBtn("logs", isEN?"Activity Logs":"Aktivite Logları")}
          {isAdmin && sBtn("surveys", isEN?"📋 Surveys":"📋 Anketler")}
        </div>
      </div>

      {/* ── USERS ── */}
      {section==="users" && isAdmin && (
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-sm font-semibold ${d?"text-gray-200":"text-gray-700"}`}>
              {isEN?"All Users":"Tüm Kullanıcılar"} <span className={`text-xs font-normal ${d?"text-gray-500":"text-gray-400"}`}>({users.length})</span>
            </p>
            <button onClick={loadUsers} className={`text-xs px-3 py-1.5 rounded-lg border ${d?"border-gray-700 text-gray-400 hover:border-gray-500":"border-gray-200 text-gray-500 hover:border-gray-400"}`}>
              {isEN?"Refresh":"Yenile"}
            </button>
          </div>
          {loadingUsers ? <p className={`text-sm text-center py-8 ${d?"text-gray-500":"text-gray-400"}`}>{isEN?"Loading…":"Yükleniyor…"}</p> : (
            <div className="space-y-2">
              {users.map(u=>(
                <div key={u.id} className={`rounded-xl border p-3 flex items-center gap-3 ${d?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-200"}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${d?"bg-blue-500/20 text-blue-400":"bg-blue-100 text-blue-600"}`}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${d?"text-gray-200":"text-gray-800"}`}>{u.username}</p>
                      <RoleBadge role={u.role} dark={d}/>
                      {!u.is_active && <span className={`text-xs px-2 py-0.5 rounded-full ${d?"bg-red-500/20 text-red-400":"bg-red-100 text-red-600"}`}>{isEN?"Inactive":"Deaktif"}</span>}
                    </div>
                    <p className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>{u.email} · {u.full_name}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={()=>openEdit(u)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${d?"border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400":"border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600"}`}>
                      {isEN?"Edit":"Düzenle"}
                    </button>
                    <button onClick={()=>{setResetTarget(u);setNewPw("");}} className={`text-xs px-2.5 py-1.5 rounded-lg border ${d?"border-gray-600 text-gray-400 hover:border-amber-500 hover:text-amber-400":"border-gray-200 text-gray-500 hover:border-amber-400 hover:text-amber-600"}`}>
                      {isEN?"Reset PW":"Şifre"}
                    </button>
                    <button onClick={()=>handleToggleActive(u)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${u.is_active
                      ?d?"border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400":"border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600"
                      :d?"border-green-500/30 text-green-400":"border-green-400 text-green-600"}`}>
                      {u.is_active?(isEN?"Deactivate":"Deaktif"):(isEN?"Activate":"Aktif")}
                    </button>
                    {isAdmin && <button onClick={()=>setClearTarget(u.username)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${d?"border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400":"border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600"}`}>
                      {isEN?"Clear logs":"Logları sil"}
                    </button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE USER ── */}
      {section==="create" && isAdmin && (
        <div className={card}>
          <p className={`text-sm font-semibold mb-4 ${d?"text-gray-200":"text-gray-700"}`}>{isEN?"Add New User":"Yeni Kullanıcı Ekle"}</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label={isEN?"Username":"Kullanıcı adı"} value={newUser.username} onChange={v=>setNewUser(u=>({...u,username:v}))} dark={d} required/>
            <Field label="E-mail" type="email" value={newUser.email} onChange={v=>setNewUser(u=>({...u,email:v}))} dark={d} required/>
            <Field label={isEN?"Full name":"Ad Soyad"} value={newUser.full_name} onChange={v=>setNewUser(u=>({...u,full_name:v}))} dark={d}/>
            <Field label={isEN?"Password":"Şifre"} type="password" value={newUser.password} onChange={v=>setNewUser(u=>({...u,password:v}))} dark={d} required/>
            <Field label={isEN?"Role":"Rol"} value={newUser.role} onChange={v=>setNewUser(u=>({...u,role:v}))} dark={d}
              options={[{value:"clinician",label:"Clinician"},{value:"admin",label:"Admin"}]}/>
          </div>
          <button onClick={handleCreateUser} disabled={creating}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
            {creating?(isEN?"Creating…":"Oluşturuluyor…"):(isEN?"Create User":"Kullanıcı Oluştur")}
          </button>
        </div>
      )}

      {/* ── LOGS ── */}
      {section==="logs" && (
        <div className={card}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className={`text-sm font-semibold ${d?"text-gray-200":"text-gray-700"}`}>
              {isAdmin?(isEN?"All Logs":"Tüm Loglar"):(isEN?"My Activity":"Aktivitelerim")}
              <span className={`ml-2 text-xs font-normal ${d?"text-gray-500":"text-gray-400"}`}>({logs.length})</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              <select value={logFilter.tab} onChange={e=>setLogFilter(f=>({...f,tab:e.target.value}))}
                className={`text-xs border rounded-lg px-2 py-1 ${d?"bg-gray-800 border-gray-700 text-gray-300":"bg-white border-gray-200"}`}>
                <option value="">{isEN?"All tabs":"Tüm tablar"}</option>
                {["tab1","tab2","tab3","tab4","admin"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              {isAdmin && <input placeholder={isEN?"Filter by user…":"Kullanıcı…"} value={logFilter.username}
                onChange={e=>setLogFilter(f=>({...f,username:e.target.value}))}
                className={`text-xs border rounded-lg px-2 py-1 w-28 ${d?"bg-gray-800 border-gray-700 text-gray-300":"bg-white border-gray-200"}`}/>}
              <button onClick={loadLogs} className={`text-xs px-3 py-1.5 rounded-lg border ${d?"border-gray-700 text-gray-400 hover:border-gray-500":"border-gray-200 text-gray-500 hover:border-gray-400"}`}>
                {isEN?"Search":"Ara"}
              </button>
              {isAdmin && <>
                <button onClick={handleDownloadCSV} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white">CSV</button>
                <button onClick={()=>setClearTarget("all")} className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white">
                  {isEN?"Clear All":"Tümünü Sil"}
                </button>
              </>}
            </div>
          </div>

          {loadingLogs ? <p className={`text-sm text-center py-8 ${d?"text-gray-500":"text-gray-400"}`}>{isEN?"Loading…":"Yükleniyor…"}</p>
          : logs.length===0 ? <p className={`text-sm text-center py-8 ${d?"text-gray-600":"text-gray-400"}`}>{isEN?"No logs":"Log yok"}</p>
          : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {logs.map(l=>(
                <div key={l.id} className={`rounded-xl border p-3 ${d?"bg-gray-800 border-gray-700":"bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <TabBadge tab={l.tab} dark={d}/>
                    <span className={`text-xs font-semibold ${d?"text-gray-300":"text-gray-700"}`}>{l.action}</span>
                    {isAdmin && l.username && <span className={`text-xs ${d?"text-gray-500":"text-gray-400"}`}>· {l.username}</span>}
                    <span className={`text-xs ml-auto ${d?"text-gray-600":"text-gray-400"}`}>
                      {l.created_at?.slice(0,19).replace("T"," ")}{l.duration_sec>0&&` · ${l.duration_sec.toFixed(1)}s`}
                    </span>
                  </div>
                  {l.summary && <p className={`text-xs mt-1 ${d?"text-gray-400":"text-gray-600"}`}>{l.summary}</p>}
                  {l.detail  && <p className={`text-xs mt-0.5 truncate ${d?"text-gray-600":"text-gray-400"}`}>{l.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Edit user modal ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`rounded-2xl border p-6 max-w-sm w-full mx-4 shadow-2xl ${d?"bg-gray-900 border-gray-700":"bg-white border-gray-200"}`}>
            <p className={`text-sm font-semibold mb-4 ${d?"text-gray-200":"text-gray-800"}`}>{isEN?"Edit User":"Kullanıcı Düzenle"} — {editUser.username}</p>
            <div className="space-y-3 mb-4">
              <Field label="E-mail" type="email" value={editFields.email} onChange={v=>setEditFields(f=>({...f,email:v}))} dark={d}/>
              <Field label={isEN?"Full name":"Ad Soyad"} value={editFields.full_name} onChange={v=>setEditFields(f=>({...f,full_name:v}))} dark={d}/>
              <Field label={isEN?"Role":"Rol"} value={editFields.role} onChange={v=>setEditFields(f=>({...f,role:v}))} dark={d}
                options={[{value:"clinician",label:"Clinician"},{value:"admin",label:"Admin"}]}/>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm">
                {saving?(isEN?"Saving…":"Kaydediliyor…"):(isEN?"Save":"Kaydet")}
              </button>
              <button onClick={()=>setEditUser(null)} className={`flex-1 font-semibold py-2 rounded-xl text-sm border ${d?"border-gray-700 text-gray-300":"border-gray-200 text-gray-600"}`}>
                {isEN?"Cancel":"İptal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset password modal ── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`rounded-2xl border p-6 max-w-sm w-full mx-4 shadow-2xl ${d?"bg-gray-900 border-gray-700":"bg-white border-gray-200"}`}>
            <p className={`text-sm font-semibold mb-3 ${d?"text-gray-200":"text-gray-800"}`}>{isEN?"Reset Password":"Şifre Sıfırla"} — {resetTarget.username}</p>
            <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)}
              placeholder={isEN?"New password (min 4 chars)":"Yeni şifre (min 4 karakter)"}
              className={`w-full border rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none ${d?"bg-gray-800 border-gray-700 text-gray-200":"bg-white border-gray-200"}`}/>
            <div className="flex gap-2">
              <button onClick={handleResetPw} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-xl text-sm">{isEN?"Reset":"Sıfırla"}</button>
              <button onClick={()=>setResetTarget(null)} className={`flex-1 font-semibold py-2 rounded-xl text-sm border ${d?"border-gray-700 text-gray-300":"border-gray-200 text-gray-600"}`}>{isEN?"Cancel":"İptal"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear logs confirm modal ── */}
      {clearTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`rounded-2xl border p-6 max-w-sm w-full mx-4 shadow-2xl ${d?"bg-gray-900 border-gray-700":"bg-white border-gray-200"}`}>
            <p className={`text-sm font-semibold mb-2 ${d?"text-gray-200":"text-gray-800"}`}>⚠️ {isEN?"Clear Logs?":"Logları Temizle?"}</p>
            <p className={`text-xs mb-4 ${d?"text-gray-400":"text-gray-600"}`}>
              {clearTarget==="all"
                ?(isEN?"This will delete ALL activity logs permanently.":"Tüm aktivite logları kalıcı olarak silinecek.")
                :(isEN?`Logs for user "${clearTarget}" will be deleted.`:`"${clearTarget}" kullanıcısının logları silinecek.`)}
            </p>
            <div className="flex gap-2">
              <button onClick={handleClearLogs} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-xl text-sm">{isEN?"Yes, delete":"Evet, sil"}</button>
              <button onClick={()=>setClearTarget(null)} className={`flex-1 font-semibold py-2 rounded-xl text-sm border ${d?"border-gray-700 text-gray-300":"border-gray-200 text-gray-600"}`}>{isEN?"Cancel":"İptal"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SURVEYS ── */}
      {section==="surveys" && isAdmin && (
        <SurveyAdminPanel dark={d} isEN={isEN} card={card} />
      )}
    </div>
  );
}