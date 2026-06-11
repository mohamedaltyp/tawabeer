"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";

interface Shop {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  current_number: number;
}

export default function HomePage() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shops", { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => { setShops(d.shops || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Transliteration mapping: common Arabic terms ↔ English
  const TRANSLITERATION: Record<string, string[]> = {
    محل: ["mahal", "shop", "store"],
    مطعم: ["matam", "restaurant", "mat'aam"],
    حلاق: ["halaq", "barber", "salon"],
    عيادة: ["clinic", "clayda"],
    مغسلة: ["maghsala", "laundry"],
    بنك: ["bank"],
    صيدلية: ["saydaliya", "pharmacy"],
    مخبز: ["makhbaz", "bakery"],
    سوبرماركت: ["supermarket", "super market"],
    مكتبة: ["maktaba", "bookstore", "library"],
    مركز: ["markaz", "center"],
    طبي: ["tibbi", "medical"],
    صحة: ["sihha", "health"],
  };

  // Build a bidirectional lookup: Arabic ↔ transliterated/English forms
  const allTransliterations: Record<string, string[]> = {};
  for (const [arabic, englishForms] of Object.entries(TRANSLITERATION)) {
    const key = arabic.toLowerCase();
    if (!allTransliterations[key]) allTransliterations[key] = [];
    allTransliterations[key].push(...englishForms);
    // Reverse: english → arabic + other english forms
    for (const eng of englishForms) {
      const engKey = eng.toLowerCase();
      if (!allTransliterations[engKey]) allTransliterations[engKey] = [];
      allTransliterations[engKey].push(arabic, ...englishForms.filter(e => e !== eng));
    }
  }

  function matchesSearch(field: string, query: string): boolean {
    if (!field || !query) return false;
    const fieldLower = field.toLowerCase();
    const queryLower = query.toLowerCase();
    // Direct match (Arabic or English)
    if (fieldLower.includes(queryLower)) return true;
    // Check transliteration expansion for query
    const expansions = allTransliterations[queryLower];
    if (expansions) {
      return expansions.some(exp => fieldLower.includes(exp.toLowerCase()));
    }
    // Check if the field itself has a transliteration that matches the query
    for (const [key, vals] of Object.entries(allTransliterations)) {
      if (fieldLower.includes(key)) {
        if (vals.some(v => v.toLowerCase().includes(queryLower))) return true;
      }
    }
    return false;
  }

  const filtered = shops.filter(
    (s) =>
      matchesSearch(s.name, search) ||
      matchesSearch(s.category, search) ||
      matchesSearch(s.description, search) ||
      matchesSearch(s.address, search)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F0D1A] dark:text-gray-100" dir="rtl">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔢</span>
            <span className="text-xl font-bold text-indigo-700">دورك</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-all"
            >
              افتح محلك
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0tMTIgMGMxLjY1NyAwIDMtMS4zNDMgMy0zcy0xLjM0My0zLTMtMy0zIDEuMzQzLTMgMyAxLjM0MyAzIDMgM3oiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            ودّع الطوابير ✨
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-100">
            نظام إدارة قوائم الانتظار الرقمي — زبونك ياخذ رقمه من qr كود،
            يتابع دوره في الوقت الحقيقي، وأنت تدير طابورك بضغطة زر
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-indigo-700 hover:bg-indigo-50 transition-all shadow-xl hover:shadow-2xl"
            >
              👨‍💼 ابدأ بإدارة محلك
            </Link>
            <Link
              href="#shops"
              className="rounded-2xl border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold text-white hover:bg-white/20 backdrop-blur-sm transition-all"
            >
              🔍 ابحث عن محل
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-12">كيف يعمل النظام؟</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { icon: "📱", title: "1. امسح QR", desc: "الزبون يمسح QR الخاص بمحلك" },
            { icon: "🔢", title: "2. خذ رقمك", desc: "يحصل على رقم دوره ووقت الانتظار التقديري" },
            { icon: "✅", title: "3. انتظر دورك", desc: "يصل له إشعار لحظة قدوم دوره" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-white dark:bg-gray-800 p-8 text-center shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700">
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
              <p className="text-gray-500 dark:text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="bg-white dark:bg-gray-900 py-20 border-t border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-12">مزايا النظام</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "⚡", title: "وقت حقيقي", desc: "تحديثات لحظية عبر Server-Sent Events" },
              { icon: "📊", title: "إحصائيات", desc: "تحليلات أوقات الذروة ومتوسط الانتظار" },
              { icon: "🎯", title: "QR كود مخصص", desc: "كل محل له QR كود خاص قابل للطباعة" },
              { icon: "📱", title: "بدون تحميل", desc: "تطبيق ويب — لا يحتاج تحميل أي برنامج" },
              { icon: "🔔", title: "إشعارات فورية", desc: "الزبون يعرف لحظة قدوم دوره" },
              { icon: "📈", title: "تقارير", desc: "إحصائيات يومية وأسبوعية وشهرية" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                <span className="text-2xl shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{f.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Shops ─── */}
      <section id="shops" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">المحلات المتاحة</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">اختر المحل اللي عايز تروح له</p>
        </div>

        {/* Search */}
        <div className="mx-auto max-w-md mb-8">
          <input
            type="text"
            placeholder="🔍 ابحث عن محل... (عربي / English)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-3 text-right text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/30 transition-all"
          />
        </div>

        {!loading && search && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mb-4">
            {filtered.length > 0
              ? `${filtered.length} نتيجة${filtered.length !== 1 ? "" : ""} "${search}"`
              : `لا توجد نتائج لـ "${search}"`}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            {search ? "لا توجد محلات بهذا الاسم" : "لا توجد محلات بعد — كن أول من يفتح محله!"}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((shop) => (
              <button
                key={shop.id}
                onClick={() => router.push(`/shop/${shop.id}`)}
                className="group rounded-2xl bg-white dark:bg-gray-800 p-6 text-right shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 hover:border-indigo-200 transition-all animate-fade-in"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      {shop.name}
                    </h3>
                    {shop.category && (
                      <span className="mt-1 inline-block rounded-full bg-indigo-50 dark:bg-indigo-900/40 px-3 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {shop.category}
                      </span>
                    )}
                  </div>
                  <span className="text-2xl">🏪</span>
                </div>
                {shop.description && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{shop.description}</p>
                )}
                {shop.address && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">📍 {shop.address}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    يحصل على رقمه الآن
                  </span>
                  <span className="rounded-lg bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    ادخل المحل ←
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        <p>© 2026 دورك — كل الحقوق محفوظة</p>
        <Link href="/admin" className="mt-2 inline-block text-xs text-gray-300 dark:text-gray-600 hover:text-indigo-400 transition-colors">
          👑 المشرف
        </Link>
      </footer>
    </div>
  );
}
