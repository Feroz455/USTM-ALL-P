// src/hooks/useProject.js
// STING proje dosyası: tüm tab verilerini .sting.json olarak kaydet/aç

import { useState, useCallback } from "react";

const PROJECT_VERSION = "1.0";

export function useProject() {
  const [projectName, setProjectName]   = useState("Yeni Proje");
  const [lastSaved,   setLastSaved]     = useState(null);
  const [isDirty,     setIsDirty]       = useState(false);

  // Proje verisi state'leri — App.jsx'ten beslenir
  const [tab1Result,  setTab1Result]  = useState(null);
  const [tab2Config,  setTab2Config]  = useState(null);
  const [tab3Result,  setTab3Result]  = useState(null);
  const [tab4Result,  setTab4Result]  = useState(null);

  const markDirty = useCallback(() => setIsDirty(true), []);

  // ── Kaydet ──────────────────────────────────────────────────────────────
  const saveProject = useCallback(() => {
    const project = {
      version: PROJECT_VERSION,
      name: projectName,
      savedAt: new Date().toISOString(),
      tabs: {
        tab1: tab1Result ? {
          session_id: tab1Result.session_id,
          stats: tab1Result.stats,
          top_candidates: tab1Result.top_candidates?.slice(0, 20) ?? [],
        } : null,
        tab2: tab2Config,
        tab3: tab3Result ? {
          sim_id: tab3Result.sim_id,
          summary: tab3Result.summary,
          timeseries: tab3Result.timeseries,
        } : null,
        tab4: tab4Result ? {
          job_id: tab4Result.job_id,
          best_plan: tab4Result.best_plan,
          best_metrics: tab4Result.best_metrics,
          history: tab4Result.history,
        } : null,
      },
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${projectName.replace(/\s+/g, "_")}.sting.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastSaved(new Date());
    setIsDirty(false);
  }, [projectName, tab1Result, tab2Config, tab3Result, tab4Result]);

  // ── Aç ──────────────────────────────────────────────────────────────────
  const loadProject = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);
          if (!project.version || !project.tabs) {
            reject(new Error("Geçersiz proje dosyası"));
            return;
          }
          setProjectName(project.name || "Yüklenen Proje");
          if (project.tabs.tab1) setTab1Result(project.tabs.tab1);
          if (project.tabs.tab2) setTab2Config(project.tabs.tab2);
          if (project.tabs.tab3) setTab3Result(project.tabs.tab3);
          if (project.tabs.tab4) setTab4Result(project.tabs.tab4);
          setLastSaved(new Date(project.savedAt));
          setIsDirty(false);
          resolve(project);
        } catch (err) {
          reject(new Error("Dosya okunamadı: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("Dosya okuma hatası"));
      reader.readAsText(file);
    });
  }, []);

  // ── Sıfırla ─────────────────────────────────────────────────────────────
  const newProject = useCallback((name = "Yeni Proje") => {
    setProjectName(name);
    setTab1Result(null);
    setTab2Config(null);
    setTab3Result(null);
    setTab4Result(null);
    setLastSaved(null);
    setIsDirty(false);
  }, []);

  // Downstream tab'ları sıfırla (örn. ODE yeniden çalışınca GA/GNN geçersiz olur)
  const resetFromTab3 = useCallback(() => {
    setTab3Result(null);
    setTab4Result(null);
    markDirty();
  }, [markDirty]);

  const resetFromTab2 = useCallback(() => {
    setTab2Config(null);
    setTab3Result(null);
    setTab4Result(null);
    markDirty();
  }, [markDirty]);

  return {
    projectName, setProjectName,
    lastSaved, isDirty,
    tab1Result, setTab1Result: (v) => { setTab1Result(v); markDirty(); },
    tab2Config, setTab2Config: (v) => { setTab2Config(v); markDirty(); },
    tab3Result, setTab3Result: (v) => { setTab3Result(v); markDirty(); },
    tab4Result, setTab4Result: (v) => { setTab4Result(v); markDirty(); },
    resetFromTab3,
    resetFromTab2,
    saveProject,
    loadProject,
    newProject,
  };
}
