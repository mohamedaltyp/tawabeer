"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/lib/theme";

interface Shop {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  owner_name: string;
  owner_phone: string;
  owner_password: string;
  current_number: number;
  is_active: number;
  plan: string;
  plan_status: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  "مطعم": "🍽️", "حلاق": "💈", "عيادة": "🏥", "مغسلة": "🧺",
  "بنك": "🏦", "صيدلية": "💊", "مخبز": "🥖", "سوبرماركت": "🛒",
  "مكتبة": "📚", "مركز طبي": "🏥", "معمل تحاليل": "🔬", "عيادة أسنان": "🦷",
};

function getCategoryEmoji(category: string): string {
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (category?.includes(key)) return emoji;
  }
  return "🏪";
}

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: "مجاني", color: "text-gray-600", bg: "bg-gray-100" },
  basic: { label: "⭐ أساسي", color: "text-blue-600", bg: "bg-blue-50" },
  pro: { label: "💎 احترافية", color: "text-purple-600", bg: "bg-purple-50" },
  enterprise: { label: "🏢 مؤسسات", color: "text-amber-600", bg: "bg-amber-50" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const [view, setView] = useState<"login" | "register">("login");
  const [shops, setShops] = useState<Shop[]>([]);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggedIn, setLoggedIn] = useState<{ phone: string; name: string } | null>(null);

  const [newShop, setNewShop] = useState({
    name: "", description: "", category: "", address: "",
    phone: "", owner_name: "", owner_phone: "", owner_password: "",
  });

  useEffect(() => {
    const stored = sessionStorage.getItem("dawer_owner");
    if (stored) {
      const data = JSON.parse(stored);
      setLoggedIn(data);
      fetchShops(data.phone);
    }
  }, []);

  const fetchShops = async (ownerPhone: string) => {
    const res = await fetch("/api/shops", { headers: { "ngrok-skip-browser-warning": "true" } });
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
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
          <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🔢</span>
              <span className="text-xl font-black bg-gradient-to-l from-indigo-600 to-purple-600 bg-clip-text text-transparent">دورك</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/pricing" className="hidden sm:flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                <span>💎</span>
                <span>الباقات</span>
              </Link>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                <span>👋</span>
                <span className="font-medium">{loggedIn.name}</span>
              </div>
              <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                خروج
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900 mb-1">مرحباً {loggedIn.name}! 👋</h1>
            <p className="text-gray-400 text-sm">إدارة محلاتك وطوابيرك من مكان واحد</p>
          </div>

          {shops.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl bg-white border border-gray-100 p-12 text-center shadow-sm">
              <div className="text-7xl mb-6 animate-float">🏪</div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">ليس لديك محلات بعد</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">أضف أول محل لك لبدء إدارة الطوابير واستقبال العملاء</p>
              <div className="max-w-sm mx-auto">
                <AddShopForm onAdded={() => fetchShops(loggedIn.phone)} />
              </div>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <div className="card p-4 text-center">
                  <span className="text-2xl block mb-1">🏪</span>
                  <p className="text-2xl font-black text-gray-900">{shops.length}</p>
                  <p className="text-xs text-gray-400">عدد المحلات</p>
                </div>
                <div className="card p-4 text-center">
                  <span className="text-2xl block mb-1">🔄</span>
                  <p className="text-2xl font-black text-indigo-600">
                    {shops.reduce((sum, s) => sum + (s.current_number || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-400">إجمالي الأدوار</p>
                </div>
                <div className="card p-4 text-center">
                  <span className="text-2xl block mb-1">💎</span>
                  <p className="text-2xl font-black text-purple-600">
                    {shops.filter((s) => s.plan !== "free").length}
                  </p>
                  <p className="text-xs text-gray-400">باقات مدفوعة</p>
                </div>
                <div className="card p-4 text-center">
                  <span className="text-2xl block mb-1">✅</span>
                  <p className="text-2xl font-black text-emerald-600">
                    {shops.filter((s) => s.is_active === 1).length}
                  </p>
                  <p className="text-xs text-gray-400">محلات نشطة</p>
                </div>
              </div>

              {/* Shops Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">محلاتك</h2>
                <AddShopModal onAdded={() => fetchShops(loggedIn.phone)} />
              </div>

              {/* Shops Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shops.map((shop) => {
                  const planInfo = PLAN_LABELS[shop.plan] || PLAN_LABELS.free;
                  return (
                    <div
                      key={shop.id}
                      className="card p-5 hover:shadow-lg transition-all group"
                    >
                      {/* Shop Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl">
                            {getCategoryEmoji(shop.category)}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{shop.name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {shop.category && (
                                <span className="text-xs text-gray-400">{shop.category}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${planInfo.bg} ${planInfo.color}`}>
                          {planInfo.label}
                        </span>
                      </div>

                      {/* Address */}
                      {shop.address && (
                        <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                          <span>📍</span>
                          <span>{shop.address}</span>
                        </p>
                      )}

                      {/* Current Number */}
                      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 mb-4">
                        <span className="text-xs text-gray-400">الدور الحالي</span>
                        <span className="text-lg font-black text-indigo-600">{shop.current_number || 0}</span>
                      </div>

                      {/* Shop ID */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 mb-4">
                        <span>🆔</span>
                        <code dir="ltr" className="text-gray-500 font-mono text-[10px] flex-1 truncate">{shop.id}</code>
                        <button
                          onClick={() => navigator.clipboard.writeText(shop.id)}
                          className="text-indigo-500 hover:text-indigo-700 flex-shrink-0"
                          title="نسخ"
                        >
                          📋
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/shop/${shop.id}`)}
                          className="rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>⚡</span>
                          <span>إدارة</span>
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/shop/${shop.id}/stats`)}
                          className="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>📊</span>
                          <span>إحصائيات</span>
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/shop/${shop.id}/qr`)}
                          className="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>📱</span>
                          <span>QR</span>
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/shop/${shop.id}/settings`)}
                          className="rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>⚙️</span>
                          <span>إعدادات</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ─── Login / Register View ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🔢</span>
            <span className="text-3xl font-black bg-gradient-to-l from-indigo-600 to-purple-600 bg-clip-text text-transparent">دورك</span>
          </Link>
          <p className="mt-2 text-gray-500 text-sm">منصة إدارة الطوابير الذكية للمحلات</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white shadow-xl border border-gray-100 p-8">
          {/* Tabs */}
          <div className="flex mb-6 rounded-2xl bg-gray-50 p-1">
            <button
              onClick={() => { setView("login"); setError(""); }}
              className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
                view === "login"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              🔑 تسجيل دخول
            </button>
            <button
              onClick={() => { setView("register"); setError(""); }}
              className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
                view === "register"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              🏪 محل جديد
            </button>
          </div>

          {view === "login" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">رقم الهاتف</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0100xxxxxxx"
                  className="input-field"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 text-center animate-fade-in">
                  ⚠️ {error}
                </div>
              )}
              <button
                onClick={handleLogin}
                disabled={loggingIn}
                className="btn-primary w-full text-base flex items-center justify-center gap-2"
              >
                {loggingIn ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>🔑</span>
                    <span>تسجيل الدخول</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="🏪 اسم المحل *"
                value={newShop.name}
                onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                className="input-field"
              />
              <input
                type="text"
                placeholder="👤 اسم صاحب المحل *"
                value={newShop.owner_name}
                onChange={(e) => setNewShop({ ...newShop, owner_name: e.target.value })}
                className="input-field"
              />
              <input
                type="tel"
                placeholder="📱 رقم هاتف صاحب المحل *"
                value={newShop.owner_phone}
                onChange={(e) => setNewShop({ ...newShop, owner_phone: e.target.value })}
                className="input-field"
              />
              <input
                type="password"
                placeholder="🔑 كلمة المرور *"
                value={newShop.owner_password}
                onChange={(e) => setNewShop({ ...newShop, owner_password: e.target.value })}
                className="input-field"
              />
              <select
                value={newShop.category}
                onChange={(e) => setNewShop({ ...newShop, category: e.target.value })}
                className="input-field"
              >
                <option value="">اختر التصنيف</option>
                <option value="مطعم">🍽️ مطعم</option>
                <option value="حلاق">💈 حلاق</option>
                <option value="عيادة">🏥 عيادة</option>
                <option value="مغسلة">🧺 مغسلة</option>
                <option value="صيدلية">💊 صيدلية</option>
                <option value="مخبز">🥖 مخبز</option>
                <option value="سوبرماركت">🛒 سوبرماركت</option>
                <option value="بنك">🏦 بنك</option>
                <option value="مكتبة">📚 مكتبة</option>
                <option value="معمل تحاليل">🔬 معمل تحاليل</option>
                <option value="أخرى">🏪 أخرى</option>
              </select>
              <input
                type="text"
                placeholder="📍 العنوان (اختياري)"
                value={newShop.address}
                onChange={(e) => setNewShop({ ...newShop, address: e.target.value })}
                className="input-field"
              />
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 text-center animate-fade-in">
                  ⚠️ {error}
                </div>
              )}
              <button
                onClick={handleRegister}
                className="btn-primary w-full text-base flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>افتح محلك الآن</span>
              </button>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-indigo-600 transition-colors inline-flex items-center gap-1">
            <span>←</span>
            <span>العودة للرئيسية</span>
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.name || !form.owner_name || !form.owner_phone || !form.owner_password) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      onAdded();
    } catch {
      setError("حدث خطأ في الإضافة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 text-right">
      <input placeholder="🏪 اسم المحل *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
      <input placeholder="👤 اسم صاحب المحل *" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="input-field" />
      <input type="tel" placeholder="📱 رقم هاتف صاحب المحل *" value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} className="input-field" />
      <input type="password" placeholder="🔑 كلمة المرور *" value={form.owner_password} onChange={(e) => setForm({ ...form, owner_password: e.target.value })} className="input-field" />
      {error && <div className="text-sm text-red-500 text-center">{error}</div>}
      <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>جاري الإضافة...</span>
          </>
        ) : (
          <>
            <span>➕</span>
            <span>أضف المحل</span>
          </>
        )}
      </button>
    </div>
  );
}

// ─── Add Shop Modal Button ───
function AddShopModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-2 text-sm"
      >
        <span>➕</span>
        <span>أضف محل</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">🏪 محل جديد</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">✕</button>
            </div>
            <AddShopForm onAdded={() => { setOpen(false); onAdded(); }} />
          </div>
        </div>
      )}
    </>
  );
}
