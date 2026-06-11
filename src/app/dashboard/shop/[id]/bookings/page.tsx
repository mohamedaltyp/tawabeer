"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface BookingSlot {
  id: string;
  shop_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

interface Booking {
  id: string;
  slot_id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  status: string;
}

interface ShopSettings {
  shop_id: string;
  booking_enabled: number;
  slot_duration_minutes: number;
  max_bookings_per_slot: number;
  booking_advance_days: number;
  avg_service_minutes: number;
  is_open: number;
  greeting_message: string;
  whatsapp_enabled: number;
  whatsapp_number: string;
}

const DAY_NAMES: Record<number, string> = {
  0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء",
  4: "الخميس", 5: "الجمعة", 6: "السبت",
};

const DAY_EMOJIS: Record<number, string> = {
  0: "🌞", 1: "🌙", 2: "⭐", 3: "🌟", 4: "💫", 5: "☀️", 6: "🌙",
};

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "م" : "ص";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

// Convert "1" or "true" or 1 → 1; anything else → 0
function toInt(v: any): number {
  if (v === 1 || v === "1" || v === true) return 1;
  return 0;
}

function getOwnerPassword(): string {
  try {
    return JSON.parse(sessionStorage.getItem("dawer_owner") || "{}").password || "";
  } catch {
    return "";
  }
}

