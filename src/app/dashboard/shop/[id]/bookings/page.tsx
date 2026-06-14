"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  ArrowRight,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Users,
  Hash,
  Filter,
  Settings,
  Check,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";

interface BookingSlot {
  id: string;
  shop_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_bookings: number;
  is_active: boolean;
  created_at: string;
}

interface Booking {
  id: string;
  slot_id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string;
  created_at?: string;
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
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);

  // Multi-slot form state
  const [selectedDays, setSelectedDays] = useState<number[]>([0,1,2,3,4]); // Sun-Thu
  const [slotTemplates, setSlotTemplates] = useState<{startTime: string; endTime: string; maxBookings: number}[]>([
    { startTime: "09:00", endTime: "14:00", maxBookings: 10 }
  ]);

  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const flash = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

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
        flash("success", "✅ تم الحفظ بنجاح");
        setShowSettings(false);
      } else {
        const err = await res.json().catch(() => ({}));
        flash("error", err.error || "حدث خطأ أثناء الحفظ");
      }
    } catch {
      flash("error", "حدث خطأ أثناء الحفظ");
    }
    setSaving(false);
  };

  const handleAddSlot = async () => {
    if (selectedDays.length === 0 || slotTemplates.length === 0) {
      flash("error", "اختر يوماً واحداً على الأقل وأضف فترة زمنية");
      return;
    }
    setAddingSlot(true);
    const pw = getOwnerPassword();
    let added = 0;
    for (const day of selectedDays) {
      for (const tmpl of slotTemplates) {
        try {
          const res = await fetch(`/api/shops/${id}/booking-slots`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
            body: JSON.stringify({
              dayOfWeek: day,
              startTime: tmpl.startTime,
              endTime: tmpl.endTime,
              maxBookings: tmpl.maxBookings,
              owner_password: pw,
            }),
          });
          const data = await res.json();
          if (data.slot) {
            setSlots(prev => [...prev, data.slot]);
            added++;
          } else if (data.error) {
            flash("error", data.error);
          }
        } catch {
          flash("error", "حدث خطأ");
        }
      }
    }
    if (added > 0) {
      flash("success", `✅ تم إضافة ${added} موعد عمل بنجاح`);
    }
    setAddingSlot(false);
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("هل تريد حذف هذا الموعد؟")) return;
    try {
      const res = await fetch(`/api/shops/${id}/booking-slots?slotId=${slotId}`, {
        method: "DELETE",
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.ok) {
        setSlots(slots.filter((s) => s.id !== slotId));
        flash("success", "✅ تم حذف الموعد");
      }
    } catch {}
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: "confirmed" | "cancelled" | "completed") => {
    const pw = getOwnerPassword();
    try {
      const res = await fetch(`/api/shops/${id}/bookings?bookingId=${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ status: newStatus, owner_password: pw }),
      });
      if (res.ok) {
        setBookings(bookings.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b));
        const statusLabel = { confirmed: "مؤكد", cancelled: "ملغي", completed: "مكتمل" }[newStatus];
        flash("success", `✅ تم تحديث الحالة إلى ${statusLabel}`);
      }
    } catch {
      flash("error", "حدث خطأ أثناء التحديث");
    }
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

  // Group slots by day
  const slotsByDay: Record<number, BookingSlot[]> = {};
  for (let i = 0; i < 7; i++) slotsByDay[i] = [];
  for (const slot of slots) {
    if (slotsByDay[slot.day_of_week]) {
      slotsByDay[slot.day_of_week].push(slot);
    }
  }

  // Filter bookings by status
  const filteredBookings = statusFilter === "all"
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  // Stats
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto" />
          <p className="text-indigo-300 text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg backdrop-blur-xl ${
          toast.type === "success"
            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
            : "bg-red-500/20 border border-red-500/30 text-red-300"
        }`}>
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Back link */}
        <Link
          href={`/dashboard/shop/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          العودة للوحة التحكم
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="w-8 h-8 text-indigo-400" />
              إدارة الحجوزات
            </h1>
            <p className="text-white/40 text-sm mt-1">{shopName}</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
            الإعدادات
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "الحجوزات", value: stats.total, icon: Hash, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
            { label: "مؤكدة", value: stats.confirmed, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "قيد الانتظار", value: stats.pending, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "مكتملة", value: stats.completed, icon: RotateCcw, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border ${stat.bg} p-4 backdrop-blur text-center`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-white/50">{stat.label}</span>
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              إعدادات الحجز
            </h3>

            {/* Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <div>
                <p className="text-sm font-bold text-white">الحجز المسبق (أونلاين)</p>
                <p className="text-xs text-white/50 mt-0.5">السماح للعملاء بحجز مواعيد من الموقع</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, booking_enabled: toInt(settings.booking_enabled) === 1 ? 0 : 1 })}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  toInt(settings.booking_enabled) === 1 ? "bg-emerald-500" : "bg-white/20"
                }`}
              >
                <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  toInt(settings.booking_enabled) === 1 ? "translate-x-7" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  ⏱️ مدة كل موعد: <span className="font-bold text-indigo-400">{settings.slot_duration_minutes} دقيقة</span>
                </label>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="5"
                  value={settings.slot_duration_minutes}
                  onChange={(e) => setSettings({ ...settings, slot_duration_minutes: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none bg-white/10 accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>15 د</span>
                  <span>120 د</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  <Users className="w-4 h-4 inline -mt-0.5" /> أقصى عدد حجوزات لكل موعد: <span className="font-bold text-indigo-400">{settings.max_bookings_per_slot}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.max_bookings_per_slot}
                  onChange={(e) => setSettings({ ...settings, max_bookings_per_slot: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none bg-white/10 accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  <Calendar className="w-4 h-4 inline -mt-0.5" /> الحجز المسبق: <span className="font-bold text-indigo-400">{settings.booking_advance_days} يوم</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={settings.booking_advance_days}
                  onChange={(e) => setSettings({ ...settings, booking_advance_days: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none bg-white/10 accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>يوم</span>
                  <span>30 يوم</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-l from-indigo-600 to-indigo-500 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                💾 حفظ الإعدادات
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Working Hours */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              مواعيد العمل
            </h3>
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-full">
              {slots.length} موعد
            </span>
          </div>
          <div className="p-5 space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <div
                key={day}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  slotsByDay[day]?.length > 0
                    ? "bg-indigo-500/5 border-indigo-500/10"
                    : "bg-white/[0.02] border-white/5"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xl">{DAY_EMOJIS[day]}</span>
                  <div>
                    <span className={`text-sm font-bold ${slotsByDay[day]?.length > 0 ? "text-white" : "text-white/40"}`}>
                      {DAY_NAMES[day]}
                    </span>
                    {slotsByDay[day]?.length > 0 ? (
                      <p className="text-xs text-white/50 mt-0.5">
                        {slotsByDay[day].sort((a, b) => (a.start_time > b.start_time ? 1 : -1)).map((s) => `${formatTime(s.start_time)} - ${formatTime(s.end_time)} (${s.max_bookings || 5} حجز)`).join(" • ")}
                      </p>
                    ) : (
                      <p className="text-xs text-white/20 mt-0.5">لا توجد مواعيد</p>
                    )}
                  </div>
                </div>
                {slotsByDay[day]?.length > 0 && (
                  <div className="flex items-center gap-1 ms-4">
                    {slotsByDay[day].map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                        title="حذف الموعد"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add Slot Form — Multi-Slot */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              إضافة مواعيد عمل جديدة
            </h3>
            <p className="text-xs text-white/40 mt-1">أضف فترات زمنية للسماح للعملاء بالحجز — كل يوم يقدر يكون فيه أكتر من فترة</p>
          </div>
          <div className="p-5 space-y-5">

            {/* Quick Templates */}
            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">⚡ اختيار سريع</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "صباحي", slots: [{ startTime: "09:00", endTime: "14:00", maxBookings: 10 }] },
                  { label: "مسائي", slots: [{ startTime: "16:00", endTime: "21:00", maxBookings: 10 }] },
                  { label: "يوم كامل", slots: [{ startTime: "09:00", endTime: "14:00", maxBookings: 10 }, { startTime: "16:00", endTime: "21:00", maxBookings: 10 }] },
                  { label: "مخصص", slots: [{ startTime: "09:00", endTime: "14:00", maxBookings: 10 }] },
                ].map((tmpl) => (
                  <button
                    key={tmpl.label}
                    onClick={() => setSlotTemplates(tmpl.slots.map(s => ({ ...s })))}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-300 transition-all"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-Day Picker */}
            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">
                📅 الأيام <span className="text-indigo-400">({selectedDays.length} محددة)</span>
              </label>
              <div className="grid grid-cols-7 gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDays(prev =>
                        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                      );
                    }}
                    className={`p-2 rounded-xl text-sm font-medium transition-all ${
                      selectedDays.includes(day)
                        ? "bg-indigo-600 text-white shadow-lg scale-105"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-lg block">{DAY_EMOJIS[day]}</span>
                    <span className="text-xs">{DAY_NAMES[day]}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setSelectedDays([0,1,2,3,4])} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10">أيام الأسبوع</button>
                <button onClick={() => setSelectedDays([0,1,2,3,4,5,6])} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10">الكل</button>
                <button onClick={() => setSelectedDays([])} className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20">مسح</button>
              </div>
            </div>

            {/* Time Slots — Dynamic List */}
            <div>
              <label className="block text-sm font-bold text-white/70 mb-3">⏱️ الفترات الزمنية</label>
              <div className="space-y-3">
                {slotTemplates.map((tmpl, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400">فترة {idx + 1}</span>
                      {slotTemplates.length > 1 && (
                        <button
                          onClick={() => setSlotTemplates(prev => prev.filter((_, i) => i !== idx))}
                          className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xs text-red-400 hover:bg-red-500/20"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-white/40 mb-1">من</label>
                        <input
                          type="time"
                          value={tmpl.startTime}
                          onChange={(e) => {
                            const updated = [...slotTemplates];
                            updated[idx] = { ...updated[idx], startTime: e.target.value };
                            setSlotTemplates(updated);
                          }}
                          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                      </div>
                      <span className="text-white/30 text-xl pb-2">←</span>
                      <div className="flex-1">
                        <label className="block text-xs text-white/40 mb-1">إلى</label>
                        <input
                          type="time"
                          value={tmpl.endTime}
                          onChange={(e) => {
                            const updated = [...slotTemplates];
                            updated[idx] = { ...updated[idx], endTime: e.target.value };
                            setSlotTemplates(updated);
                          }}
                          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-white/40 mb-1">حد أقصى</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={tmpl.maxBookings}
                          onChange={(e) => {
                            const updated = [...slotTemplates];
                            updated[idx] = { ...updated[idx], maxBookings: Number(e.target.value) || 1 };
                            setSlotTemplates(updated);
                          }}
                          className="w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSlotTemplates(prev => [...prev, { startTime: "14:00", endTime: "17:00", maxBookings: 10 }])}
                className="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-indigo-500/20 text-indigo-400 text-sm font-bold hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> إضافة فترة أخرى
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddSlot}
              disabled={addingSlot || selectedDays.length === 0}
              className="w-full rounded-xl bg-gradient-to-l from-indigo-600 to-indigo-500 px-6 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {addingSlot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              إضافة {selectedDays.length} أيام × {slotTemplates.length} فترة = {selectedDays.length * slotTemplates.length} موعد
            </button>
          </div>
        </div>

        {/* Bookings List */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Hash className="w-5 h-5 text-indigo-400" />
              الحجوزات
            </h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-white/40" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="px-5 pt-4 flex gap-2 overflow-x-auto pb-2">
            {[
              { key: "all", label: "الكل", count: stats.total },
              { key: "pending", label: "قيد الانتظار", count: stats.pending },
              { key: "confirmed", label: "مؤكد", count: stats.confirmed },
              { key: "completed", label: "مكتمل", count: stats.completed },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  statusFilter === tab.key
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  statusFilter === tab.key ? "bg-white/20" : "bg-white/10"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-5">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-lg text-white/30">لا توجد حجوزات</p>
                <p className="text-sm text-white/15 mt-1">
                  {statusFilter === "all" ? "في هذا التاريخ" : `بحالة "${statusFilter}"`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/5"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm text-white">{booking.customer_name}</p>
                      <p className="text-xs text-white/40 mt-0.5" dir="ltr">{booking.customer_phone}</p>
                      {booking.notes && <p className="text-xs text-white/30 mt-1">💬 {booking.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 ms-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                          booking.status === "confirmed"
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            : booking.status === "cancelled"
                            ? "bg-red-500/10 border border-red-500/20 text-red-400"
                            : booking.status === "completed"
                            ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                            : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                        }`}
                      >
                        {booking.status === "confirmed"
                          ? "✅ مؤكد"
                          : booking.status === "cancelled"
                          ? "❌ ملغي"
                          : booking.status === "completed"
                          ? "✔️ مكتمل"
                          : "⏳ قيد الانتظار"}
                      </span>
                      <div className="flex items-center gap-1">
                        {booking.status === "pending" && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")}
                            className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 rounded-lg transition-colors font-medium border border-emerald-500/20"
                          >
                            تأكيد
                          </button>
                        )}
                        {booking.status !== "cancelled" && booking.status !== "completed" && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                            className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2 py-1 rounded-lg transition-colors font-medium border border-red-500/20"
                          >
                            إلغاء
                          </button>
                        )}
                        {booking.status !== "completed" && booking.status !== "cancelled" && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, "completed")}
                            className="text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-1 rounded-lg transition-colors font-medium border border-blue-500/20"
                          >
                            مكتمل
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
