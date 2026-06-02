// src/i18n/LangContext.jsx
import { createContext, useContext, useState, useCallback } from "react";
import { detectLanguage, setLanguage } from "./index";
import translations from "./translations";

const LangCtx = createContext({ t: k => k, lang: "en", changeLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLang] = useState(detectLanguage);

  const changeLang = useCallback((code) => {
    setLanguage(code);
    setLang(code);
  }, []);

  // t("key") → translated string, falls back to key if missing
  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations["en"]?.[key] ?? key;
  }, [lang]);

  return (
    <LangCtx.Provider value={{ t, lang, changeLang }}>
      {children}
    </LangCtx.Provider>
  );
}

export const useLang = () => useContext(LangCtx);
