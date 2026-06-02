// src/components/ui/WizardGuide.jsx
import { useState } from "react";
import { useLang } from "../../i18n/LangContext";

const STEPS = [
  { key: "1", titleKey: "wizardStep1Title", descKey: "wizardStep1Desc", icon: "🗂️" },
  { key: "2", titleKey: "wizardStep2Title", descKey: "wizardStep2Desc", icon: "📂" },
  { key: "3", titleKey: "wizardStep3Title", descKey: "wizardStep3Desc", icon: "▶️" },
  { key: "4", titleKey: "wizardStep4Title", descKey: "wizardStep4Desc", icon: "📊" },
  { key: "5", titleKey: "wizardStep5Title", descKey: "wizardStep5Desc", icon: "⚗️" },
];

export default function WizardGuide({ dark, onClose }) {
  const { t } = useLang();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl ${dark ? "bg-gray-900 border border-gray-800" : "bg-white"}`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${dark ? "border-gray-800" : "border-gray-100"}`}>
          <h2 className={`text-base font-semibold ${dark ? "text-gray-100" : "text-gray-800"}`}>
            {t("wizardTitle")}
          </h2>
          <button onClick={onClose}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${dark ? "bg-gray-800 text-gray-400 hover:text-gray-200" : "bg-gray-100 text-gray-500 hover:text-gray-700"}`}>
            ✕
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 pt-5">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <button onClick={() => setStep(i)}
                className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                  i === step
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : i < step
                      ? dark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"
                      : dark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"
                }`}>
                {i < step ? "✓" : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 ${i < step ? (dark ? "bg-green-500/40" : "bg-green-300") : (dark ? "bg-gray-800" : "bg-gray-200")}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          <div className="flex gap-4">
            <span className="text-3xl flex-shrink-0">{current.icon}</span>
            <div>
              <h3 className={`text-base font-semibold mb-2 ${dark ? "text-gray-100" : "text-gray-800"}`}>
                {t(current.titleKey)}
              </h3>
              <p className={`text-sm leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>
                {t(current.descKey)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${dark ? "border-gray-800" : "border-gray-100"}`}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className={`text-sm px-4 py-2 rounded-xl transition-colors ${
              step === 0
                ? "opacity-30 cursor-not-allowed"
                : dark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            ← {/* prev */}
          </button>

          <span className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>
            {step + 1} / {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="text-sm px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              → {/* next */}
            </button>
          ) : (
            <button onClick={onClose}
              className="text-sm px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors">
              {t("wizardClose")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
