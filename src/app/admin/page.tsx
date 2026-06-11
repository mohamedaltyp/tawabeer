"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Admin Login ───
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    try {
      const res = await fetch("/api/auth/admin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("dawer_admin", "true");
        onLogin();
      } else {
        setError("❌ كلمة المرور غير صحيحة");
      }
    } catch {
      setError("❌ حدث خطأ في الاتصال");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-4">🔐</span>
          <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم المشرف</h1>
          <p className="text-gray-500 mt-1">دخول المالك — لتفعيل الباقات يدوياً</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm space-y-4">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="كلمة مرور المشرف"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none"
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full rounded-2xl bg-indigo-600 py-3 text-white font-bold hover:bg-indigo-700 transition-all"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Panel ───
function AdminPanel() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shops", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      setShops(data.shops || []);
    } catch {
      setMessage({ type: "error", text: "فشل تحميل المحلات" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleActivate = async (shopId: string, plan: string) => {
    setActivating(shopId);
    setMessage(null);

    // حساب تاريخ الانتهاء (شهر من دلوقتي)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    try {
      const res = await fetch("/api/admin/activate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          adminToken: "dawer-admin-2026",
          shopId,
          plan,
          expiresAt: expiresAt.toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: `✅ تم تفعيل ${plan} لـ ${data.shop.name} حتى ${expiresAt.toLocaleDateString("ar-EG")}` });
        fetchShops();
      } else {
        setMessage({ type: "error", text: data.error || "فشل التفعيل" });
      }
    } catch {
      setMessage({ type: "error", text: "خطأ في الاتصال" });
    }
    setActivating(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("dawer_admin");
    window.location.reload();
  };

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      free: "bg-gray-100 text-gray-500",
      basic: "bg-blue-100 text-blue-700",
      pro: "bg-purple-100 text-purple-700",
      enterprise: "bg-amber-100 text-amber-700",
    };
    const labels: Record<string, string> = {
      free: "مجاني",
      basic: "⭐ أساسي",
      pro: "💎 احترافية",
      enterprise: "🏢 مؤسسات",
    };
    return (
      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${styles[plan] || styles.free}`}>
        {labels[plan] || plan}
      </span>
    );
  };

  // تجميع المحلات حسب رقم هاتف المالك
  const owners = new Map<string, any[]>();
  shops.forEach((shop) => {
    const key = shop.owner_phone || "بدون هاتف";
    if (!owners.has(key)) owners.set(key, []);
    owners.get(key)!.push(shop);
  });

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-indigo-700">👑 دورك — المشرف</span>
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-700">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{shops.length} محل</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-600"
            >
              تسجيل خروج
            </button>
          </div>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div className={`mx-auto max-w-6xl px-4 mt-4 ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
          <div className={`rounded-xl p-4 text-sm font-medium ${message.type === "success" ? "bg-green-50" : "bg-red-50"}`}>
            {message.text}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl bg-white border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400">الإجمالي</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{shops.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400">مجاني</p>
            <p className="text-2xl font-black text-gray-400 mt-1">{shops.filter((s) => s.plan === "free").length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400">مدفوع</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{shops.filter((s) => s.plan !== "free").length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400">إيراد متوقع</p>
            <p className="text-lg font-black text-green-600 mt-1">
              {shops.reduce((sum, s) => {
                const prices: Record<string, number> = { basic: 199, pro: 399, enterprise: 999 };
                return sum + (prices[s.plan] || 0);
              }, 0).toLocaleString("ar-EG")} ج.م
            </p>
          </div>
        </div>

        {/* Shops by Owner */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد محلات بعد</div>
        ) : (
          <div className="space-y-4">
            {Array.from(owners.entries()).map(([phone, ownerShops]) => (
              <div key={phone} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                {/* Owner Header */}
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">{ownerShops[0].owner_name || "بدون اسم"}</span>
                    <span className="text-xs text-gray-400" dir="ltr">📱 {phone}</span>
                  </div>
                  <span className="text-xs text-gray-400">{ownerShops.length} محل</span>
                </div>

                {/* Shops */}
                <div className="divide-y divide-gray-50">
                  {ownerShops.map((shop) => (
                    <div key={shop.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{shop.name}</span>
                          {getPlanBadge(shop.plan)}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-mono" dir="ltr">{shop.id}</p>
                        {shop.plan_expires_at && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            ينتهي: {new Date(shop.plan_expires_at).toLocaleDateString("ar-EG")}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        {["basic", "pro", "enterprise"].map((p) => (
                          <button
                            key={p}
                            onClick={() => handleActivate(shop.id, p)}
                            disabled={activating === shop.id || shop.plan === p}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                              shop.plan === p
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            }`}
                          >
                            {activating === shop.id ? "..." : p === "basic" ? "⭐ أساسي" : p === "pro" ? "💎 احترافية" : "🏢 مؤسسات"}
                          </button>
                        ))}
                        <button
                          onClick={() => handleActivate(shop.id, "free")}
                          disabled={activating === shop.id || shop.plan === "free"}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            shop.plan === "free"
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : "bg-red-50 text-red-500 hover:bg-red-100"
                          }`}
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── 💳 إدارة طرق الدفع ─── */}
        <details className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mt-6">
          <summary className="px-5 py-3 font-bold text-gray-700 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
            <span>💳</span> طرق الدفع
            <span className="text-xs text-gray-400 font-normal">(إضافة / تعديل / حذف)</span>
          </summary>
          <div className="px-5 py-4 border-t border-gray-100">
            <PaymentMethodsManager />
          </div>
        </details>

        {/* ─── ⚙️ إعدادات عامة ─── */}
        <details className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mt-6">
          <summary className="px-5 py-3 font-bold text-gray-700 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
            <span>⚙️</span> إعدادات عامة
          </summary>
          <div className="px-5 py-4 border-t border-gray-100">
            <AdminSettings />
          </div>
        </details>
      </main>
    </div>
  );
}

// ─── Payment Methods Manager ───
function PaymentMethodsManager() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "vodafone_cash", details: "", icon: "💳" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const ADMIN_TOKEN = "dawer-admin-2026";

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payment-methods", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const d = await res.json();
      setMethods(d.methods || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", type: "vodafone_cash", details: "", icon: "💳" });
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg("❌ الاسم مطلوب"); return; }
    setSaving(true);
    setMsg("");
    try {
      const url = "/api/admin/payment-methods";
      const method = editId ? "PUT" : "POST";
      const body = editId ? { adminToken: ADMIN_TOKEN, id: editId, ...form } : { adminToken: ADMIN_TOKEN, ...form };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.method) {
        setMsg(editId ? "✅ تم التعديل" : "✅ تمت الإضافة");
        resetForm();
        load();
      } else {
        setMsg("❌ " + (d.error || "فشل"));
      }
    } catch { setMsg("❌ خطأ"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("متأكد من الحذف؟")) return;
    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ adminToken: ADMIN_TOKEN, id }),
      });
      const d = await res.json();
      if (d.success) { load(); setMsg("✅ تم الحذف"); }
    } catch {}
  };

  const startEdit = (m: any) => {
    setForm({ name: m.name, type: m.type, details: m.details, icon: m.icon || "💳" });
    setEditId(m.id);
    setShowForm(true);
    setMsg("");
  };

  const toggleActive = async (m: any) => {
    try {
      await fetch("/api/admin/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ adminToken: ADMIN_TOKEN, id: m.id, is_active: m.is_active ? 0 : 1 }),
      });
      load();
    } catch {}
  };

  const types: Record<string, string> = {
    vodafone_cash: "📱 فودافون كاش",
    instapay: "💳 إنستا باي",
    bank_transfer: "🏦 تحويل بنكي",
    wallet: "📱 محفظة إلكترونية",
    other: "💳 أخرى",
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-lg p-3 text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg}
        </div>
      )}

      {/* قائمة طرق الدفع */}
      {loading ? (
        <div className="text-center py-4 text-gray-400">جاري التحميل...</div>
      ) : methods.length === 0 ? (
        <div className="text-center py-4 text-gray-400">لا توجد طرق دفع بعد</div>
      ) : (
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{m.icon || "💳"}</span>
                <div>
                  <p className={`font-medium ${m.is_active ? "text-gray-900" : "text-gray-400 line-through"}`}>
                    {m.name}
                  </p>
                  <p className="text-xs text-gray-400">{m.details}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleActive(m)}
                  className={`rounded-lg px-2 py-1 text-xs ${m.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {m.is_active ? "🟢" : "🔴"}
                </button>
                <button onClick={() => startEdit(m)}
                  className="rounded-lg bg-indigo-50 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100">
                  ✏️
                </button>
                <button onClick={() => handleDelete(m.id)}
                  className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-500 hover:bg-red-100">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* زر الإضافة */}
      {!showForm && (
        <button onClick={() => { resetForm(); setShowForm(true); setMsg(""); }}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition-all">
          ➕ إضافة طريقة دفع جديدة
        </button>
      )}

      {/* فورم الإضافة/التعديل */}
      {showForm && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">الاسم</label>
              <input type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: فودافون كاش"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-right"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">النوع</label>
              <select value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                {Object.entries(types).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">التفاصيل (رقم الحساب / الهاتف / ...)</label>
            <input type="text" value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              placeholder="مثال: 0100xxxxxxx (محمد)"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-right"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">الأيقونة</label>
            <input type="text" value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="💳"
              className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-center"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "جاري الحفظ..." : editId ? "💾 حفظ التعديلات" : "💾 إضافة"}
            </button>
            <button onClick={resetForm}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-300">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Settings ───
function AdminSettings() {
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const ADMIN_TOKEN = "dawer-admin-2026";

  useEffect(() => {
    fetch("/api/admin/settings", { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => { if (d.admin_whatsapp) setWhatsapp(d.admin_whatsapp); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ adminToken: ADMIN_TOKEN, admin_whatsapp: whatsapp }),
      });
      const d = await res.json();
      if (d.success) setMsg("✅ تم الحفظ");
      else setMsg("❌ " + (d.error || "فشل"));
    } catch { setMsg("❌ خطأ"); }
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-gray-400">جاري التحميل...</p>;

  return (
    <div className="space-y-3">
      {msg && (
        <div className={`rounded-lg p-3 text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg}
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">📱 رقم واتساب المشرف (لتواصل الزبائن عند الدفع)</label>
        <input type="tel" value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="مثال: 0100xxxxxxx"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-right"
        />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
        {saving ? "جاري الحفظ..." : "💾 حفظ الإعدادات"}
      </button>
    </div>
  );
}

// ─── Root Component ───
export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("dawer_admin") === "true") {
      setLoggedIn(true);
    }
  }, []);

  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  return <AdminPanel />;
}
