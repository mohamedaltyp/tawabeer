"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";

const ICONS: Record<string, React.ReactNode> = {
  listNumbers: (<><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/></>),
  scan: (<><path d="M4 7V5a1 1 0 0 1 1-1h2"/><path d="M17 4h2a1 1 0 0 1 1 1v2"/><path d="M20 17v2a1 1 0 0 1-1 1h-2"/><path d="M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M5 12h14"/></>),
  sparkles: (<><path d="M12 3l1.9 4.8L18.7 9l-4.8 1.9L12 15.7l-1.9-4.8L5.3 9l4.8-1.2L12 3z"/><path d="M19 14l.7 2L22 17l-2 .7L19 20l-.7-2L16 17l2-.7L19 14z"/></>),
  store: (<><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M4 9h16"/><path d="M9 20v-6h6v6"/></>),
  search: (<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>),
  bolt: (<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>),
  chart: (<><path d="M4 4v16h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></>),
  smartphone: (<><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></>),
  bell: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>),
  trending: (<><path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/></>),
  pin: (<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></>),
  check: (<><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></>),
  shield: (<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>),
};

function Icon({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

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
    منشأة: ["mahal", "shop", "store"],
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
            <span className="text-indigo-700"><Icon name="listNumbers" size={26} /></span>
            <span className="text-xl font-bold text-indigo-700">طوابير</span>
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
              افتح منشأتك
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0tMTIgMGMxLjY1NyAwIDMtMS4zNDMgMy0zcy0xLjM0My0zLTMtMy0zIDEuMzQzLTMgMyAxLjM0MyAzIDMgM3oiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            <span className="inline-flex items-center justify-center gap-3">ودّع الطوابير <Icon name="sparkles" size={40} className="text-amber-300" /></span>
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
              <span className="inline-flex items-center gap-2"><Icon name="store" size={22} /> ابدأ بإدارة منشأتك</span>
            </Link>
            <Link
              href="#shops"
              className="rounded-2xl border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold text-white hover:bg-white/20 backdrop-blur-sm transition-all"
            >
              <span className="inline-flex items-center gap-2"><Icon name="search" size={22} /> ابحث عن منشأة</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-12">كيف يعمل النظام؟</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { icon: "scan", title: "1. امسح QR", desc: "الزبون يمسح QR الخاص بمنشأتك" },
            { icon: "listNumbers", title: "2. خذ رقمك", desc: "يحصل على رقم دوره ووقت الانتظار التقديري" },
            { icon: "check", title: "3. انتظر طوابير", desc: "يصل له إشعار لحظة قدوم دوره" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-white dark:bg-gray-800 p-8 text-center shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700">
              <div className="mb-4 flex justify-center text-indigo-600"><Icon name={item.icon} size={46} /></div>
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
              { icon: "bolt", title: "وقت حقيقي", desc: "تحديثات لحظية عبر Server-Sent Events" },
              { icon: "chart", title: "إحصائيات", desc: "تحليلات أوقات الذروة ومتوسط الانتظار" },
              { icon: "scan", title: "QR كود مخصص", desc: "كل منشأة له QR كود خاص قابل للطباعة" },
              { icon: "smartphone", title: "بدون تحميل", desc: "تطبيق ويب — لا يحتاج تحميل أي برنامج" },
              { icon: "bell", title: "إشعارات فورية", desc: "الزبون يعرف لحظة قدوم دوره" },
              { icon: "trending", title: "تقارير", desc: "إحصائيات يومية وأسبوعية وشهرية" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                <span className="shrink-0 text-indigo-600 mt-0.5"><Icon name={f.icon} size={26} /></span>
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">المنشآت المتاحة</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">اختر المنشأة اللي عايز تروح له</p>
        </div>

        {/* Search */}
        <div className="mx-auto max-w-md mb-8">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400"><Icon name="search" size={20} /></span>
            <input
              type="text"
              placeholder="ابحث عن منشأة... (عربي / English)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pr-12 pl-5 py-3 text-right text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/30 transition-all"
            />
          </div>
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
            {search ? "لا توجد منشآت بهذا الاسم" : "لا توجد منشآت بعد — كن أول من يفتح منشأةه!"}
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
                  <span className="text-indigo-600"><Icon name="store" size={26} /></span>
                </div>
                {shop.description && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{shop.description}</p>
                )}
                {shop.address && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"><Icon name="pin" size={13} /> {shop.address}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    يحصل على رقمه الآن
                  </span>
                  <span className="rounded-lg bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    ادخل المنشأة ←
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        <p>© 2026 طوابير — كل الحقوق محفوظة</p>
        <Link href="/admin" className="mt-2 inline-block text-xs text-gray-300 dark:text-gray-600 hover:text-indigo-400 transition-colors">
          <span className="inline-flex items-center gap-1"><Icon name="shield" size={13} /> المشرف</span>
        </Link>
      </footer>
    </div>
  );
}
