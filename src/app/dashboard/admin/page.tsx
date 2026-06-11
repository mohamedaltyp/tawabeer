"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Shop {
  id: string;
  name: string;
  slug: string;
  owner_name: string;
  owner_phone: string;
  category: string;
  plan: string;
  plan_status: string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  current_number: number;
  is_active: boolean;
}

const PLANS = [
  { id: "free", label: "مجاني", icon: "🆓" },
  { id: "basic", label: "⭐ أساسي", icon: "⭐" },
  { id: "pro", label: "💎 احترافية", icon: "💎" },
  { id: "enterprise", label: "🏢 مؤسسات", icon: "🏢" },
];

const PLAN_BADGES: Record<string, { color: string; bg: string }> = {
  free: { color: "text-gray-600", bg: "bg-gray-100" },
  basic: { color: "text-blue-600", bg: "bg-blue-50" },
  pro: { color: "text-purple-600", bg: "bg-purple-50" },
  enterprise: { color: "text-amber-600", bg: "bg-amber-50" },
};

function getExpiryDate(plan: string): string {
  const d = new Date();
  if (plan === "free") d.setFullYear(d.getFullYear() + 10);
  else if (plan === "basic") d.setFullYear(d.getFullYear() + 1);
  else if (plan === "pro") d.setFullYear(d.getFullYear() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activating, setActivating] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Check session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("dawer_admin_token");
    if (saved) {
      setToken(saved);
      setLoggedIn(true);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch shops when logged in
  useEffect(() => {
    if (!loggedIn) return;
    setLoading(true);
    setError("");
    fetch("/api/shops", { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.shops) setShops(d.shops);
        else setError("لا توجد محلات");
      })
      .catch(() => setError("فشل تحميل المحلات"))
      .finally(() => setLoading(false));
  }, [loggedIn]);

  const handleLogin = async () => {
    if (!token.trim()) return;
    setError("");
    try {
      const res = await fetch("/api/auth/admin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("dawer_admin_token", token.trim());
        setLoggedIn(true);
      } else {
        setError(data.error || "كلمة المرور غير صحيحة");
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    }
  };

  const handleActivate = async (shopId: string, plan: string) => {
    setActivating(shopId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/activate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          shopId,
          plan,
          expiresAt: getExpiryDate(plan),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        // Refresh shops
        const r = await fetch("/api/shops", { headers: { "ngrok-skip-browser-warning": "true" } });
        const d = await r.json();
        if (d.shops) setShops(d.shops);
      } else {
        setMessage(`❌ ${data.error || "فشل التفعيل"}`);
      }
    } catch {
      setMessage("❌ حدث خطأ");
    }
    setActivating(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("dawer_admin_token");
    setLoggedIn(false);
    setToken("");
    setShops([]);
  };

  // Login screen
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">🔐</span>
              <h1 className="text-xl font-bold text-gray-900">لوحة تحكم المشرف</h1>
              <p className="text-sm text-gray-400 mt-1">دخول المالك — إدارة الباقات</p>
            </div>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="🔑 كلمة سر المشرف"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm text-center mb-3">{error}</p>
            )}
            <button
              onClick={handleLogin}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-all"
            >
              🔑 تسجيل الدخول
            </button>
            <div className="mt-4 text-center">
              <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
                ← العودة للوحة التحكم
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
            >
              ←
            </Link>
            <h1 className="text-base font-bold text-gray-900">🔐 المشرف</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{shops.length} محل</span>
            <button
              onClick={handleLogout}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              🚪 خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Messages */}
        {message && (
          <div className={`rounded-xl p-4 text-center font-medium text-sm mb-4 ${
            message.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">جاري التحميل...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500">{error}</p>
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">لا توجد محلات</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3">
              {PLANS.map((p) => {
                const count = shops.filter((s) => s.plan === p.id).length;
                const badge = PLAN_BADGES[p.id];
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <span className="text-2xl block mb-1">{p.icon}</span>
                    <p className={`text-lg font-bold ${badge.color}`}>{count}</p>
                    <p className="text-xs text-gray-400">{p.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Shops table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-bold text-gray-900">📋 جميع المحلات</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">المحل</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">المالك</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">الباقة</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">تاريخ الانتهاء</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-medium">تغيير الباقة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shops.map((shop) => {
                      const badge = PLAN_BADGES[shop.plan] || PLAN_BADGES.free;
                      const expires = shop.plan_expires_at
                        ? new Date(shop.plan_expires_at).toLocaleDateString("ar-EG")
                        : "—";
                      return (
                        <tr key={shop.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{shop.name}</span>
                              {!shop.is_active && (
                                <span className="text-xs text-red-500">🔴</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{shop.category || shop.slug}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-900">{shop.owner_name}</p>
                            <p className="text-xs text-gray-400">{shop.owner_phone}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.color}`}>
                              {badge.color.includes("gray") ? "🆓" : badge.color.includes("blue") ? "⭐" : badge.color.includes("purple") ? "💎" : "🏢"} {PLANS.find(p => p.id === shop.plan)?.label || shop.plan}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-400">{expires}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {PLANS.filter((p) => p.id !== shop.plan).map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => handleActivate(shop.id, p.id)}
                                  disabled={activating === shop.id}
                                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                    p.id === "free"
                                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                      : p.id === "basic"
                                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                      : p.id === "pro"
                                      ? "bg-purple-50 text-purple-600 hover:bg-purple-100"
                                      : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                  } disabled:opacity-50`}
                                >
                                  {activating === shop.id ? "..." : p.icon}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
