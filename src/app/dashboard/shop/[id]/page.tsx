"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// دالة مساعدة — تحويل التاريخ من UTC (SQLite) للوقت المحلي صح
function parseDBDate(dateStr: string): Date {
  // SQLite بيخزن datetime('now') بصيغة UTC بدون Z
  // نضيف Z عشان JavaScript يقراه كـ UTC مش local
  if (dateStr && !dateStr.endsWith("Z")) return new Date(dateStr + "Z");
  return new Date(dateStr);
}

function timeSince(dateStr: string): string {
  const diff = Math.floor((Date.now() - parseDBDate(dateStr).getTime()) / 60000);
  if (diff < 1) return "لحظات";
  if (diff < 60) return `${diff} دقيقة`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours < 24) return `${hours} ساعة${mins > 0 ? ` و${mins} دقيقة` : ""}`;
  return `${Math.floor(hours / 24)} يوم`;
}

interface Shop {
  id: string;
  name: string;
  description: string;
  current_number: number;
  category: string;
}

interface QueueEntry {
  id: string;
  number: number;
  customer_name: string;
  customer_phone: string;
  status: string;
  estimated_wait: number;
  recall_count?: number;
  created_at: string;
}

interface QueueStats {
  waiting: number;
  today_total: number;
  avg_wait_minutes: number;
  peak_hours: { hour: string; count: number }[];
}

