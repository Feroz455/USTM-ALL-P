// AboutModal.jsx — STING Hakkında Bilgi Modalı
import { createPortal } from "react-dom";

const TR_TEXT = `STING: Dijital İkiz Yönelimli Derin Öğrenme ile Çocukluk Çağı Akut Lösemisi İçin İlaç Yeniden Konumlandırma Karar Destek Sistemi Geliştirilmesi

Destek: Türkiye Bilimsel ve Teknolojik Araştırma Kurumu (TÜBİTAK)
Çağrı: 1001 – Bilimsel ve Teknolojik Araştırma Projelerini Destekleme Programı
Süre: 30 Ay (2023-2026)
Proje Yürütücüsü: Prof. Dr. Utku KÖSE
Proje Yürütücü Kuruluş: Süleyman Demirel Üniversitesi

Bu proje, Çocukluk Çağı Akut Lösemisi için Dijital İkiz yönelimli mekanizmaları ve Derin Öğrenme tekniklerini kullanarak, ilaç yeniden konumlandırma değerlendirmeleri yapabilen bir karar destek sistemi (STING) geliştirmeyi amaçlamaktadır. Geliştirilecek karar destek sistemi, yeniden konumlandırılan ilaçların etkinliğini değerlendirmek adına Çocukluk Çağı Akut Lösemisi olan çok sayıda sentetik hastayı oluşturarak hastaların ilaç kullanımları neticesindeki durumları hakkında kullanıcıya dönütler sağlayacaktır.

Projenin özgün değeri, Çocukluk Çağı Akut Lösemisi için Yapay Zeka destekli ilaç yeniden konumlandırmanın sağlanması yanında, Derin Öğrenme tabanlı ilaç yeniden konumlandırma çözümünün elde edilmesi, Adi Diferansiyel Denklemler üzerinden hesaplamalı bir hasta modelinin geliştirilmesi ve sentetik hastalar ile ilaç etkileşimlerinin değerlendirildiği Dijital İkiz yönelimli bir mekanizmanın oluşturulması ile ilişkilidir.`;

const EN_TEXT = `STING: Development of a Drug Repositioning Decision Support System for Childhood Acute Leukemia by Digital Twin-Oriented Deep Learning

Funding Agency: The Scientific and Technological Research Council of Türkiye (TUBITAK)
Call: 1001 – The Scientific and Technological Research Projects Funding Program
Time Period: 30 Months (2023-2026)
Project PI: Prof. Dr. Utku KÖSE
Project Institution: Süleyman Demirel University, Turkey

This project aims to develop a decision support system (STING), which is able to perform drug repositioning assessments for Childhood Acute Leukemia, by using Digital Twin-oriented mechanisms and Deep Learning techniques. The developed decision support system will create a large number of synthetic patients with Childhood Acute Leukemia, in order to evaluate the effectiveness of repositioned drugs and provide feedback to the user about the status of the patients after their drug use.

The novelty of the project is associated with providing an Artificial Intelligence-supported drug repositioning solution for Childhood Acute Leukemia as well as ensuring a Deep Learning-based drug repositioning for Childhood Acute Leukemia, developing a computational patient model based on Ordinary Differential Equations, and forming a Digital Twin-oriented mechanism where drug interactions with synthetic patients are evaluated.`;

const DEVELOPERS = [
  { name_tr: "Prof. Dr. Utku Köse",        name_en: "Prof. Dr. Utku Köse",     role_tr: "Proje Yürütücüsü / Geliştirici", role_en: "Principal Investigator / Developer" },
  { name_tr: "Prof. Dr. Gözde Özkan Tükel", name_en: "Prof. Dr. Gözde Özkan Tükel", role_tr: "Araştırmacı / Geliştirici", role_en: "Researcher / Developer" },
  { name_tr: "Dr. Öğr. Üyesi İlhan Uysal", name_en: "Assist. Prof. Dr. İlhan Uysal", role_tr: "Araştırmacı / Geliştirici", role_en: "Researcher / Developer" },
  { name_tr: "Öğr. Gör. Osman Ceylan",     name_en: "Lect. Osman Ceylan",      role_tr: "Araştırmacı / Geliştirici", role_en: "Researcher / Developer" },
  { name_tr: "Öğr. Gör. Emine Betül Sürücü", name_en: "Lect. Emine Betül Sürücü", role_tr: "Araştırmacı / Geliştirici", role_en: "Researcher / Developer" },
];

