"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Shop {
  id: string;
  name: string;
  description: string;
  category: string;
  owner_name: string;
  owner_phone: string;
  owner_password: string;
  current_number: number;
  is_active: number;
  plan: string;
  plan_status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<"login" | "register">("login");
  const [shops, setShops] = useState<Shop[]>([]);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggedIn, setLoggedIn] = useState<{ phone: string; name: string } | null>(null);

  // New shop form
  const [newShop, setNewShop] = useState({
    name: "",
    description: "",
    category: "",
    address: "",
    phone: "",
    owner_name: "",
    owner_phone: "",
    owner_password: "",
  });

  // Check if already logged in via sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("dawer_owner");
    if (stored) {
      const data = JSON.parse(stored);
      setLoggedIn(data);
      fetchShops(data.phone);
    }
  }, []);

  const fetchShops = async (ownerPhone: string) => {
    const res = await fetch("/api/shops", {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    const data = await res.json();
    setShops((data.shops || []).filter((s: Shop) => s.owner_phone === ownerPhone));
  };

  const handleLogin = () => {
    if (loggingIn) return;
    setError("");
    setLoggingIn(true);
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify({ phone, password }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const data = { phone: d.owner.phone, name: d.owner.name };
          setLoggedIn(data);
          sessionStorage.setItem("dawer_owner", JSON.stringify(data));
          setShops(d.shops || []);
        } else {
          setError(d.error || "رقم الهاتف أو كلمة المرور غير صحيحة");
        }
      })
      .catch(() => setError("حدث خطأ في الاتصال"))
      .finally(() => setLoggingIn(false));
  };

  const handleRegister = async () => {
    setError("");
    if (!newShop.name || !newShop.owner_name || !newShop.owner_phone || !newShop.owner_password) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(newShop),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      // Auto login
      const loginData = { phone: newShop.owner_phone, name: newShop.owner_name };
      setLoggedIn(loginData);
      sessionStorage.setItem("dawer_owner", JSON.stringify(loginData));
      fetchShops(loginData.phone);
    } catch {
      setError("حدث خطأ في التسجيل");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("dawer_owner");
    setLoggedIn(null);
    setShops([]);
  };

  // ─── Logged In View ───
  if (loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-indigo-700">دورك</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/pricing" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                💎 الباقات
              </Link>
              <span className="text-sm text-gray-500">👋 {loggedIn.name}</span>
              <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">
                تسجيل خروج
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">لوحة التحكم</h1>

          {shops.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center shadow-sm">
              <span className="text-5xl block mb-4">🏪</span>
              <h2 className="text-xl font-bold text-gray-900 mb-2">ليس لديك محلات بعد</h2>
              <p className="text-gray-500 mb-6">أضف أول محل لك لبدء إدارة الطوابير</p>
              <AddShopForm onAdded={() => fetchShops(loggedIn.phone)} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">محلاتك</h2>
                <AddShopModal onAdded={() => fetchShops(loggedIn.phone)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{shop.name}</h3>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {shop.category && (
                            <span className="inline-block rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-medium text-indigo-600">
                              {shop.category}
                            </span>
                          )}
                          <span className="inline-block rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-500">
                            {shop.plan === "free" ? "مجاني" : shop.plan === "basic" ? "⭐ أساسي" : shop.plan === "pro" ? "💎 احترافية" : "🏢 مؤسسات"}
                          </span>
                        </div>
                      </div>
                      <span className="text-3xl">{shop.category === "مطعم" ? "🍽️" : shop.category === "حلاق" ? "💈" : shop.category === "عيادة" ? "🏥" : "🏪"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>🔄 رقم الحالي: <strong className="text-indigo-600">{shop.current_number || 0}</strong></span>
                    </div>
                    <div className="mb-4 flex items-center gap-1 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5">
                      <span>🆔 رقم المحل:</span>
                      <code dir="ltr" className="text-gray-600 font-mono text-[11px]">{shop.id}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(shop.id); }}
                        className="mr-auto text-indigo-500 hover:text-indigo-700"
                        title="نسخ المعرف"
                      >
                        📋
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/shop/${shop.id}`)}
                        className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-all"
                      >
                        إدارة الطابور
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/shop/${shop.id}/qr`)}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-all"
                      >
                        📱 QR
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/shop/${shop.id}/stats`)}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-all"
                      >
                        📊
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── Login / Register View ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-700">
            <span>🔢</span> دورك
          </Link>
          <p className="mt-2 text-gray-500">منصة إدارة الطوابير للمحلات</p>
        </div>

        <div className="rounded-2xl bg-white shadow-xl border border-gray-100 p-8">
          <div className="flex mb-6 rounded-xl bg-gray-50 p-1">
            <button
              onClick={() => setView("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${view === "login" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              تسجيل دخول
            </button>
            <button
              onClick={() => setView("register")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${view === "register" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              محل جديد
            </button>
          </div>

          {view === "login" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0100xxxxxxx"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              {error && <div className="text-sm text-red-500 text-center">{error}</div>}
              <button
                onClick={handleLogin}
                disabled={loggingIn}
                className={`w-full rounded-2xl py-3.5 text-white font-bold transition-all shadow-lg ${
                  loggingIn
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {loggingIn ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="🏪 اسم المحل *"
                value={newShop.name}
                onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
              />
              <input
                type="text"
                placeholder="👤 اسم صاحب المحل *"
                value={newShop.owner_name}
                onChange={(e) => setNewShop({ ...newShop, owner_name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
              />
              <input
                type="tel"
                placeholder="📱 رقم هاتف صاحب المحل *"
                value={newShop.owner_phone}
                onChange={(e) => setNewShop({ ...newShop, owner_phone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
              />
              <input
                type="password"
                placeholder="🔑 كلمة المرور *"
                value={newShop.owner_password}
                onChange={(e) => setNewShop({ ...newShop, owner_password: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
              />
              <select
                value={newShop.category}
                onChange={(e) => setNewShop({ ...newShop, category: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50 appearance-none"
              >
                <option value="">اختر التصنيف</option>
                <option value="مطعم">🍽️ مطعم</option>
                <option value="حلاق">💈 حلاق</option>
                <option value="عيادة">🏥 عيادة</option>
                <option value="مغسلة">🧺 مغسلة</option>
                <option value="صيدلية">💊 صيدلية</option>
                <option value="أخرى">🏪 أخرى</option>
              </select>
              <input
                type="text"
                placeholder="📍 العنوان"
                value={newShop.address}
                onChange={(e) => setNewShop({ ...newShop, address: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
              />
              {error && <div className="text-sm text-red-500 text-center">{error}</div>}
              <button
                onClick={handleRegister}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg"
              >
                🚀 افتح محلك الآن
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-indigo-600 transition-colors">
            ← العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Add Shop Form (inline) ───
function AddShopForm({ onAdded }: { onAdded: () => void }) {
  const [form, setForm] = useState({
    name: "", description: "", category: "", address: "",
    owner_name: "", owner_phone: "", owner_password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!form.name || !form.owner_name || !form.owner_phone || !form.owner_password) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    const res = await fetch("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    onAdded();
  };

  return (
    <div className="space-y-3 text-right max-w-sm mx-auto">
      <input placeholder="اسم المحل *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none" />
      <input placeholder="اسم صاحب المحل *" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none" />
      <input type="tel" placeholder="رقم هاتف صاحب المحل *" value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none" />
      <input type="password" placeholder="كلمة المرور *" value={form.owner_password} onChange={(e) => setForm({ ...form, owner_password: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none" />
      {error && <div className="text-sm text-red-500 text-center">{error}</div>}
      <button onClick={handleSubmit} className="w-full rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700">إضافة المحل</button>
    </div>
  );
}

// ─── Add Shop Modal Button ───
function AddShopModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-all shadow-sm">
        + أضف محل
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">محل جديد</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <AddShopForm onAdded={() => { setOpen(false); onAdded(); }} />
          </div>
        </div>
      )}
    </>
  );
}
