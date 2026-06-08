// src/components/ui/ProjectToolbar.jsx
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "../../i18n/LangContext";

export default function ProjectToolbar({ project, dark }) {
  const { lang } = useLang();
  const isEN = lang === "en";
  const fileInputRef = useRef(null);
  const [msg, setMsg] = useState(null);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const d = dark;

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 2500);
  };

  const handleSave = () => {
    project.saveProject();
    flash(isEN ? "Project saved" : "Proje kaydedildi");
  };

  const handleOpen = () => fileInputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await project.loadProject(file);
      flash(isEN ? "Project loaded" : "Proje yüklendi");
    } catch (err) {
      flash(err.message, false);
    }
    e.target.value = "";
  };

  const handleNew = () => {
    if (project.isDirty) {
      if (!window.confirm(isEN
        ? "Unsaved changes will be lost. Continue?"
        : "Kaydedilmemiş değişiklikler kaybolacak. Devam et?")) return;
    }
    project.newProject(newName || (isEN ? "New Project" : "Yeni Proje"));
    setShowNew(false);
    setNewName("");
    flash(isEN ? "New project created" : "Yeni proje oluşturuldu");
  };

  const btn = `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
    d ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"
  }`;

  return (
    <div className={`flex items-center gap-1 ${d ? "border-gray-800" : "border-gray-200"}`}>
      {/* Proje adı — mobilde gizle */}
      <div className="hidden sm:flex items-center gap-2 mr-2">
        <input
          type="text"
          value={project.projectName}
          onChange={e => project.setProjectName(e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-400 w-24 lg:w-36 ${
            d ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-700"
          }`}
        />
        {project.isDirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title={isEN ? "Unsaved changes" : "Kaydedilmemiş değişiklikler"} />
        )}
      </div>

      {/* Yeni */}
      <button onClick={() => setShowNew(s => !s)} className={btn} title={isEN ? "New project" : "Yeni proje"}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        <span className="hidden sm:inline">{isEN ? "New" : "Yeni"}</span>
      </button>

      {/* Aç */}
      <button onClick={handleOpen} className={btn} title={isEN ? "Open project" : "Proje aç"}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
        </svg>
        <span className="hidden sm:inline">{isEN ? "Open" : "Aç"}</span>
      </button>

      {/* Kaydet */}
      <button onClick={handleSave} className={`${btn} ${project.isDirty ? (d ? "text-amber-400" : "text-amber-600") : ""}`}
              title={isEN ? "Save project" : "Proje kaydet"}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
        </svg>
        <span className="hidden sm:inline">{isEN ? "Save" : "Kaydet"}</span>
      </button>

      {/* Son kayıt zamanı — mobilde gizle */}
      {project.lastSaved && (
        <span className={`hidden sm:inline text-xs ${d ? "text-gray-600" : "text-gray-400"}`}>
          {project.lastSaved.toLocaleTimeString(lang === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}

      {/* Flash msg */}
      {msg && (
        <span className={`text-xs px-2 py-0.5 rounded-lg animate-pulse ${
          msg.ok ? "text-green-500 bg-green-500/10" : "text-red-400 bg-red-500/10"
        }`}>{msg.text}</span>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".sting.json,.json" className="hidden" onChange={handleFile} />

      {/* Yeni proje modal — document.body'e portal ile mount edilir, z-index sorunu olmaz */}
      {showNew && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
             onClick={() => setShowNew(false)}>
          <div className={`rounded-2xl border shadow-2xl p-5 w-72 ${d ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
               onClick={e => e.stopPropagation()}>
            <p className={`text-sm font-semibold mb-3 ${d ? "text-gray-200" : "text-gray-800"}`}>
              {isEN ? "New Project" : "Yeni Proje"}
            </p>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder={isEN ? "Project name" : "Proje adı"}
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleNew()}
              className={`w-full border rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                d ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200"
              }`} />
            <div className="flex gap-2">
              <button onClick={handleNew}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg font-medium">
                {isEN ? "Create" : "Oluştur"}
              </button>
              <button onClick={() => setShowNew(false)}
                className={`flex-1 text-xs py-2 rounded-lg ${d ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {isEN ? "Cancel" : "İptal"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
