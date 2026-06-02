// src/i18n/index.js
// Genişletilebilir i18n altyapısı
// Yeni dil eklemek için: translations.js'e yeni key ekle, languages array'ine ekle

export const languages = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  // Gelecekte: { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

// Tarayıcı diline göre otomatik algılama
export function detectLanguage() {
  // 1. localStorage tercihi
  const saved = localStorage.getItem("sting_lang");
  if (saved && languages.find(l => l.code === saved)) return saved;

  // 2. Tarayıcı dili
  const browser = navigator.language?.toLowerCase() || "";
  if (browser.startsWith("tr")) return "tr";

  // 3. Varsayılan
  return "en";
}

export function setLanguage(code) {
  localStorage.setItem("sting_lang", code);
}
