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

export default function ShopSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [shopName, setShopName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
