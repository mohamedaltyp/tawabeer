"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ShopSettings {
  shop_id: string;
  avg_service_minutes: number;
  is_open: number;
  greeting_message: string;
  whatsapp_enabled: number;
  whatsapp_number: string;
}

interface Counter {
  id: string;
  shop_id: string;
  name: string;
  current_number: number;
  is_active: number;
}

export default function ShopSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [shopName, setShopName] = useState("");
  const [counters, setCounters] = useState<Counter[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newCounterName, setNewCounterName] = useState("");

  useEffect(() => {
    fetch(`/api/shops/${id}/settings`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .catch(() => {});
    fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.shop) setShopName(d.shop.name);
      })
      .catch(() => {});
    fetch(`/api/shops/${id}/counters`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.counters) setCounters(d.counters);
      })
      .catch(() => {});
  }, [id]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/shops/${id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          avg_service_minutes: settings.avg_service_minutes,
          greeting_message: settings.greeting_message,
        }),
      });
      if (res.ok) {
        setMessage("✅ تم الحفظ بنجاح");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ حدث خطأ أثناء الحفظ");
      }
    } catch {
      setMessage("❌ حدث خطأ أثناء الحفظ");
    }
    setSaving(false);
  };

  const addCounter = async () => {
    const name = newCounterName.trim() || `شباك ${counters.length + 1}`;
    try {
      const res = await fetch(`/api/shops/${id}/counters`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.counter) {
          setCounters([...counters, data.counter]);
          setNewCounterName("");
          setMessage(`✅ تم إضافة ${name}`);
          setTimeout(() => setMessage(""), 3000);
        }
      }
    } catch {}
  };

  const removeCounter = async (counterId: string) => {
    try {
      const res = await fetch(`/api/shops/${id}/counters?counterId=${counterId}`, {
        method: "DELETE",
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.ok) {
        setCounters(counters.filter((c) => c.id !== counterId));
        setMessage("✅ تم حذف الشباك");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {}
  };

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/shop/${id}`}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
            >
              →
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">⚙️ الإعدادات</h1>
              <p className="text-xs text-gray-400">{shopName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Success/Error Message */}
        {message && (
          <div className={`rounded-xl p-4 text-center font-medium text-sm ${
            message.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            {message}
          </div>
        )}

        {/* Closed Mode */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>🔴</span>
              <span>حالة المحل</span>
            </h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  {settings.is_open === 0 ? "🔴 المحل مغلق حالياً" : "🟢 المحل مفتوح"}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">
                  عند إغلاق المحل، لا يمكن للعملاء حجز أدوار جديدة
                </p>
              </div>
              <button
                onClick={async () => {
                  const newVal = settings.is_open === 0 ? 1 : 0;
                  const res = await fetch(`/api/shops/${id}/settings`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ is_open: newVal }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.settings) setSettings(data.settings);
                    setMessage(newVal === 0 ? "🔴 تم إغلاق المحل" : "🟢 تم فتح المحل");
                    setTimeout(() => setMessage(""), 3000);
                  }
                }}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.is_open === 0 ? "bg-red-500" : "bg-green-500"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    settings.is_open === 0 ? "translate-x-0.5" : "translate-x-7"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Counters Section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>🪟</span>
              <span>الشبابيك</span>
            </h2>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {counters.length}
            </span>
          </div>
          <div className="p-5 space-y-3">
            {counters.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                لا توجد شبابيك — أضف شباكاً واحداً على الأقل
              </p>
            ) : (
              counters.map((counter, i) => (
                <div key={counter.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                      <span className="text-sm font-black text-indigo-600">{i + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{counter.name}</p>
                      <p className="text-xs text-gray-400">
                        آخر رقم: {counter.current_number || 0}
                      </p>
                    </div>
                  </div>
                  {counters.length > 1 && (
                    <button
                      onClick={() => removeCounter(counter.id)}
                      className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs text-red-500 hover:bg-red-100 transition-colors"
                      title="حذف"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}

            {/* Add Counter Form */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newCounterName}
                onChange={(e) => setNewCounterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCounter()}
                placeholder={`شباك ${counters.length + 1}`}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={addCounter}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all"
              >
                + إضافة
              </button>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>🔧</span>
              <span>الإعدادات العامة</span>
            </h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Avg Service Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⏱️ متوسط وقت الخدمة:{" "}
                <span className="font-bold text-indigo-600">{settings.avg_service_minutes} دقيقة</span>
              </label>
              <input
                type="range"
                min="1"
                max="60"
                value={settings.avg_service_minutes}
                onChange={(e) =>
                  setSettings({ ...settings, avg_service_minutes: Number(e.target.value) })
                }
                className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 د</span>
                <span>60 د</span>
              </div>
            </div>

            {/* Greeting Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💬 رسالة الترحيب
              </label>
              <textarea
                value={settings.greeting_message}
                onChange={(e) =>
                  setSettings({ ...settings, greeting_message: e.target.value })
                }
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="مرحباً بك!"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>💬</span>
              <span>إعدادات واتساب</span>
            </h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">إشعارات واتساب</span>
              <button
                onClick={async () => {
                  const newVal = settings.whatsapp_enabled === 1 ? 0 : 1;
                  const res = await fetch(`/api/shops/${id}/whatsapp-settings`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ whatsapp_enabled: newVal, whatsapp_number: settings.whatsapp_number }),
                  });
                  if (res.ok) setSettings({ ...settings, whatsapp_enabled: newVal });
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.whatsapp_enabled === 1 ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.whatsapp_enabled === 1 ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            {settings.whatsapp_enabled === 1 && (
              <input
                type="tel"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                onBlur={async () => {
                  await fetch(`/api/shops/${id}/whatsapp-settings`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ whatsapp_enabled: settings.whatsapp_enabled, whatsapp_number: settings.whatsapp_number }),
                  });
                }}
                placeholder="20100xxxxxxx"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200"
        >
          {saving ? "جاري الحفظ..." : "💾 حفظ الإعدادات"}
        </button>
      </main>
    </div>
  );
}
