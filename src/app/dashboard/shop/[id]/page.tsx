"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, categoryIcon } from "@/components/Icon";

function parseDBDate(dateStr: string): Date {
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
  counter_id?: string;
  created_at: string;
}

interface Counter {
  id: string;
  name: string;
  current_number: number;
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

export default function ShopDashboard() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [calling, setCalling] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notification, setNotification] = useState<{ number: number; name: string; type?: string } | null>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [avgServiceMinutes, setAvgServiceMinutes] = useState(10);
  const [savingWaitTime, setSavingWaitTime] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<string>("");
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setShop(d.shop);
        setQueue(d.allQueue || []);
      });
  }, [id]);

  useEffect(() => {
    fetch(`/api/shops/${id}/whatsapp-settings`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        setWhatsappEnabled(d.whatsapp_enabled === 1);
        setWhatsappNumber(d.whatsapp_number || "");
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetch(`/api/shops/${id}/settings`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setAvgServiceMinutes(d.settings.avg_service_minutes || 10);
          setIsOpen(d.settings.is_open !== 0);
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetch(`/api/shops/${id}/counters`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.counters && d.counters.length > 0) {
          setCounters(d.counters);
          if (!selectedCounter) setSelectedCounter(d.counters[0].id);
        }
      })
      .catch(() => {});
  }, [id]);

  // Polling every 3 seconds
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

  const playNotificationSound = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        osc.type = "sine";
        gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };

      playTone(523, 0, 0.15);
      playTone(659, 0.15, 0.15);
      playTone(784, 0.3, 0.2);
      playTone(1047, 0.5, 0.4);
    } catch {}
  };

  const handleCallNext = async (counterId?: string) => {
    setCalling(true);
    try {
      const res = await fetch(`/api/shops/${id}/queue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ action: "call-next", counterId }),
      });
      const data = await res.json();
      if (data.entry) {
        setQueue((prev) =>
          prev.map((e) => (e.id === data.entry.id ? { ...e, status: "called" } : e))
        );
        setShop((prev) => prev ? { ...prev, current_number: data.entry.number } : prev);
        setNotification({ number: data.entry.number, name: data.entry.customer_name, type: "call" });
        if (soundEnabled) playNotificationSound();
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
        setNotification({ number: data.entry.number, name: data.entry.customer_name, type: "recall" });
        if (soundEnabled) playNotificationSound();
        setTimeout(() => setNotification(null), 5000);
        setQueue((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, status: "called", recall_count: data.entry.recall_count } : e))
        );
      } else if (data.entry) {
        setQueue((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, status: action === "complete" ? "completed" : "cancelled" } : e))
        );
      } else if (data.error) {
        setNotification({ number: 0, name: data.error, type: "error" });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch {
      setNotification({ number: 0, name: "حدث خطأ", type: "error" });
      setTimeout(() => setNotification(null), 3000);
    }
    setActionLoading(null);
  };

  const waiting = counters.length > 1
    ? queue.filter((e) => e.status === "waiting" && (e.counter_id === selectedCounter || e.counter_id === "")).sort((a, b) => a.number - b.number)
    : queue.filter((e) => e.status === "waiting").sort((a, b) => a.number - b.number);
  const called = counters.length > 1
    ? queue.filter((e) => e.status === "called" && e.counter_id === selectedCounter).sort((a, b) => a.number - b.number)
    : queue.filter((e) => e.status === "called").sort((a, b) => a.number - b.number);
  const currentlyServing = counters.length > 1
    ? called[0] || null
    : null;
  const completed = queue.filter((e) => e.status === "completed" || e.status === "cancelled").reverse().slice(0, 10);
  const todayTotal = queue.filter((e) => {
    const d = parseDBDate(e.created_at);
    return d.toDateString() === new Date().toDateString();
  }).length;

  if (!shop) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #6C3CE1 100%)" }}>
        <div className="text-center">
          <div className="relative mx-auto mb-4" style={{ width: 60, height: 60 }}>
            <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin"></div>
          </div>
          <p className="text-white/70 text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Notification Banner */}
      {notification && (
        <div className="fixed inset-x-0 top-0 z-50 animate-slide-down">
          <div className={`mx-auto max-w-md mx-4 mt-4 rounded-2xl p-5 text-white text-center shadow-2xl ${
            notification.type === "error"
              ? "bg-gradient-to-r from-red-500 to-rose-500"
              : notification.type === "recall"
              ? "bg-gradient-to-r from-amber-500 to-orange-500"
              : "bg-gradient-to-r from-green-500 to-emerald-500"
          }`}>
            {notification.type === "call" && <p className="text-sm opacity-80 mb-1"><Icon name="bell" size={13} className="inline -mt-0.5" /> تمت المناداة</p>}
            {notification.type === "recall" && <p className="text-sm opacity-80 mb-1"><Icon name="bell" size={13} className="inline -mt-0.5" /> إعادة نداء</p>}
            {notification.type === "error" && <p className="text-sm opacity-80 mb-1"><Icon name="warning" size={13} className="inline -mt-0.5" /> خطأ</p>}
            {notification.number > 0 && (
              <p className="text-4xl font-black">{notification.number}</p>
            )}
            {notification.name && <p className="text-lg mt-1">{notification.name}</p>}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
              <Icon name="arrowLeft" size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300"><Icon name={categoryIcon(shop.category)} size={22} /></span>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">{shop.name}</h1>
                <p className="text-[10px] text-gray-400">إدارة الطابور</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-colors ${
                soundEnabled ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400"
              }`}
              title={soundEnabled ? "إيقاف الصوت" : "تشغيل الصوت"}
            >
              <Icon name={soundEnabled ? "bell" : "bellOff"} size={16} />
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              title="QR Code"
            >
              <Icon name="smartphone" size={16} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-colors ${
                showSettings ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title="الإعدادات"
            >
              <Icon name="gear" size={16} />
            </button>
            <Link
              href={`/dashboard/shop/${id}/stats`}
              className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              title="الإحصائيات"
            >
              <Icon name="chart" size={16} />
            </Link>
            <Link
              href={`/dashboard/shop/${id}/bookings`}
              className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              title="الحجوزات"
            >
              <Icon name="calendar" size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Closed Banner */}
      {!isOpen && (
        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-center py-3 px-4">
          <p className="font-bold text-sm flex items-center justify-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />
            <span>المحل مغلق — العملاء لا يستطيعون حجز أدوار جديدة</span>
          </p>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="card p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">في الانتظار</p>
            <p className="text-2xl font-black text-indigo-600">{waiting.length}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">الدور الحالي</p>
            <p className="text-2xl font-black text-gray-900">{shop.current_number || 0}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">تمت مناداتهم</p>
            <p className="text-2xl font-black text-amber-600">{called.length}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">إجمالي اليوم</p>
            <p className="text-2xl font-black text-emerald-600">{todayTotal}</p>
          </div>
        </div>

        {/* Counter Tabs */}
        {counters.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {counters.map((counter) => (
              <button
                key={counter.id}
                onClick={() => setSelectedCounter(counter.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  selectedCounter === counter.id
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
                }`}
              >
                <Icon name="window" size={14} className="inline -mt-0.5" /> {counter.name}
              </button>
            ))}
            <Link
              href={`/dashboard/shop/${id}/settings`}
              className="px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-500 hover:bg-gray-200 whitespace-nowrap"
            >
              + إدارة الشبابيك
            </Link>
          </div>
        )}
        {counters.length === 1 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold text-gray-500"><Icon name="window" size={14} className="inline -mt-0.5" /> {counters[0]?.name || "شباك 1"}</span>
          </div>
        )}

        {/* Call Next Button — Big & Beautiful */}
        <button
          onClick={() => handleCallNext(selectedCounter || undefined)}
          disabled={calling || waiting.length === 0}
          className={`w-full rounded-2xl py-6 text-xl font-black text-white transition-all mb-6 relative overflow-hidden ${
            waiting.length > 0
              ? "bg-gradient-to-r from-cyan-500 via-violet-600 to-cyan-500 bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 active:scale-[0.98]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          style={waiting.length > 0 ? { animation: "gradientShift 3s ease infinite" } : {}}
        >
          {calling ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>جاري المناداة...</span>
            </span>
          ) : waiting.length > 0 ? (
            <span className="flex items-center justify-center gap-3">
              <span className="text-2xl"><Icon name="bell" size={16} /></span>
              <span>نادِ التالي — رقم {waiting[0].number}</span>
              {waiting[0].customer_name && (
                <span className="text-sm font-medium opacity-80">({waiting[0].customer_name})</span>
              )}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Icon name="checkCircle" size={16} />
              <span>لا يوجد انتظار</span>
            </span>
          )}
        </button>

        {/* Settings Panel */}
        {showSettings && (
          <div className="card p-5 mb-6 animate-slide-down">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span><Icon name="gear" size={16} /></span>
              <span>الإعدادات السريعة</span>
            </h3>

            {/* Avg Service Time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="clock" size={14} className="inline -mt-0.5" /> متوسط وقت الخدمة: <span className="font-bold text-indigo-600">{avgServiceMinutes} دقيقة</span>
              </label>
              <input
                type="range"
                min="1"
                max="60"
                value={avgServiceMinutes}
                onChange={(e) => setAvgServiceMinutes(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 د</span>
                <span>60 د</span>
              </div>
              <button
                onClick={async () => {
                  setSavingWaitTime(true);
                  try {
                    await fetch(`/api/shops/${id}/settings`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                      body: JSON.stringify({ avg_service_minutes: avgServiceMinutes }),
                    });
                    setNotification({ number: 0, name: "تم حفظ وقت الانتظار", type: "call" });
                    setTimeout(() => setNotification(null), 3000);
                  } catch {}
                  setSavingWaitTime(false);
                }}
                disabled={savingWaitTime}
                className="mt-2 w-full rounded-xl bg-indigo-600 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {savingWaitTime ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>

            {/* WhatsApp */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700"><Icon name="message" size={16} /> إشعارات واتساب</span>
                <button
                  onClick={async () => {
                    const newVal = !whatsappEnabled;
                    const res = await fetch(`/api/shops/${id}/whatsapp-settings`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                      body: JSON.stringify({ whatsapp_enabled: newVal, whatsapp_number: whatsappNumber }),
                    });
                    if (res.ok) setWhatsappEnabled(newVal);
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${whatsappEnabled ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${whatsappEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
              {whatsappEnabled && (
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
                  className="input-field text-sm"
                />
              )}
            </div>
          </div>
        )}

        {/* Waiting Queue */}
        {waiting.length > 0 && (
          <div className="card overflow-hidden mb-6">
            <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex items-center justify-between">
              <h2 className="font-bold text-indigo-700 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>قائمة الانتظار</span>
              </h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">{waiting.length}</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {waiting.map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                      <span className="text-sm font-black text-indigo-600">{entry.number}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{entry.customer_name || "بدون اسم"}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span><Icon name="clock" size={14} className="inline -mt-0.5" /> {timeSince(entry.created_at)}</span>
                        {entry.customer_phone && <span><Icon name="smartphone" size={16} /> {entry.customer_phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAction(entry.id, "complete")}
                      disabled={actionLoading === entry.id}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 transition-colors"
                    >
                      <Icon name="checkCircle" size={14} className="inline -mt-0.5" /> تم
                    </button>
                    <button
                      onClick={() => handleAction(entry.id, "cancel")}
                      disabled={actionLoading === entry.id}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Icon name="x" size={14} className="inline -mt-0.5" /> إلغاء
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Called Customers */}
        {called.length > 0 && (
          <div className="card overflow-hidden mb-6">
            <div className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex items-center justify-between">
              <h2 className="font-bold text-amber-700 flex items-center gap-2">
                <span><Icon name="bell" size={16} /></span>
                <span>تمت مناداتهم</span>
              </h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{called.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {called.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                      <span className="text-sm font-black text-amber-600">{entry.number}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{entry.customer_name || "بدون اسم"}</p>
                      <div className="flex items-center gap-2">
                        {(entry.recall_count ?? 0) > 0 && (
                          <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                            <Icon name="bell" size={16} /> {(entry.recall_count ?? 0)}× إعادة نداء
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAction(entry.id, "call-again")}
                      disabled={actionLoading === entry.id}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        actionLoading === entry.id
                          ? "bg-gray-200 text-gray-400 cursor-wait"
                          : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                      }`}
                    >
                      {actionLoading === entry.id ? "..." : "نادِ مرة أخرى"}
                    </button>
                    <button
                      onClick={() => handleAction(entry.id, "complete")}
                      disabled={actionLoading === entry.id}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 transition-colors"
                    >
                      <Icon name="checkCircle" size={14} className="inline -mt-0.5" /> تم
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent History */}
        {completed.length > 0 && (
          <div className="card overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                <span><Icon name="copy" size={16} /></span>
                <span>آخر المنتهين</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {completed.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-400">#{entry.number}</span>
                    <p className="text-sm text-gray-600">{entry.customer_name || "بدون اسم"}</p>
                  </div>
                  <span className={`text-xs font-medium ${entry.status === "completed" ? "text-emerald-500" : "text-red-400"}`}>
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
            <div className="mb-6 flex justify-center text-cyan-300 animate-float"><Icon name="users" size={64} /></div>
            <p className="text-xl font-bold text-gray-900 mb-2">لا يوجد زبائن حتى الآن</p>
            <p className="text-sm text-gray-400 mb-6">شارك QR كود محلك ليبدأ الزبائن في الحجز</p>
            <button
              onClick={() => setShowQR(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <span><Icon name="smartphone" size={16} /></span>
              <span>عرض QR Code</span>
            </button>
          </div>
        )}
      </main>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowQR(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scale-in text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900"><Icon name="smartphone" size={16} /> QR Code المحل</h3>
              <button onClick={() => setShowQR(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"><Icon name="x" size={18} /></button>
            </div>
            <p className="text-sm text-gray-400 mb-4">شارك هذا الكود مع عملائك لحجز الأدوار</p>
            <div className="inline-block rounded-2xl bg-white border-2 border-gray-100 p-4 mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`https://tawabeer-mu.vercel.app/shop/${id}`)}`}
                alt="Shop QR Code"
                className="w-52 h-52"
              />
            </div>
            <p className="text-xs text-gray-400 mb-4">{shop.name}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://tawabeer-mu.vercel.app/shop/${id}`);
                  setNotification({ number: 0, name: "تم نسخ الرابط", type: "call" });
                  setTimeout(() => setNotification(null), 2000);
                }}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-all"
              >
                <Icon name="copy" size={16} /> نسخ الرابط
              </button>
              <button
                onClick={() => setShowQR(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
