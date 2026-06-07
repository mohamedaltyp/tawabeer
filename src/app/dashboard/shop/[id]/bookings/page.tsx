"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ShopSettings {
  booking_enabled: number;
  slot_duration_minutes: number;
  max_bookings_per_slot: number;
  booking_advance_days: number;
  is_open: number;
}

interface BookingSlot {
  id: string;
  shop_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: number;
}

interface Booking {
  id: string;
  shop_id: string;
  slot_id: string;
  booking_date: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  notes: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
}

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_EMOJI = ["🌞", "🌙", "⭐", "🌟", "💫", "☀️", "🌙"];

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "م" : "ص";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export default function BookingsManagementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // New slot form
  const [selectedDay, setSelectedDay] = useState(0);
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("09:30");
  const [addingSlot, setAddingSlot] = useState(false);

  // Filter
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, slotsRes, bookingsRes, shopRes] = await Promise.all([
        fetch(`/api/shops/${id}/settings`, { headers: { "ngrok-skip-browser-warning": "true" } }),
        fetch(`/api/shops/${id}/booking-slots`, { headers: { "ngrok-skip-browser-warning": "true" } }),
        fetch(`/api/shops/${id}/bookings`, { headers: { "ngrok-skip-browser-warning": "true" } }),
        fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } }),
      ]);

      const settingsData = await settingsRes.json();
      const slotsData = await slotsRes.json();
      const bookingsData = await bookingsRes.json();
      const shopData = await shopRes.json();

      if (settingsData.settings) setSettings(settingsData.settings);
      if (slotsData.slots) setSlots(slotsData.slots);
      if (bookingsData.bookings) setBookings(bookingsData.bookings);
      if (shopData.shop) setShopName(shopData.shop.name);
    } catch {}
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/shops/${id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          booking_enabled: settings.booking_enabled,
          slot_duration_minutes: settings.slot_duration_minutes,
          max_bookings_per_slot: settings.max_bookings_per_slot,
          booking_advance_days: settings.booking_advance_days,
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

  const handleAddSlot = async () => {
    setAddingSlot(true);
    setMessage("");
    try {
      const res = await fetch(`/api/shops/${id}/booking-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          dayOfWeek: selectedDay,
          startTime: slotStart,
          endTime: slotEnd,
        }),
      });
      const data = await res.json();
      if (data.slot) {
        setSlots([...slots, data.slot]);
        setMessage(`✅ تم إضافة موعد ${DAY_NAMES[selectedDay]} من ${formatTime(slotStart)} إلى ${formatTime(slotEnd)}`);
        setTimeout(() => setMessage(""), 3000);
      } else if (data.error) {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage("❌ حدث خطأ");
    }
    setAddingSlot(false);
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/shops/${id}/booking-slots?slotId=${slotId}`, {
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
    try {
      const res = await fetch(`/api/shops/${id}/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ action: "cancel", bookingId }),
      });
      if (res.ok) {
        setBookings(bookings.map((b) => b.id === bookingId ? { ...b, status: "cancelled" } : b));
        setMessage("✅ تم إلغاء الحجز");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {}
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/shops/${id}/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ action: "complete", bookingId }),
      });
      if (res.ok) {
        setBookings(bookings.map((b) => b.id === bookingId ? { ...b, status: "completed" } : b));
        setMessage("✅ تم إتمام الحجز");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {}
  };

  // Group slots by day
  const slotsByDay = DAY_NAMES.map((_, i) => slots.filter((s) => s.day_of_week === i));

  // Filter bookings
  const filteredBookings = filterDate
    ? bookings.filter((b) => b.booking_date === filterDate)
    : bookings;

  if (loading) {
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
              <h1 className="text-base font-bold text-gray-900">📅 إدارة الحجوزات</h1>
              <p className="text-xs text-gray-400">{shopName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Message */}
        {message && (
          <div className={`rounded-xl p-4 text-center font-medium text-sm ${
            message.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            {message}
          </div>
        )}

        {/* Booking Settings */}
        {settings && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span>⚙️</span>
                <span>إعدادات الحجز</span>
              </h2>
              <button
                onClick={async () => {
                  const newVal = settings.booking_enabled === 1 ? 0 : 1;
                  const newSettings = { ...settings, booking_enabled: newVal };
                  setSettings(newSettings);
                  // Auto-save toggle
                  try {
                    await fetch(`/api/shops/${id}/settings`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                      body: JSON.stringify({ booking_enabled: newVal }),
                    });
                    setMessage(newVal === 1 ? "✅ تم تفعيل الحجز" : "🔴 تم تعطيل الحجز");
                    setTimeout(() => setMessage(""), 3000);
                  } catch {}
                }}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.booking_enabled === 1 ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    settings.booking_enabled === 1 ? "translate-x-7" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Slot Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⏱️ مدة كل موعد: <span className="font-bold text-indigo-600">{settings.slot_duration_minutes} دقيقة</span>
                </label>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={settings.slot_duration_minutes}
                  onChange={(e) => setSettings({ ...settings, slot_duration_minutes: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>15 د</span>
                  <span>120 د</span>
                </div>
              </div>

              {/* Max Bookings Per Slot */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👥 أقصى عدد حجوزات لكل موعد: <span className="font-bold text-indigo-600">{settings.max_bookings_per_slot}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.max_bookings_per_slot}
                  onChange={(e) => setSettings({ ...settings, max_bookings_per_slot: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Advance Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 الحجز المسبق: <span className="font-bold text-indigo-600">{settings.booking_advance_days} يوم</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={settings.booking_advance_days}
                  onChange={(e) => setSettings({ ...settings, booking_advance_days: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>يوم</span>
                  <span>30 يوم</span>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {saving ? "جاري الحفظ..." : "💾 حفظ الإعدادات"}
              </button>
            </div>
          </div>
        )}

        {/* Booking Slots */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>🕐</span>
                <span>مواعيد العمل</span>
              </span>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {slots.length}
              </span>
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Existing Slots by Day */}
            {DAY_NAMES.map((day, dayIdx) => (
              <div key={dayIdx}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{DAY_EMOJI[dayIdx]}</span>
                  <span className="text-sm font-bold text-gray-700">{day}</span>
                  <span className="text-xs text-gray-400">({slotsByDay[dayIdx].length} موعد)</span>
                </div>
                {slotsByDay[dayIdx].length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {slotsByDay[dayIdx].map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center gap-1.5 bg-indigo-50 rounded-lg px-3 py-1.5 text-sm"
                      >
                        <span className="text-indigo-700 font-medium">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-red-400 hover:text-red-600 text-xs ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 pr-6">لا توجد مواعيد</p>
                )}
              </div>
            ))}

            {/* Add New Slot */}
            <div className="border-t border-gray-100 pt-4 mt-4">
              <p className="text-sm font-bold text-gray-700 mb-3">➕ إضافة موعد جديد</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">اليوم</label>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES.map((day, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDay(i)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedDay === i
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {DAY_EMOJI[i]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">من</label>
                    <input
                      type="time"
                      value={slotStart}
                      onChange={(e) => setSlotStart(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">إلى</label>
                    <input
                      type="time"
                      value={slotEnd}
                      onChange={(e) => setSlotEnd(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddSlot}
                  disabled={addingSlot}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
                >
                  {addingSlot ? "جاري الإضافة..." : `+ إضافة موعد ${DAY_NAMES[selectedDay]}`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>📋</span>
              <span>الحجوزات</span>
            </h2>
            <div className="mt-3">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="p-5">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-400 text-sm">لا توجد حجوزات في هذا التاريخ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`rounded-xl p-4 border ${
                      booking.status === "cancelled"
                        ? "bg-gray-50 border-gray-200 opacity-60"
                        : booking.status === "completed"
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm">
                            {booking.customer_name || "بدون اسم"}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            booking.status === "confirmed"
                              ? "bg-blue-100 text-blue-700"
                              : booking.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {booking.status === "confirmed" ? "مؤكد" : booking.status === "cancelled" ? "ملغي" : "مكتمل"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>📅 {booking.booking_date}</span>
                          <span>🕐 {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                        </div>
                        {booking.customer_phone && (
                          <p className="text-xs text-gray-400 mt-1">📞 {booking.customer_phone}</p>
                        )}
                        {booking.notes && (
                          <p className="text-xs text-gray-400 mt-1">💬 {booking.notes}</p>
                        )}
                      </div>
                      {booking.status === "confirmed" && (
                        <div className="flex gap-1.5 mr-2">
                          <button
                            onClick={() => handleCompleteBooking(booking.id)}
                            className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors text-sm"
                            title="إتمام"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors text-sm"
                            title="إلغاء"
                          >
                            ✕
                          </button>
                        </div>
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
