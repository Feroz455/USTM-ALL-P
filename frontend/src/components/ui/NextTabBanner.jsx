// src/components/ui/NextTabBanner.jsx
// Tab tamamlandığında gösterilen bildirim + sonraki taba geçiş butonu

import { useLang } from "../../i18n/LangContext";

const TAB_COLORS = {
  tab2: { bg: "bg-blue-500",   shadow: "shadow-blue-500/30"  },
  tab3: { bg: "bg-purple-600", shadow: "shadow-purple-500/30" },
  tab4: { bg: "bg-amber-500",  shadow: "shadow-amber-500/30"  },
  tab5: { bg: "bg-teal-500",   shadow: "shadow-teal-500/30"   },
  tab6: { bg: "bg-rose-500",   shadow: "shadow-rose-500/30"   },
};

export default function NextTabBanner({ dark, metrics, nextTab, nextLabel, onGoTo }) {
  const { lang } = useLang();
  const isEN = lang === "en";
  const d = dark;
  const colors = TAB_COLORS[nextTab] || TAB_COLORS.tab3;

  return (
    <div className={`rounded-2xl border p-4 ${d
      ? "bg-green-500/10 border-green-500/30"
      : "bg-green-50 border-green-300"}`}>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Tamamlandı işareti + metrikler */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
            d ? "bg-green-500/20 text-green-400" : "bg-green-600 text-white"}`}>
            ✓
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${d ? "text-green-400" : "text-green-800"}`}>
              {isEN ? "Completed!" : "Tamamlandı!"}
            </p>
            {metrics && (
              <p className={`text-xs truncate ${d ? "text-green-500" : "text-green-700"}`}>
                {metrics}
              </p>
            )}
          </div>
        </div>

        {/* Sonraki tab butonu */}
        {onGoTo && nextTab && (
          <button
            onClick={() => onGoTo(nextTab)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all shadow-md ${colors.bg} ${colors.shadow} hover:opacity-90 active:scale-95`}>
            {nextLabel || (isEN ? `Go to ${nextTab.toUpperCase()}` : `${nextTab.toUpperCase()}'e Git`)}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
