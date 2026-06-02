// src/components/ui/HowToUse.jsx
// Tüm tab'larda kullanılan "Nasıl kullanılır" açılır panel

import { useState } from "react";
import { useLang } from "../../i18n/LangContext";

export default function HowToUse({ steps, title, dark }) {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();
  const isEN = lang === "en";
  const d = dark;

  const defaultTitle = isEN ? "How to use" : "Nasıl kullanılır?";

  return (
    <div className={`rounded-2xl border overflow-hidden ${d ? "border-blue-500/20 bg-gray-900" : "border-blue-200 bg-white"}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
          d ? "hover:bg-gray-800" : "hover:bg-blue-50"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
            d ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
          }`}>
            {open ? "▾" : "▸"}
          </span>
          <p className={`text-sm font-semibold ${d ? "text-blue-300" : "text-blue-700"}`}>
            ℹ️ {title || defaultTitle}
          </p>
        </div>
        <span className={`text-xs ${d ? "text-gray-600" : "text-gray-400"}`}>
          {open ? (isEN ? "Collapse" : "Kapat") : (isEN ? "Expand" : "Genişlet")}
        </span>
      </button>

      {open && (
        <div className={`px-5 pb-4 border-t ${d ? "border-gray-800" : "border-blue-100"}`}>
          <div className="mt-4 space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                  d ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-semibold ${d ? "text-gray-300" : "text-gray-700"}`}>
                    {step.title}
                  </p>
                  {step.desc && (
                    <p className={`text-xs mt-0.5 leading-relaxed ${d ? "text-gray-500" : "text-gray-500"}`}>
                      {step.desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
