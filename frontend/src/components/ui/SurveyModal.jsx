// SurveyModal.jsx — STING Anket-1 ve Anket-2
import { useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "../../i18n/LangContext";

const BASE = "/api/v1";
const tok  = () => localStorage.getItem("sting_token");

const SURVEYS = {
  survey1: {
    title_tr: "Anket – 1: STING Yazılımının Genel Değerlendirmesi",
    title_en: "Survey – 1: General Evaluation of STING Software",
    consent_tr: "Bu ankete katılımınız gönüllülük esasına dayanmaktadır. Verdiğiniz yanıtlar yalnızca araştırma amaçlı kullanılacak ve gizli tutulacaktır.",
    consent_en: "Your participation in this survey is voluntary. Your responses will be used for research purposes only and will be kept confidential.",
    questions_tr: [
      "STING yazılımı, kullanımı kolay bir yazılımdır.",
      "STING yazılımı ilaç yeniden konumlandırma sürecinde hızlıdır.",
      "STING yazılımı sentetik hastalar ile değerlendirmelerde hızlıdır.",
      "STING yazılımı üzerinde çalışmayı karmaşık buldum.",
      "STING gibi bir yazılımı farklı hastalıklar özelinde de kullanmak isterim.",
      "STING yazılımı ile ilaç yeniden konumlandırma ve değerlendirme süreçlerini gereksiz buldum.",
      "Bu yazılım ilaç değerlendirmelerinde verimlilik sağlayacaktır.",
      "Bu yazılımda yer alan Yapay Zeka altyapısını başarılı buldum.",
      "STING yazılımındaki Yapay Zeka altyapısını güvenilir buldum.",
      "STING yazılımını karar destek sağlaması açısından başarılı buldum.",
    ],
    questions_en: [
      "STING software is easy to use.",
      "STING software is fast in the drug repositioning process.",
      "STING software is fast in evaluations with synthetic patients.",
      "I found working on STING software complex.",
      "I would like to use software like STING for other diseases as well.",
      "I found the drug repositioning and evaluation processes with STING unnecessary.",
      "This software will provide efficiency in drug evaluations.",
      "I found the AI infrastructure in this software successful.",
      "I found the AI infrastructure in STING software reliable.",
      "I found STING software successful in providing decision support.",
    ],
  },
  survey2: {
    title_tr: "Anket – 2: STING Yazılımının Çocukluk Çağı Akut Lösemisi Yönünde Değerlendirilmesi",
    title_en: "Survey – 2: Evaluation of STING Software for Childhood Acute Leukemia",
    consent_tr: "Bu ankete katılımınız gönüllülük esasına dayanmaktadır. Verdiğiniz yanıtlar yalnızca araştırma amaçlı kullanılacak ve gizli tutulacaktır.",
    consent_en: "Your participation in this survey is voluntary. Your responses will be used for research purposes only and will be kept confidential.",
    questions_tr: [
      "STING yazılımının Çocukluk Çağı Akut Lösemisi yönünde gerçekleştirdiği ilaç konumlandırma tespitleri doğrudur.",
      "Bu yazılımın Çocukluk Çağı Akut Lösemisi için ilaç değerlendirme süreçlerini hızlandıracağını düşünüyorum.",
      "STING yazılımının oluşturduğu sentetik hastalar ve kanser-hasta, hasta-çevresel faktör oluşumları gerçekçidir.",
      "STING yazılımın verdiği dönütler / bulgular uzmanlar tarafından kullanılabilir.",
      "STING yazılımındaki bulgular Çocukluk Çağı Akut Lösemisi araştırmalarına katkı sağlayacak düzeydedir.",
      "STING yazılımı Çocukluk Çağı Akut Lösemisi için ilaç yeniden konumlandırma süreçlerini destekleme açısından başarılı bir karar desteği sağlamaktadır.",
      "Çocukluk Çağı Akut Lösemisi ilaç yeniden konumlandırma çalışmalarında bu yazılımı kullanmak istemem.",
      "Bu yazılım içerisindeki Yapay Zeka, Çocukluk Çağı Akut Lösemisi hastalığı için başarılı tespitlerde bulunmaktadır.",
      "Bu yazılımı farklı hastalıklar özelinde de kullanmak isterim.",
      "STING yazılımı yerine başka yöntemleri kullanmayı tercih ederim.",
    ],
    questions_en: [
      "The drug positioning findings of STING software for Childhood Acute Leukemia are accurate.",
      "I think this software will accelerate drug evaluation processes for Childhood Acute Leukemia.",
      "The synthetic patients and cancer-patient, patient-environmental factor formations created by STING software are realistic.",
      "The feedback/findings provided by STING software can be used by experts.",
      "The findings in STING software are at a level that will contribute to Childhood Acute Leukemia research.",
      "STING software provides successful decision support in terms of supporting drug repositioning processes for Childhood Acute Leukemia.",
      "I would not want to use this software in drug repositioning studies for Childhood Acute Leukemia.",
      "The AI in this software makes successful determinations for Childhood Acute Leukemia.",
      "I would like to use this software for other diseases as well.",
      "I prefer to use other methods instead of STING software.",
    ],
  },
};

const LIKERT_TR = ["Tamamen Katılmıyorum", "Katılmıyorum", "Kararsızım", "Katılıyorum", "Tamamen Katılıyorum"];
const LIKERT_EN = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
const LIKERT_COLORS = ["#ef4444","#f97316","#f59e0b","#84cc16","#10b981"];

export default function SurveyModal({ dark, onClose }) {
  const { lang } = useLang();
  const isEN = lang === "en";
  const d = dark;

  const [step, setStep]       = useState("choose"); // choose | consent | form | done
  const [surveyKey, setSurveyKey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState(null);

  const survey = surveyKey ? SURVEYS[surveyKey] : null;
  const questions = survey
    ? (isEN ? survey.questions_en : survey.questions_tr)
    : [];

  const allAnswered = questions.length > 0 &&
    questions.every((_, i) => answers[i] !== undefined);

  const reset = () => {
    setStep("choose"); setSurveyKey(null);
    setAnswers({}); setError(null);
  };

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${BASE}/admin/survey/response`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          survey_type: surveyKey,
          lang,
          answers,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || `HTTP ${res.status}`);
      }
      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const card = `rounded-2xl border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto
    ${d ? "bg-slate-900 border-amber-900/40" : "bg-white border-amber-200"}`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
         onClick={onClose}>
      <div className={card} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b
          ${d ? "bg-slate-900 border-slate-800" : "bg-white border-amber-100"}`}>
          <div>
            <p className={`font-bold text-sm ${d ? "text-slate-100" : "text-slate-800"}`}>
              📋 {isEN ? "STING Software Survey" : "STING Yazılımı Anketi"}
            </p>
            <p className={`text-xs ${d ? "text-slate-500" : "text-slate-400"}`}>
              {isEN ? "TÜBİTAK 123E383 — Research Data Collection" : "TÜBİTAK 123E383 — Araştırma Veri Toplama"}
            </p>
          </div>
          <button onClick={onClose}
            className={`w-7 h-7 rounded-lg flex items-center justify-center
              ${d ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"}`}>✕</button>
        </div>

        <div className="p-5">

          {/* ADIM 1 — Anket seç */}
          {step === "choose" && (
            <div className="space-y-4">
              <p className={`text-sm ${d ? "text-slate-300" : "text-slate-700"}`}>
                {isEN
                  ? "Please select the survey you would like to complete:"
                  : "Lütfen doldurmak istediğiniz anketi seçiniz:"}
              </p>
              {Object.entries(SURVEYS).map(([key, s]) => (
                <button key={key} onClick={() => { setSurveyKey(key); setStep("consent"); }}
                  className={`w-full text-left rounded-2xl border p-4 transition-all hover:scale-[1.01]
                    ${d ? "border-amber-900/40 bg-slate-800 hover:bg-slate-750" : "border-amber-200 bg-amber-50 hover:bg-amber-100"}`}>
                  <p className={`font-semibold text-sm ${d ? "text-amber-300" : "text-amber-700"}`}>
                    {isEN ? s.title_en : s.title_tr}
                  </p>
                  <p className={`text-xs mt-1 ${d ? "text-slate-500" : "text-slate-400"}`}>
                    {isEN ? "10 items · 5-point Likert scale · ~5 min" : "10 madde · 5'li Likert ölçeği · ~5 dk"}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* ADIM 2 — Rıza */}
          {step === "consent" && survey && (
            <div className="space-y-4">
              <p className={`font-semibold text-sm ${d ? "text-amber-300" : "text-amber-700"}`}>
                {isEN ? survey.title_en : survey.title_tr}
              </p>
              <div className={`rounded-xl border p-4 text-sm leading-relaxed
                ${d ? "border-blue-500/20 bg-blue-500/5 text-slate-300" : "border-blue-200 bg-blue-50 text-slate-700"}`}>
                <p className="font-semibold mb-2">
                  {isEN ? "🔒 Voluntary Participation Form" : "🔒 Gönüllü Katılım Formu"}
                </p>
                <p>{isEN ? survey.consent_en : survey.consent_tr}</p>
                <p className={`mt-3 text-xs ${d ? "text-slate-500" : "text-slate-500"}`}>
                  {isEN
                    ? "Principal Investigator: Prof. Dr. Utku KÖSE — Süleyman Demirel University, Dept. of Computer Engineering — utkukose@sdu.edu.tr"
                    : "Araştırma Yürütücüsü: Prof. Dr. Utku KÖSE — Süleyman Demirel Üniversitesi, Bilgisayar Mühendisliği Bölümü — utkukose@sdu.edu.tr"}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={reset}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold
                    ${d ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                  {isEN ? "← Back" : "← Geri"}
                </button>
                <button onClick={() => setStep("form")}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold">
                  {isEN ? "I Accept — Start Survey →" : "Kabul Ediyorum — Ankete Başla →"}
                </button>
              </div>
            </div>
          )}

          {/* ADIM 3 — Form */}
          {step === "form" && survey && (
            <div className="space-y-5">
              <p className={`font-semibold text-sm ${d ? "text-amber-300" : "text-amber-700"}`}>
                {isEN ? survey.title_en : survey.title_tr}
              </p>

              {/* Ölçek başlığı */}
              <div className="grid grid-cols-5 gap-1 text-center mb-1">
                {(isEN ? LIKERT_EN : LIKERT_TR).map((lbl, i) => (
                  <p key={i} className="text-xs leading-tight" style={{ color: LIKERT_COLORS[i] }}>
                    {i + 1}<br />{lbl}
                  </p>
                ))}
              </div>

              {/* Sorular */}
              {questions.map((q, qi) => (
                <div key={qi} className={`rounded-xl border p-3
                  ${d ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-xs mb-3 leading-relaxed ${d ? "text-slate-300" : "text-slate-700"}`}>
                    <span className={`font-bold mr-1 ${d ? "text-amber-400" : "text-amber-600"}`}>{qi + 1}.</span>
                    {q}
                  </p>
                  <div className="grid grid-cols-5 gap-1">
                    {[1,2,3,4,5].map(v => {
                      const sel = answers[qi] === v;
                      return (
                        <button key={v} onClick={() => setAnswers(a => ({ ...a, [qi]: v }))}
                          className="rounded-xl py-2 text-sm font-bold border-2 transition-all"
                          style={{
                            borderColor: sel ? LIKERT_COLORS[v-1] : (d ? "#334155" : "#e2e8f0"),
                            background:  sel ? `${LIKERT_COLORS[v-1]}25` : "transparent",
                            color:       sel ? LIKERT_COLORS[v-1] : (d ? "#64748b" : "#94a3b8"),
                          }}>
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* İlerleme */}
              <div>
                <div className="flex justify-between text-xs mb-1"
                     style={{ color: d ? "#64748b" : "#94a3b8" }}>
                  <span>{isEN ? "Progress" : "İlerleme"}</span>
                  <span>{Object.keys(answers).length}/{questions.length}</span>
                </div>
                <div className={`w-full rounded-full h-2 ${d ? "bg-slate-700" : "bg-slate-200"}`}>
                  <div className="h-2 rounded-full transition-all bg-amber-500"
                       style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
                </div>
              </div>

              {error && <p className="text-xs text-red-400">⚠ {error}</p>}

              <div className="flex gap-3">
                <button onClick={reset}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold
                    ${d ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                  {isEN ? "← Back" : "← Geri"}
                </button>
                <button onClick={submit} disabled={!allAnswered || submitting}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all
                    ${allAnswered && !submitting
                      ? "bg-emerald-500 hover:bg-emerald-400"
                      : "bg-slate-400 cursor-not-allowed opacity-50"}`}>
                  {submitting
                    ? (isEN ? "Submitting…" : "Gönderiliyor…")
                    : (isEN ? "Submit Survey ✓" : "Anketi Gönder ✓")}
                </button>
              </div>
            </div>
          )}

          {/* ADIM 4 — Tamamlandı */}
          {step === "done" && (
            <div className="text-center py-8 space-y-4">
              <div className="text-6xl">✅</div>
              <p className={`font-bold text-lg ${d ? "text-emerald-400" : "text-emerald-600"}`}>
                {isEN ? "Thank you for your participation!" : "Katılımınız için teşekkürler!"}
              </p>
              <p className={`text-sm ${d ? "text-slate-400" : "text-slate-500"}`}>
                {isEN
                  ? "Your responses have been recorded. The results will be shared with you after the research is completed."
                  : "Yanıtlarınız kaydedildi. Araştırma tamamlandıktan sonra sonuçlar sizinle paylaşılacaktır."}
              </p>
              <p className={`text-xs italic ${d ? "text-slate-600" : "text-slate-400"}`}>
                {isEN
                  ? "Principal Investigator: Prof. Dr. Utku KÖSE — utkukose@sdu.edu.tr"
                  : "Araştırma Yürütücüsü: Prof. Dr. Utku KÖSE — utkukose@sdu.edu.tr"}
              </p>
              <button onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold">
                {isEN ? "Close" : "Kapat"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
