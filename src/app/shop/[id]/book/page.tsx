"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ShopData {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface BookingSlot {
  id: string;
  shop_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: number;
}

interface AvailableSlot {
  slot: BookingSlot;
  available: number;
  total: number;
}

interface BookingResult {
  booking: {
    id: string;
    booking_date: string;
    customer_name: string;
    status: string;
  };
  position: number;
}

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "م" : "ص";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingEnabled, setBookingEnabled] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Booking form state
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setLoading(false); return; }
        setShop(d.shop);
        setBookingEnabled(d.settings?.booking_enabled === 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const fetchAvailableSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/shops/${id}/bookings?date=${date}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch {
      setAvailableSlots([]);
    }
    setLoadingSlots(false);
  }, [id]);

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    fetchAvailableSlots(dateStr);
  };

  const handleBook = async () => {
    if (!name.trim()) {
      setError("من فضلك أدخل اسمك");
      return;
    }
    if (!selectedSlot || !selectedDate) {
      setError("من فضلك اختر موعداً");
      return;
    }

    setBooking(true);
    setError("");
    try {
      const res = await fetch(`/api/shops/${id}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          slotId: selectedSlot,
          bookingDate: selectedDate,
          customerName: name,
          customerPhone: phone,
          notes,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setBookingResult(data);
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    }
    setBooking(false);
  };

  // ─── Calendar helpers ───
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const formatDateStr = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // ─── Loading ───
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #6C3CE1 100%)" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // ─── Not Found ───
  if (!shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #6C3CE1 100%)" }}>
        <div className="text-8xl">😕</div>
        <h1 className="text-2xl font-bold text-white">المحل غير موجود</h1>
        <Link href="/" className="text-white/70 hover:text-white transition-colors underline">العودة للرئيسية</Link>
      </div>
    );
  }

  // ─── Booking not enabled ───
  if (!bookingEnabled) {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #6C3CE1 100%)" }}>
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/10 border-b border-white/10">
          <div className="mx-auto max-w-lg flex items-center justify-between px-4 h-14">
            <Link href={`/shop/${id}`} className="text-white/70 hover:text-white transition-colors text-sm">→ العودة</Link>
            <h1 className="font-bold text-white text-sm">{shop.name}</h1>
            <div className="w-12"></div>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center gap-4 p-6 pt-20">
          <div className="text-6xl">📅</div>
          <h2 className="text-xl font-bold text-white text-center">الحجز بالمواعيد غير متاح</h2>
          <p className="text-white/60 text-center">هذا المحل لا يقبل حجوزات أونلاين حالياً</p>
          <Link
            href={`/shop/${id}`}
            className="mt-4 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white font-bold transition-all"
          >
            العودة لصفحة المحل
          </Link>
        </div>
      </div>
    );
  }

  // ─── Booking Confirmation ───
  if (bookingResult) {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #065F46 0%, #059669 50%, #10B981 100%)" }}>
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6 text-center">
          <div className="text-8xl animate-bounce">✅</div>
          <h1 className="text-2xl font-bold text-white">تم الحجز بنجاح!</h1>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-sm border border-white/20 space-y-3">
            <div className="flex justify-between text-white">
              <span className="text-white/70">التاريخ</span>
              <span className="font-bold">{bookingResult.booking.booking_date}</span>
            </div>
            <div className="flex justify-between text-white">
              <span className="text-white/70">الاسم</span>
              <span className="font-bold">{bookingResult.booking.customer_name}</span>
            </div>
            <div className="flex justify-between text-white">
              <span className="text-white/70">رقم الحجز</span>
              <span className="font-bold">#{bookingResult.position}</span>
            </div>
          </div>
          <p className="text-white/60 text-sm">سيتم إرسال تذكير لك قبل موعدك</p>
          <button
            onClick={() => {
              setBookingResult(null);
              setSelectedDate(null);
              setSelectedSlot(null);
              setName("");
              setPhone("");
              setNotes("");
            }}
            className="mt-4 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white font-bold transition-all"
          >
            حجز موعد آخر
          </button>
          <Link href={`/shop/${id}`} className="text-white/60 hover:text-white text-sm underline transition-colors">
            العودة لصفحة المحل
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main Booking UI ───
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #6C3CE1 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/10 border-b border-white/10">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 h-14">
          <Link href={`/shop/${id}`} className="text-white/70 hover:text-white transition-colors text-sm">→ العودة</Link>
          <h1 className="font-bold text-white text-sm">📅 حجز موعد — {shop.name}</h1>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 text-center text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/5">
            <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              →
            </button>
            <h2 className="font-bold text-white">{MONTH_NAMES[month]} {year}</h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              ←
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 px-3 pt-2">
            {DAY_NAMES.map((day) => (
              <div key={day} className="text-center text-xs text-white/50 font-medium py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 px-3 py-2">
            {/* Empty cells for days before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10"></div>
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(year, month, day);
              dateObj.setHours(0, 0, 0, 0);
              const dateStr = formatDateStr(year, month, day);
              const isPast = dateObj < today;
              const isToday = dateObj.getTime() === today.getTime();
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => !isPast && handleDateSelect(dateStr)}
                  disabled={isPast}
                  className={`h-10 rounded-xl text-sm font-medium transition-all ${
                    isPast
                      ? "text-white/20 cursor-not-allowed"
                      : isSelected
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                      : isToday
                      ? "bg-white/20 text-white ring-2 ring-indigo-400"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden animate-fade-in">
            <div className="px-4 py-3 bg-white/5 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">
                🕐 المواعيد المتاحة — {selectedDate}
              </h3>
            </div>
            <div className="p-4">
              {loadingSlots ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-white/50 text-sm">جاري تحميل المواعيد...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">😔</div>
                  <p className="text-white/50 text-sm">لا توجد مواعيد متاحة في هذا التاريخ</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableSlots.map((item) => (
                    <button
                      key={item.slot.id}
                      onClick={() => setSelectedSlot(item.slot.id)}
                      disabled={item.available === 0}
                      className={`w-full p-3 rounded-xl border transition-all text-right ${
                        selectedSlot === item.slot.id
                          ? "bg-indigo-500/30 border-indigo-400 shadow-lg shadow-indigo-500/20"
                          : item.available === 0
                          ? "bg-white/5 border-white/10 opacity-40 cursor-not-allowed"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-bold text-sm">
                            {formatTime(item.slot.start_time)} - {formatTime(item.slot.end_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.available === 0
                              ? "bg-red-500/20 text-red-300"
                              : item.available <= 2
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-green-500/20 text-green-300"
                          }`}>
                            {item.available === 0 ? "ممتلأ" : `${item.available} متاح`}
                          </span>
                          {selectedSlot === item.slot.id && (
                            <span className="text-indigo-300 text-lg">✓</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Booking Form */}
        {selectedSlot && selectedDate && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden animate-fade-in">
            <div className="px-4 py-3 bg-white/5 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">📝 بيانات الحجز</h3>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم *"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="رقم التليفون (اختياري)"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                dir="ltr"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات (اختياري)"
                rows={2}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              />
              <button
                onClick={handleBook}
                disabled={booking || !name.trim()}
                className="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/30"
              >
                {booking ? "جاري الحجز..." : "📅 تأكيد الحجز"}
              </button>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="h-8"></div>
      </main>
    </div>
  );
}
