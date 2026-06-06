"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shops", { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => { setShops(d.shops || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = shops.filter(
    (s) =>
      s.name.includes(search) ||
      s.category.includes(search) ||
      s.description.includes(search)
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔢</span>
            <span className="text-xl font-bold text-indigo-700">دورك</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-indigo-600 transition-colors"
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
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-12">كيف يعمل النظام؟</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { icon: "📱", title: "1. امسح QR", desc: "الزبون يمسح QR الخاص بمحلك" },
            { icon: "🔢", title: "2. خذ رقمك", desc: "يحصل على رقم دوره ووقت الانتظار التقديري" },
            { icon: "✅", title: "3. انتظر دورك", desc: "يصل له إشعار لحظة قدوم دوره" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-white p-8 text-center shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="bg-white py-20 border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900 mb-12">مزايا النظام</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "⚡", title: "وقت حقيقي", desc: "تحديثات لحظية عبر Server-Sent Events" },
              { icon: "📊", title: "إحصائيات", desc: "تحليلات أوقات الذروة ومتوسط الانتظار" },
              { icon: "🎯", title: "QR كود مخصص", desc: "كل محل له QR كود خاص قابل للطباعة" },
              { icon: "📱", title: "بدون تحميل", desc: "تطبيق ويب — لا يحتاج تحميل أي برنامج" },
              { icon: "🔔", title: "إشعارات فورية", desc: "الزبون يعرف لحظة قدوم دوره" },
              { icon: "📈", title: "تقارير", desc: "إحصائيات يومية وأسبوعية وشهرية" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
                <span className="text-2xl shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Shops ─── */}
      <section id="shops" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900">المحلات المتاحة</h2>
          <p className="mt-2 text-gray-500">اختر المحل اللي عايز تروح له</p>
        </div>

        {/* Search */}
        <div className="mx-auto max-w-md mb-8">
          <input
            type="text"
            placeholder="🔍 ابحث عن محل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-right text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {search ? "لا توجد محلات بهذا الاسم" : "لا توجد محلات بعد — كن أول من يفتح محله!"}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((shop) => (
              <button
                key={shop.id}
                onClick={() => router.push(`/shop/${shop.id}`)}
                className="group rounded-2xl bg-white p-6 text-right shadow-sm hover:shadow-lg border border-gray-100 hover:border-indigo-200 transition-all animate-fade-in"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {shop.name}
                    </h3>
                    {shop.category && (
                      <span className="mt-1 inline-block rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-medium text-indigo-600">
                        {shop.category}
                      </span>
                    )}
                  </div>
                  <span className="text-2xl">🏪</span>
                </div>
                {shop.description && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">{shop.description}</p>
                )}
                {shop.address && (
                  <p className="mt-1 text-xs text-gray-400">📍 {shop.address}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    يحصل على رقمه الآن
                  </span>
                  <span className="rounded-lg bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-600">
                    ادخل المحل ←
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 bg-white py-8 text-center text-sm text-gray-400">
        <p>© 2026 دورك — كل الحقوق محفوظة</p>
        <Link href="/admin" className="mt-2 inline-block text-xs text-gray-300 hover:text-indigo-400 transition-colors">
          👑 المشرف
        </Link>
      </footer>
    </div>
  );
}