export default function BookingsManagementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [saving, setSaving] = useState(false);
  const [addingSlot, setAddingSlot] = useState(false);
  const [message, setMessage] = useState("");

  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [selectedDay, setSelectedDay] = useState(0);
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("17:00");

  const fetchData = async () => {
    try {
      const [settingsRes, slotsRes, shopRes] = await Promise.all([
        fetch(`/api/shops/${id}/settings`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        }),
        fetch(`/api/shops/${id}/booking-slots`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        }),
        fetch(`/api/shops/${id}`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        }),
      ]);
      const settingsData = await settingsRes.json();
      const slotsData = await slotsRes.json();
      const shopData = await shopRes.json();
      if (settingsData.settings) setSettings(settingsData.settings);
      if (slotsData.slots) setSlots(slotsData.slots);
      if (shopData.shop) setShopName(shopData.shop.name);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    const pw = getOwnerPassword();
    try {
      const res = await fetch(`/api/shops/${id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
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
        const err = await res.json().catch(() => ({}));
        setMessage("❌ " + (err.error || "حدث خطأ أثناء الحفظ"));
      }
    } catch {
      setMessage("❌ حدث خطأ أثناء الحفظ");
    }
    setSaving(false);
  };

  const handleAddSlot = async () => {
    setAddingSlot(true);
    setMessage("");
    const pw = getOwnerPassword();
    try {
      const res = await fetch(`/api/shops/${id}/booking-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          dayOfWeek: selectedDay,
          startTime: slotStart,
          endTime: slotEnd,
          owner_password: pw,
        }),
      });
      const data = await res.json();
      if (data.slot) {
        setSlots([...slots, data.slot]);
        setMessage("✅ تم إضافة موعد " + DAY_NAMES[selectedDay] + " من " + formatTime(slotStart) + " إلى " + formatTime(slotEnd));
        setTimeout(() => setMessage(""), 3000);
      } else if (data.error) {
        setMessage("❌ " + data.error);
      }
    } catch {
      setMessage("❌ حدث خطأ");
    }
    setAddingSlot(false);
  };

  const handleDeleteSlot = async (slotId: string) => {
    const pw = getOwnerPassword();
    try {
      const res = await fetch(`/api/shops/${id}/booking-slots?slotId=${slotId}&owner_password=${encodeURIComponent(pw)}`, {
        method: "DELETE",
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.ok) {
        setSlots(slots.filter((s) => s.id !== slotId));
        setMessage("✅ تم حذف الموعد");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {}
  };

  const handleCancelBooking = async (bookingId: string) => {
    const pw = getOwnerPassword();
    try {
      const res = await fetch(`/api/shops/${id}/bookings?bookingId=${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ status: "cancelled", owner_password: pw }),
      });
      if (res.ok) {
        setBookings(bookings.filter((b) => b.id !== bookingId));
        setMessage("✅ تم إلغاء الحجز");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {}
  };

  const fetchBookings = async (date: string) => {
    try {
      const res = await fetch(`/api/shops/${id}/bookings?date=${date}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      if (data.bookings) setBookings(data.bookings);
    } catch {}
  };

  useEffect(() => {
    if (filterDate) fetchBookings(filterDate);
  }, [filterDate]);

  const slotsByDay: Record<number, BookingSlot[]> = {};
  for (let i = 0; i < 7; i++) slotsByDay[i] = [];
  for (const slot of slots) {
    if (slotsByDay[slot.day_of_week]) {
      slotsByDay[slot.day_of_week].push(slot);
    }
  }

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
        <div className="mx-auto max-w-4xl flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/shop/${id}`}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">→</Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">📅 إدارة الحجوزات</h1>
              <p className="text-xs text-gray-400">{shopName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {message && (
          <div className={`rounded-xl p-4 text-center font-medium text-sm ${
            message.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>{message}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><span>⚙️</span><span>إعدادات الحجز</span></h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Toggle for enabling/disabling online booking */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
              <div>
                <p className="text-sm font-bold text-gray-900">🟢 الحجز المسبق (أونلاين)</p>
                <p className="text-xs text-gray-500 mt-0.5">السماح للعملاء بحجز مواعيد من الموقع</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, booking_enabled: toInt(settings.booking_enabled) === 1 ? 0 : 1 })}
                className={`relative w-14 h-7 rounded-full transition-colors ${toInt(settings.booking_enabled) === 1 ? "bg-green-500" : "bg-gray-300"}`}
                type="button">
                <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${toInt(settings.booking_enabled) === 1 ? "translate-x-7" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⏱️ مدة كل موعد: <span className="font-bold text-indigo-600">{settings.slot_duration_minutes} دقيقة</span>
              </label>
              <input type="range" min="15" max="120" step="5"
                value={settings.slot_duration_minutes}
                onChange={(e) => setSettings({ ...settings, slot_duration_minutes: Number(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>15 د</span><span>120 د</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👥 أقصى عدد حجوزات لكل موعد: <span className="font-bold text-indigo-600">{settings.max_bookings_per_slot}</span>
              </label>
              <input type="range" min="1" max="20"
                value={settings.max_bookings_per_slot}
                onChange={(e) => setSettings({ ...settings, max_bookings_per_slot: Number(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 الحجز المسبق: <span className="font-bold text-indigo-600">{settings.booking_advance_days} يوم</span>
              </label>
              <input type="range" min="1" max="30"
                value={settings.booking_advance_days}
                onChange={(e) => setSettings({ ...settings, booking_advance_days: Number(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>يوم</span><span>30 يوم</span></div>
            </div>
            <button onClick={handleSaveSettings} disabled={saving}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {saving ? "جاري الحفظ..." : "💾 حفظ الإعدادات"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><span>🕐</span><span>مواعيد العمل</span></h2>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">{slots.length}</span>
          </div>
          <div className="p-5 space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <div key={day} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{DAY_EMOJIS[day]}</span>
                  <span className="text-sm font-medium text-gray-700">{DAY_NAMES[day]}</span>
                  <span className="text-xs text-gray-400">({slotsByDay[day]?.length || 0} موعد)</span>
                </div>
                <div className="flex items-center gap-2">
                  {slotsByDay[day]?.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        {slotsByDay[day].sort((a, b) => (a.start_time > b.start_time ? 1 : -1)).map((s) => `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`).join(" | ")}
                      </span>
                      {slotsByDay[day].map((slot) => (
                        <button key={slot.id} onClick={() => handleDeleteSlot(slot.id)}
                          className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-xs text-red-500 hover:bg-red-100 transition-colors"
                          title="حذف">✕</button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">لا توجد مواعيد</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><span>➕</span><span>إضافة موعد جديد</span></h2>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm font-medium text-gray-500 w-full mb-1">اليوم</span>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <button key={day} onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${selectedDay === day ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {DAY_EMOJIS[day]} {DAY_NAMES[day]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">من</label>
                <input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">إلى</label>
                <input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button onClick={handleAddSlot} disabled={addingSlot}
                className="mt-5 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all whitespace-nowrap">
                {addingSlot ? "..." : `+ إضافة موعد ${DAY_NAMES[selectedDay]}`}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><span>📋</span><span>الحجوزات</span></h2>
          </div>
          <div className="p-5">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                className="w-full max-w-xs rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {bookings.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">لا توجد حجوزات في هذا التاريخ</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{booking.customer_name}</p>
                      <p className="text-xs text-gray-400">{booking.customer_phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${booking.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : booking.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                        {booking.status === "confirmed" ? "مؤكد" : booking.status === "cancelled" ? "ملغي" : booking.status}
                      </span>
                      {booking.status !== "cancelled" && (
                        <button onClick={() => handleCancelBooking(booking.id)} className="text-xs text-red-500 hover:text-red-700">إلغاء</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}