export default function ShopDashboard() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [calling, setCalling] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notification, setNotification] = useState<{ number: number; name: string } | null>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [avgServiceMinutes, setAvgServiceMinutes] = useState(10);
  const [savingWaitTime, setSavingWaitTime] = useState(false);

  // Load shop data
  useEffect(() => {
    fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setShop(d.shop);
        setQueue(d.allQueue || []);
      });
  }, [id]);

  // Load WhatsApp settings
  useEffect(() => {
    fetch(`/api/shops/${id}/whatsapp-settings`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        setWhatsappEnabled(d.whatsapp_enabled === 1);
        setWhatsappNumber(d.whatsapp_number || "");
      })
      .catch(() => {});
  }, [id]);

  // Load queue settings (avg service time)
  useEffect(() => {
    fetch(`/api/shops/${id}/settings`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setAvgServiceMinutes(d.settings.avg_service_minutes || 10);
      })
      .catch(() => {});
  }, [id]);

  // ⏱️ تحديث مباشر عن طريق Polling — كل 3 ثوان
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/shops/${id}?t=${Date.now()}`, {
          headers: {
            "ngrok-skip-browser-warning": "true",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
        });
        const d = await res.json();
        if (d.allQueue) setQueue(d.allQueue);
        if (d.shop) setShop(d.shop);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCallNext = async () => {
    setCalling(true);
    try {
      const res = await fetch(`/api/shops/${id}/queue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ action: "call-next" }),
      });
      const data = await res.json();
      if (data.entry) {
        // تحديث محلي فوري — مش نستنى SSE (عشان التونل أحياناً بيقطع SSE)
        setQueue((prev) =>
          prev.map((e) => (e.id === data.entry.id ? { ...e, status: "called" } : e))
        );
        setShop((prev) => prev ? { ...prev, current_number: data.entry.number } : prev);
        setNotification({ number: data.entry.number, name: data.entry.customer_name });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch {}
    setCalling(false);
  };

  const handleAction = async (entryId: string, action: string) => {
    setActionLoading(entryId);
    try {
      const res = await fetch(`/api/shops/${id}/queue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ action, entryId }),
      });
      const data = await res.json();
      if (data.entry && action === "call-again") {
        // نعرض الإشعار فوراً مش نستنى SSE
        setNotification({ number: data.entry.number, name: data.entry.customer_name });
        setTimeout(() => setNotification(null), 5000);
        playNotificationSound();
        // تحديث recall_count محلياً فوراً
        setQueue((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, status: "called", recall_count: data.entry.recall_count } : e))
        );
      } else if (data.error) {
        setNotification({ number: 0, name: data.error });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch {
      setNotification({ number: 0, name: "❌ حدث خطأ" });
      setTimeout(() => setNotification(null), 3000);
    }
    setActionLoading(null);
  };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playNotificationSound = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } catch {}
  };

  const waiting = queue.filter((e) => e.status === "waiting").sort((a, b) => a.number - b.number);
  const called = queue.filter((e) => e.status === "called").sort((a, b) => a.number - b.number);
  const completed = queue.filter((e) => e.status === "completed" || e.status === "cancelled").reverse().slice(0, 10);

  if (!shop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">&larr;</Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{shop.name}</h1>
              <p className="text-xs text-gray-400">إدارة الطابور</p>
              <button
                onClick={() => { navigator.clipboard.writeText(id); }}
                className="text-[10px] text-gray-300 hover:text-indigo-500 transition-colors flex items-center gap-1 mt-0.5"
                title="نسخ رقم المحل"
              >
                🆔 <code dir="ltr" className="font-mono">{id.substring(0, 8)}...</code> 📋 نسخ
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-lg px-3 py-1.5 text-sm ${soundEnabled ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400"}`}
            >
              🔔 {soundEnabled ? "صوت مفعل" : "صوت متوقف"}
            </button>
            <button
              onClick={() => router.push(`/dashboard/shop/${id}/qr`)}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
            >
              📱 QR
            </button>
          </div>
        </div>
      </header>

      {/* Notification Banner */}
      {notification && (
        <div className="fixed inset-x-0 top-16 z-50 mx-auto max-w-md px-4 animate-slide-up">
          <div className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 p-5 text-white text-center shadow-2xl">
            <p className="text-sm opacity-80">تمت المناداة</p>
            <p className="text-3xl font-black mt-1">رقم {notification.number}</p>
            {notification.name && <p className="text-lg mt-1">{notification.name}</p>}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl bg-white border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400">في الانتظار</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{waiting.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400">الرقم الحالي</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{shop.current_number || 0}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400">تم اليوم</p>
            <p className="text-2xl font-black text-amber-500 mt-1">{completed.length + called.length}</p>
          </div>
        </div>

        {/* Call Next Button */}
        <button
          onClick={handleCallNext}
          disabled={calling || waiting.length === 0}
          className={`w-full rounded-2xl py-5 text-xl font-bold text-white transition-all shadow-lg mb-6 ${
            waiting.length > 0
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200 hover:shadow-xl"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {calling ? "جاري..." : waiting.length > 0 ? `🔔 نادِ التالي (${waiting[0].number})` : "🟢 لا يوجد انتظار"}
        </button>

        {/* WhatsApp Settings — متاحة للباقات المدفوعة */}
        <details className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-6">
          <summary className="px-5 py-3 font-bold text-gray-700 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
            <span>💬</span> إشعارات واتساب {whatsappEnabled ? "✅" : ""}
          </summary>
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <p className="text-xs text-gray-400">
              لما العميل يجي دوره، توصله رسالة واتساب تلقائياً. (متاح للباقات المدفوعة)
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">تفعيل الإشعارات</span>
              <button
                onClick={async () => {
                  const newVal = !whatsappEnabled;
                  const res = await fetch(`/api/shops/${id}/whatsapp-settings`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ whatsapp_enabled: newVal, whatsapp_number: whatsappNumber }),
                  });
                  if (res.ok) setWhatsappEnabled(newVal);
                  else {
                    const err = await res.json();
                    alert(err.error || "حدث خطأ");
                  }
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${whatsappEnabled ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${whatsappEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">رقم واتساب المحل (لإرسال التنبيهات)</label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                onBlur={async () => {
                  await fetch(`/api/shops/${id}/whatsapp-settings`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ whatsapp_enabled: whatsappEnabled, whatsapp_number: whatsappNumber }),
                  });
                }}
                placeholder="20100xxxxxxx"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-right focus:border-indigo-300 focus:outline-none"
              />
            </div>
            {!whatsappEnabled && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                ⚡ إشعارات واتساب من أفضل المميزات اللي تخلي المحل يشتري الباقة!
              </div>
            )}
          </div>
        </details>

        {/* ⏱️ إعدادات وقت الانتظار */}
        <details className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-6">
          <summary className="px-5 py-3 font-bold text-gray-700 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
            <span>⏱️</span> وقت الانتظار التقديري
          </summary>
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <p className="text-xs text-gray-400">
              حدد متوسط وقت الخدمة لكل زبون بالدقائق — على أساسه بيتم حساب وقت الانتظار التقديري للزبائن.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="60"
                value={avgServiceMinutes}
                onChange={(e) => setAvgServiceMinutes(Number(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer"
              />
              <div className="flex items-center gap-2 min-w-[100px]">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={avgServiceMinutes}
                  onChange={(e) => setAvgServiceMinutes(Math.max(1, Math.min(60, Number(e.target.value))))}
                  className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm font-bold text-gray-900 focus:border-indigo-300 focus:outline-none"
                />
                <span className="text-sm text-gray-500">دقيقة</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>1 د</span>
              <span>حالياً: كل زبون ≈ {avgServiceMinutes} دقيقة</span>
              <span>60 د</span>
            </div>
            <button
              onClick={async () => {
                setSavingWaitTime(true);
                try {
                  const res = await fetch(`/api/shops/${id}/settings`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ avg_service_minutes: avgServiceMinutes }),
                  });
                  if (res.ok) {
                    setNotification({ number: 0, name: "✅ تم حفظ وقت الانتظار الجديد" });
                    setTimeout(() => setNotification(null), 3000);
                  }
                } catch {}
                setSavingWaitTime(false);
              }}
              disabled={savingWaitTime}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {savingWaitTime ? "جاري الحفظ..." : "💾 حفظ وقت الانتظار"}
            </button>
          </div>
        </details>

        {/* Waiting Queue */}
        {waiting.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100">
              <h2 className="font-bold text-indigo-700">قائمة الانتظار ({waiting.length})</h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {waiting.map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
                      {entry.number}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{entry.customer_name || "بدون اسم"}</p>
                      <p className="text-xs text-gray-400">{timeSince(entry.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAction(entry.id, "complete")}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100"
                    >
                      تم
                    </button>
                    <button
                      onClick={() => handleAction(entry.id, "cancel")}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Called Customers */}
        {called.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="bg-amber-50 px-5 py-3 border-b border-amber-100">
              <h2 className="font-bold text-amber-700">تمت مناداتهم ({called.length})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {called.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-600">
                      {entry.number}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{entry.customer_name || "بدون اسم"}</p>
                      {(entry.recall_count ?? 0) > 0 && (
                        <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                          🔔 {(entry.recall_count ?? 0)}× نداء
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAction(entry.id, "call-again")}
                      disabled={actionLoading === entry.id}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        actionLoading === entry.id
                          ? "bg-gray-200 text-gray-400 cursor-wait"
                          : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                      }`}>
                      {actionLoading === entry.id ? "..." : "نادِ مرة أخرى"}
                    </button>
                    <button
                      onClick={() => handleAction(entry.id, "complete")}
                      disabled={actionLoading === entry.id}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100"
                    >
                      تم
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent History */}
        {completed.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-700 text-sm">آخر المنتهين</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {completed.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">#{entry.number}</span>
                    <p className="text-sm text-gray-600">{entry.customer_name || "بدون اسم"}</p>
                  </div>
                  <span className={`text-xs ${entry.status === "completed" ? "text-emerald-500" : "text-red-400"}`}>
                    {entry.status === "completed" ? "مكتمل" : "ملغي"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {waiting.length === 0 && called.length === 0 && completed.length === 0 && (
          <div className="text-center py-16">
            <span className="text-6xl block mb-4">🛋️</span>
            <p className="text-lg font-medium text-gray-900">لا يوجد زبائن حتى الآن</p>
            <p className="text-sm text-gray-400 mt-1">شارك QR كود محلك ليبدأ الزبائن في الحجز</p>
          </div>
        )}
      </main>
    </div>
  );
}
