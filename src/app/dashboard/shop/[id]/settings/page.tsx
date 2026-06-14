"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";

interface ShopSettings {
  shop_id: string;
  avg_service_minutes: number;
  is_open: number;
  greeting_message: string;
  whatsapp_enabled: number;
  whatsapp_number: string;
  whatsapp_access_token?: string;
  whatsapp_business_account_id?: string;
  booking_enabled: number;
  slot_duration_minutes: number;
  max_bookings_per_slot: number;
  booking_advance_days: number;
}

interface Counter {
  id: string;
  shop_id: string;
  name: string;
  current_number: number;
  is_active: number;
}

function getOwnerPassword(): string {
  try {
    return JSON.parse(sessionStorage.getItem("dawer_owner") || "{}").password || "";
  } catch {
    return "";
  }
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
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);

  useEffect(() => {
    fetch(`/api/shops/${id}/settings`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => { if (d.settings) setSettings(d.settings); })
      .catch(() => {});
    fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => { if (d.shop) setShopName(d.shop.name); })
      .catch(() => {});
    fetch(`/api/shops/${id}/counters`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => { if (d.counters) setCounters(d.counters); })
      .catch(() => {});
  }, [id]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    if (settings.greeting_message) {
      settings.greeting_message = settings.greeting_message.replace(/[<>"']/g, "").trim();
    }
    setMessage("");
    const pw = getOwnerPassword();
    try {
      const res = await fetch(`/api/shops/${id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          avg_service_minutes: settings.avg_service_minutes,
          greeting_message: settings.greeting_message,
          booking_enabled: settings.booking_enabled,
          slot_duration_minutes: settings.slot_duration_minutes,
          max_bookings_per_slot: settings.max_bookings_per_slot,
          booking_advance_days: settings.booking_advance_days,
          owner_password: pw,
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
    const pw = getOwnerPassword();
    try {
      const res = await fetch(`/api/shops/${id}/counters`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ name, owner_password: pw }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.counter) {
          setCounters([...counters, data.counter]);
          setNewCounterName("");
          setMessage("✅ تم إضافة " + name);
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

  const testWhatsappConnection = async () => {
    if (!settings?.whatsapp_number) {
      setMessage("❌ يجب إدخال رقم الواتساب أولاً");
      return;
    }
    setTestingWhatsapp(true);
    setMessage("");
    try {
      const res = await fetch(`/api/shops/${id}/whatsapp-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ action: "test", whatsapp_number: settings.whatsapp_number }),
      });
      if (res.ok) {
        setMessage("✅ تم الاتصال بالواتساب بنجاح!");
      } else {
        setMessage("❌ فشل الاتصال بالواتساب");
      }
    } catch {
      setMessage("❌ حدث خطأ أثناء الاختبار");
    }
    setTimeout(() => setMessage(""), 4000);
    setTestingWhatsapp(false);
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
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/shop/${id}`}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">→</Link>
            <div>
              <h1 className="text-base font-bold text-gray-900"><Icon name="gear" size={18} className="inline -mt-0.5" /> الإعدادات</h1>
              <p className="text-xs text-gray-400">{shopName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {message && (
          <div className={`rounded-xl p-4 text-center font-medium text-sm ${
            message.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>{message}</div>
        )}

        {/* shop status toggle */}
        <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-colors ${settings.is_open === 1 ? "border-green-100" : "border-red-100"}`}>
          <div className={`px-5 py-4 border-b border-gray-100 ${settings.is_open === 1 ? "bg-green-50" : "bg-red-50"}`}>
            <h2 className="font-bold flex items-center gap-2"><span className="text-xl">{settings.is_open === 1 ? "🟢" : "🔴"}</span><span className={settings.is_open === 1 ? "text-green-900" : "text-red-900"}>حالة المنشأة</span></h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-sm font-bold ${settings.is_open === 1 ? "text-green-700" : "text-red-700"}`}>
                  {settings.is_open === 1 ? "✅ المنشأة مفتوح الآن" : "❌ المنشأة مغلقة حالياً"}
                </span>
                <p className="text-xs text-gray-500 mt-1">عند الإغلاق، لن يتمكن العملاء من حجز أدوار جديدة</p>
              </div>
              <button onClick={async () => {
                  const newVal = settings.is_open === 0 ? 1 : 0;
                  const pw = getOwnerPassword();
                  const res = await fetch(`/api/shops/${id}/settings`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ is_open: newVal, owner_password: pw }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.settings) setSettings(data.settings);
                    setMessage(newVal === 0 ? "🔴 تم إغلاق المنشأة" : "🟢 تم فتح المنشأة");
                    setTimeout(() => setMessage(""), 3000);
                  }
                }}
                className={`relative w-16 h-8 rounded-full transition-all ${settings.is_open === 0 ? "bg-red-500" : "bg-green-500"} shadow-lg`}>
                <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${settings.is_open === 0 ? "translate-x-1" : "translate-x-8"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Advance Booking Toggle */}
        <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-colors ${settings.booking_enabled === 1 ? "border-indigo-100" : "border-gray-100"}`}>
          <div className={`px-5 py-4 border-b border-gray-100 ${settings.booking_enabled === 1 ? "bg-indigo-50" : "bg-gray-50"}`}>
            <h2 className="font-bold flex items-center gap-2">
              <span className="text-xl">📅</span>
              <span className={settings.booking_enabled === 1 ? "text-indigo-900" : "text-gray-900"}>الحجز المسبق</span>
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-sm font-bold ${settings.booking_enabled === 1 ? "text-indigo-700" : "text-gray-600"}`}>
                  {settings.booking_enabled === 1 ? "✅ الحجز المسبق مفعّل" : "❌ الحجز المسبق معطّل"}
                </span>
                <p className="text-xs text-gray-500 mt-1">السماح للعملاء بحجز مواعيد مسبقة من الموقع</p>
              </div>
              <button onClick={async () => {
                  const newVal = settings.booking_enabled === 0 ? 1 : 0;
                  const pw = getOwnerPassword();
                  const res = await fetch(`/api/shops/${id}/settings`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ booking_enabled: newVal, owner_password: pw }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.settings) setSettings(data.settings);
                    setMessage(newVal === 1 ? "✅ تم تفعيل الحجز المسبق" : "❌ تم تعطيل الحجز المسبق");
                    setTimeout(() => setMessage(""), 3000);
                  }
                }}
                className={`relative w-16 h-8 rounded-full transition-all ${settings.booking_enabled === 0 ? "bg-gray-300" : "bg-indigo-500"} shadow-lg`}>
                <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${settings.booking_enabled === 0 ? "translate-x-1" : "translate-x-8"}`} />
              </button>
            </div>

            {settings.booking_enabled === 1 && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                {/* Slot Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⏱️ مدة كل موعد: <span className="font-bold text-indigo-600">{settings.slot_duration_minutes} دقيقة</span>
                  </label>
                  <input type="range" min="15" max="120" step="5" value={settings.slot_duration_minutes}
                    onChange={(e) => setSettings({ ...settings, slot_duration_minutes: Number(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>15 د</span><span>120 د</span></div>
                </div>

                {/* Max Bookings per Slot */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👥 أقصى حجوزات لكل موعد: <span className="font-bold text-indigo-600">{settings.max_bookings_per_slot}</span>
                  </label>
                  <input type="range" min="1" max="20" value={settings.max_bookings_per_slot}
                    onChange={(e) => setSettings({ ...settings, max_bookings_per_slot: Number(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>20</span></div>
                </div>

                {/* Advance Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📆 الحجز المسبق: <span className="font-bold text-indigo-600">{settings.booking_advance_days} يوم</span>
                  </label>
                  <input type="range" min="1" max="30" value={settings.booking_advance_days}
                    onChange={(e) => setSettings({ ...settings, booking_advance_days: Number(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>يوم</span><span>30 يوم</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Counters */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Icon name="window" size={18} /><span>الشبابيك (العدادات)</span></h2>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">{counters.length} شباك</span>
          </div>
          <div className="p-5 space-y-3">
            {counters.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-xl">
                <Icon name="pin" size={13} className="inline -mt-0.5" /> لا توجد شبابيك — أضف شباكاً واحداً على الأقل لتوزيع العملاء
              </p>
            ) : (
              counters.map((counter, i) => (
                <div key={counter.id} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                      <span className="text-base font-bold text-white">{i + 1}</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{counter.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5"><Icon name="chart" size={13} className="inline -mt-0.5" /> آخر رقم: <span className="font-bold text-indigo-600">{counter.current_number || 0}</span></p>
                    </div>
                  </div>
                  {counters.length > 1 && (
                    <button onClick={() => removeCounter(counter.id)}
                      className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm text-red-600 hover:bg-red-200 transition-colors font-bold ms-3"
                      title="حذف الشباك"><Icon name="x" size={16} /></button>
                  )}
                </div>
              ))
            )}
            <div className="flex gap-2 pt-2">
              <input type="text" value={newCounterName} onChange={(e) => setNewCounterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCounter()}
                placeholder={`شباك ${counters.length + 1}`}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <button onClick={addCounter}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all">+ إضافة</button>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Icon name="gear" size={18} /><span>الإعدادات العامة</span></h2>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⏱️ متوسط وقت الخدمة: <span className="font-bold text-indigo-600">{settings.avg_service_minutes} دقيقة</span>
              </label>
              <input type="range" min="1" max="60" value={settings.avg_service_minutes}
                onChange={(e) => setSettings({ ...settings, avg_service_minutes: Number(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 د</span><span>60 د</span></div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2"><Icon name="message" size={14} className="inline -mt-0.5" /> رسالة الترحيب</label>
              <p className="text-xs text-gray-500 mb-2">المتغيرات المتاحة: {`{customer_name} {queue_number} {wait_time}`}</p>
              <textarea value={settings.greeting_message}
                onChange={(e) => setSettings({ ...settings, greeting_message: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="مرحباً {customer_name} ، رقمك هو {queue_number}" />
              <div className="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <p className="text-xs font-medium text-indigo-900">معاينة:</p>
                <p className="text-sm text-indigo-700 mt-1">{settings.greeting_message || "مرحباً بك!"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Icon name="message" size={18} /><span>إعدادات واتساب</span></h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">إشعارات واتساب</span>
                <p className="text-xs text-gray-400 mt-0.5">فعّل عشان الزبائن يتواصلوا معاك عبر واتساب</p>
              </div>
              <button onClick={async () => {
                  const newVal = settings.whatsapp_enabled === 1 ? 0 : 1;
                  const res = await fetch(`/api/shops/${id}/whatsapp-settings`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ whatsapp_enabled: newVal, whatsapp_number: settings.whatsapp_number }),
                  });
                  if (res.ok) setSettings({ ...settings, whatsapp_enabled: newVal });
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.whatsapp_enabled === 1 ? "bg-green-500" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.whatsapp_enabled === 1 ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>

            {settings.whatsapp_enabled === 1 && (
              <>
                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1"><Icon name="smartphone" size={13} className="inline -mt-0.5" /> رقم الواتساب</label>
                  <div className="flex gap-2">
                    <input type="tel" value={settings.whatsapp_number}
                      onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                      onBlur={async () => {
                        await fetch(`/api/shops/${id}/whatsapp-settings`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                          body: JSON.stringify({ whatsapp_enabled: settings.whatsapp_enabled, whatsapp_number: settings.whatsapp_number }),
                        });
                      }}
                      placeholder="01012345678"
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    <button onClick={testWhatsappConnection} disabled={testingWhatsapp || !settings.whatsapp_number}
                      className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-all whitespace-nowrap">
                      {testingWhatsapp ? "⏳..." : "اختبار"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">ادخل الرقم من غير كود الدولة — هيتضاف تلقائياً</p>
                </div>

                {/* Access Token (for Cloud API) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1"><Icon name="key" size={13} className="inline -mt-0.5" /> توكن الواتساب (اختياري — للـ Cloud API)</label>
                  <input type="password" value={settings.whatsapp_access_token || ""}
                    onChange={(e) => setSettings({ ...settings, whatsapp_access_token: e.target.value })}
                    onBlur={async () => {
                      if (settings.whatsapp_access_token && !settings.whatsapp_access_token.startsWith("•••")) {
                        await fetch(`/api/shops/${id}/whatsapp-settings`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                          body: JSON.stringify({ whatsapp_access_token: settings.whatsapp_access_token }),
                        });
                      }
                    }}
                    placeholder="EAAxxxxxxxxxxxxxxx"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono" />
                  <p className="text-xs text-gray-400 mt-1">من Meta Business Suite — مطلوب لإشعارات واتساب التلقائية</p>
                </div>

                {/* Phone Number ID (for Cloud API) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1"><Icon name="phone" size={13} className="inline -mt-0.5" /> Phone Number ID (اختياري — للـ Cloud API)</label>
                  <input type="text" value={settings.whatsapp_business_account_id || ""}
                    onChange={(e) => setSettings({ ...settings, whatsapp_business_account_id: e.target.value })}
                    onBlur={async () => {
                      if (settings.whatsapp_business_account_id) {
                        await fetch(`/api/shops/${id}/whatsapp-settings`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                          body: JSON.stringify({ whatsapp_business_account_id: settings.whatsapp_business_account_id }),
                        });
                      }
                    }}
                    placeholder="1234567890"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono" />
                  <p className="text-xs text-gray-400 mt-1">من Meta App → WhatsApp → API Configuration</p>
                </div>
              </>
            )}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200">
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </main>
    </div>
  );
}