export default function AboutModal({ dark, isEN, onClose }) {
  const d = dark;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
         onClick={onClose}>
      <div
        className={`rounded-2xl border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
          d ? "bg-slate-900 border-indigo-900/40" : "bg-white border-indigo-200"
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${
          d ? "bg-slate-900 border-slate-800" : "bg-white border-indigo-100"
        }`}>
          <div>
            <p className={`font-bold text-base ${d ? "text-slate-100" : "text-slate-800"}`}>
              {isEN ? "About STING" : "STING Hakkında"}
            </p>
            <p className={`text-xs mt-0.5 ${d ? "text-slate-400" : "text-slate-500"}`}>
              TÜBİTAK 1001 · Proje No: 123E383
            </p>
          </div>
          <button onClick={onClose}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              d ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
            }`}>✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Logo / Başlık */}
          <div className={`rounded-xl p-4 text-center ${
            d ? "bg-indigo-500/10 border border-indigo-500/20" : "bg-indigo-50 border border-indigo-100"
          }`}>
            <p className={`text-lg font-black tracking-wide ${d ? "text-indigo-300" : "text-indigo-700"}`}>
              STING DSS
            </p>
            <p className={`text-xs mt-1 ${d ? "text-slate-400" : "text-slate-500"}`}>
              {isEN
                ? "Digital Twin & Deep Learning for Drug Repositioning of Childhood ALL"
                : "Dijital İkiz Yönelimli Derin Öğrenme ile Çocukluk Çağı ALL İçin İlaç Yeniden Konumlandırma"}
            </p>
            <a href="https://sting.sdu.edu.tr" target="_blank" rel="noreferrer"
              className={`inline-block mt-2 text-xs font-semibold underline ${
                d ? "text-indigo-400" : "text-indigo-600"
              }`}>
              🌐 sting.sdu.edu.tr
            </a>
          </div>

          {/* Proje açıklaması */}
          <div>
            <p className={`text-xs font-bold mb-2 ${d ? "text-slate-400" : "text-slate-600"}`}>
              {isEN ? "Project Description" : "Proje Tanıtımı"}
            </p>
            <div className={`rounded-xl p-4 text-xs leading-relaxed whitespace-pre-line ${
              d ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-700"
            }`}>
              {isEN ? EN_TEXT : TR_TEXT}
            </div>
            <a href={isEN ? "https://sting.sdu.edu.tr/introduction/" : "https://sting.sdu.edu.tr/tr/tanitim/"}
              target="_blank" rel="noreferrer"
              className={`inline-block mt-2 text-xs font-semibold underline ${
                d ? "text-indigo-400" : "text-indigo-600"
              }`}>
              {isEN ? "→ Read more on project website" : "→ Proje sitesinde daha fazlası"}
            </a>
          </div>

          {/* Sistem geliştiricileri */}
          <div>
            <p className={`text-xs font-bold mb-2 ${d ? "text-slate-400" : "text-slate-600"}`}>
              {isEN ? "System Developers" : "Sistem Geliştiricileri"}
            </p>
            <div className="space-y-2">
              {DEVELOPERS.map(dev => (
                <div key={dev.name_tr}
                  className={`rounded-xl px-4 py-2.5 flex items-center justify-between border ${
                    d ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                  }`}>
                  <p className={`text-xs font-semibold ${d ? "text-slate-200" : "text-slate-700"}`}>
                    {isEN ? dev.name_en : dev.name_tr}
                  </p>
                  <p className={`text-xs ${d ? "text-slate-500" : "text-slate-400"}`}>
                    {isEN ? dev.role_en : dev.role_tr}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className={`rounded-xl px-4 py-3 text-center text-xs ${
            d ? "bg-slate-800 text-slate-500" : "bg-slate-50 text-slate-400"
          }`}>
            <p>Süleyman Demirel Üniversitesi · TÜBİTAK 1001 · Proje No: 123E383</p>
            <p className="mt-0.5">© 2024–2026 STING Project Team. {isEN ? "Academic research purposes only." : "Yalnızca akademik araştırma amaçlıdır."}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
