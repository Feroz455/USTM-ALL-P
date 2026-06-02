// src/components/ui/LangSwitcher.jsx
import { useLang } from "../../i18n/LangContext";
import { languages } from "../../i18n/index";

export default function LangSwitcher({ dark }) {
  const { lang, changeLang } = useLang();

  return (
    <div className="flex items-center gap-0.5">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => changeLang(l.code)}
          title={l.label}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            lang === l.code
              ? dark
                ? "bg-blue-500/20 text-blue-300"
                : "bg-blue-100 text-blue-700"
              : dark
                ? "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
        >
          <span>{l.flag}</span>
          <span>{l.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
