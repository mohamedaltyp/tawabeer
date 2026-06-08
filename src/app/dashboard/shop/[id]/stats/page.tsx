"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

function parseDBDate(dateStr: string): Date {
  if (dateStr && !dateStr.endsWith("Z")) return new Date(dateStr + "Z");
  return new Date(dateStr);
}

interface Stats {
  waiting: number;
  today_total: number;
  avg_wait_minutes: number;
  peak_hours: { hour: string; count: number }[];
}

interface QueueEntry {
  id: string;
  number: number;
  customer_name: string;
  customer_phone: string;
  status: string;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
  recall_count: number;
}

// ─── Progress Ring Component ───
function ProgressRing({ percent, size = 120, strokeWidth = 10, color = "#6C3CE1", label, sublabel }: {
  percent: number; size?: number; strokeWidth?: number; color?: string; label: string; sublabel: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-black" style={{ color }}>{percent}%</span>
      </div>
      <p className="text-sm font-bold text-gray-700 mt-2">{label}</p>
      <p className="text-xs text-gray-400">{sublabel}</p>
    </div>
  );
}

// ─── Bar Chart Component ───
function BarChart({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d, i) => {
        const height = maxVal > 0 ? Math.max(4, (d.value / maxVal) * 100) : 4;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-gray-600">{d.value > 0 ? d.value : ""}</span>
            <div className="w-full rounded-t-lg transition-all duration-500 ease-out relative group"
              style={{
                height: `${height}%`,
                background: d.value > 0
                  ? `linear-gradient(to top, #6C3CE1, #8B5CF6)`
                  : "#E5E7EB",
                minHeight: 4,
              }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {d.value} عميل
              </div>
            </div>
            <span className="text-xs text-gray-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const { id } = useParams<{ id: string }>();
  const [shop, setShop] = useState<{ name: string; category: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [allQueue, setAllQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingData, setRatingData] = useState<{ average: number; count: number } | null>(null);

  useEffect(() => {
    fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setShop(d.shop);
          setStats(d.stats);
          setAllQueue(d.allQueue || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/shops/${id}/ratings`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (d.average) setRatingData(d.average);
      })
      .catch(() => {});
  }, [id]);

  // ─── Computed Statistics ───
  const today = new Date().toDateString();

  const todayEntries = useMemo(() =>
    allQueue.filter((e) => parseDBDate(e.created_at).toDateString() === today),
    [allQueue, today]
  );

  const todayCompleted = todayEntries.filter((e) => e.status === "completed").length;
  const todayCancelled = todayEntries.filter((e) => e.status === "cancelled").length;
  const todayWaiting = todayEntries.filter((e) => e.status === "waiting").length;
  const todayCalled = todayEntries.filter((e) => e.status === "called").length;

  const completionRate = todayEntries.length > 0
    ? Math.round((todayCompleted / todayEntries.length) * 100) : 0;

  const cancellationRate = todayEntries.length > 0
    ? Math.round((todayCancelled / todayEntries.length) * 100) : 0;

  // ─── Weekly Data (last 7 days) ───
  const weeklyData = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const count = allQueue.filter((e) => parseDBDate(e.created_at).toDateString() === dateStr).length;
      days.push({ label: dayNames[d.getDay()], value: count });
    }
    return days;
  }, [allQueue]);

  const weeklyTotal = weeklyData.reduce((sum, d) => sum + d.value, 0);
  const weeklyAvg = Math.round(weeklyTotal / 7);

  // ─── Status Distribution ───
  const statusDistribution = useMemo(() => {
    const total = allQueue.length || 1;
    return [
      { label: "مكتمل", value: allQueue.filter((e) => e.status === "completed").length, color: "#10B981" },
      { label: "ملغي", value: allQueue.filter((e) => e.status === "cancelled").length, color: "#EF4444" },
      { label: "في الانتظار", value: allQueue.filter((e) => e.status === "waiting").length, color: "#F59E0B" },
      { label: "تمت المناداة", value: allQueue.filter((e) => e.status === "called").length, color: "#6C3CE1" },
    ];
  }, [allQueue]);

  // ─── Top Customers ───
  const topCustomers = useMemo(() => {
    const phoneMap = new Map<string, { name: string; phone: string; count: number }>();
    allQueue.forEach((e) => {
      if (e.customer_phone && e.customer_phone.length > 5) {
        const existing = phoneMap.get(e.customer_phone);
        if (existing) {
          existing.count++;
        } else {
          phoneMap.set(e.customer_phone, { name: e.customer_name, phone: e.customer_phone, count: 1 });
        }
      }
    });
    return Array.from(phoneMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [allQueue]);

  // ─── Peak Hours Data ───
  const peakHoursData = useMemo(() => {
    if (!stats?.peak_hours || stats.peak_hours.length === 0) return [];
    return stats.peak_hours.map((h) => ({
      label: `${h.hour}:00`,
      value: h.count,
    }));
  }, [stats]);

  const maxPeakVal = Math.max(...peakHoursData.map((d) => d.value), 1);

  // ─── Avg Service Time ───
  const avgServiceTime = useMemo(() => {
    const completed = allQueue.filter((e) => e.status === "completed" && e.called_at && e.completed_at);
    if (completed.length === 0) return null;
    const totalMinutes = completed.reduce((sum, e) => {
      const called = parseDBDate(e.called_at!);
      const done = parseDBDate(e.completed_at!);
      return sum + (done.getTime() - called.getTime()) / 60000;
    }, 0);
    return Math.round(totalMinutes / completed.length);
  }, [allQueue]);

  // ─── Recall Stats ───
  const recallStats = useMemo(() => {
    const withRecalls = allQueue.filter((e) => (e.recall_count ?? 0) > 0);
    return {
      total: withRecalls.length,
      avgRecalls: withRecalls.length > 0
        ? (withRecalls.reduce((sum, e) => sum + (e.recall_count ?? 0), 0) / withRecalls.length).toFixed(1)
        : "0",
    };
  }, [allQueue]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative mx-auto mb-4" style={{ width: 60, height: 60 }}>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
          </div>
          <p className="text-gray-400 text-sm">جاري تحميل الإحصائيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href={`/dashboard/shop/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
            <span className="text-xl">←</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{shop?.name || "المحل"}</h1>
            <p className="text-xs text-gray-400">الإحصائيات والتحليلات</p>
          </div>
        </div>

        {/* ─── Today's Key Metrics ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="card p-4 text-center">
            <span className="text-2xl block mb-1">📅</span>
            <p className="text-2xl font-black text-gray-900">{stats?.today_total || 0}</p>
            <p className="text-xs text-gray-400">إجمالي اليوم</p>
          </div>
          <div className="card p-4 text-center">
            <span className="text-2xl block mb-1">🟢</span>
            <p className="text-2xl font-black text-amber-600">{todayWaiting}</p>
            <p className="text-xs text-gray-400">في الانتظار</p>
          </div>
          <div className="card p-4 text-center">
            <span className="text-2xl block mb-1">✅</span>
            <p className="text-2xl font-black text-emerald-600">{todayCompleted}</p>
            <p className="text-xs text-gray-400">مكتمل</p>
          </div>
          <div className="card p-4 text-center">
            <span className="text-2xl block mb-1">❌</span>
            <p className="text-2xl font-black text-red-500">{todayCancelled}</p>
            <p className="text-xs text-gray-400">ملغي</p>
          </div>
          <div className="card p-4 text-center">
            <span className="text-2xl block mb-1">⭐</span>
            <p className="text-2xl font-black text-amber-500">{ratingData?.average?.toFixed(1) || "—"}</p>
            <p className="text-xs text-gray-400">تقييم الزبائن {ratingData?.count ? `(${ratingData.count})` : ""}</p>
          </div>
        </div>

        {/* ─── Completion Rate + Avg Wait ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Progress Ring */}
          <div className="card p-6 flex flex-col items-center justify-center relative">
            <ProgressRing percent={completionRate} label="معدل الإنجاز" sublabel="اليوم" color="#10B981" />
          </div>

          {/* Avg Wait */}
          <div className="card p-6 flex flex-col items-center justify-center">
            <span className="text-4xl mb-2">⏱️</span>
            <p className="text-3xl font-black text-amber-600">{stats?.avg_wait_minutes || 0}</p>
            <p className="text-sm text-gray-400 mt-1">متوسط الانتظار (دقيقة)</p>
          </div>

          {/* Avg Service */}
          <div className="card p-6 flex flex-col items-center justify-center">
            <span className="text-4xl mb-2">⚡</span>
            <p className="text-3xl font-black text-indigo-600">{avgServiceTime ?? "—"}</p>
            <p className="text-sm text-gray-400 mt-1">متوسط الخدمة (دقيقة)</p>
          </div>
        </div>

        {/* ─── Weekly Chart ─── */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">📊 آخر 7 أيام</h2>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>الإجمالي: <b className="text-gray-700">{weeklyTotal}</b></span>
              <span>المتوسط: <b className="text-gray-700">{weeklyAvg}</b>/يوم</span>
            </div>
          </div>
          <BarChart data={weeklyData} maxVal={Math.max(...weeklyData.map((d) => d.value), 1)} />
        </div>

        {/* ─── Peak Hours ─── */}
        {peakHoursData.length > 0 && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🕐 أوقات الذروة</h2>
            <BarChart data={peakHoursData} maxVal={maxPeakVal} />
          </div>
        )}

        {/* ─── Status Distribution ─── */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📈 توزيع الحالات</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statusDistribution.map((s) => (
              <div key={s.label} className="text-center">
                <div className="relative inline-block">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: `${s.color}15` }}>
                    <span className="text-xl font-black" style={{ color: s.color }}>{s.value}</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mt-2">{s.label}</p>
                <p className="text-xs text-gray-400">
                  {allQueue.length > 0 ? Math.round((s.value / allQueue.length) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Recall Stats ─── */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔄 إحصائيات إعادة النداء</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-xl bg-amber-50">
              <p className="text-3xl font-black text-amber-600">{recallStats.total}</p>
              <p className="text-sm text-amber-700 mt-1">عملاء أُعيد نداؤهم</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-purple-50">
              <p className="text-3xl font-black text-purple-600">{recallStats.avgRecalls}</p>
              <p className="text-sm text-purple-700 mt-1">متوسط مرات إعادة النداء</p>
            </div>
          </div>
        </div>

        {/* ─── Top Customers ─── */}
        {topCustomers.length > 0 && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">👥 أكثر العملاء تكراراً</h2>
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{c.name || "بدون اسم"}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  <div className="text-left">
                    <span className="text-lg font-black text-indigo-600">{c.count}</span>
                    <p className="text-xs text-gray-400">مرة</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Today Summary ─── */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📋 ملخص اليوم</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">إجمالي الزبائن</span>
              <span className="font-bold text-gray-900">{stats?.today_total || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">مكتمل</span>
              <span className="font-bold text-emerald-600">{todayCompleted}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">ملغي</span>
              <span className="font-bold text-red-500">{todayCancelled}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">في الانتظار</span>
              <span className="font-bold text-amber-600">{todayWaiting}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">تمت المناداة</span>
              <span className="font-bold text-indigo-600">{todayCalled}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">معدل الإنجاز</span>
              <span className="font-bold text-emerald-600">{completionRate}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">معدل الإلغاء</span>
              <span className="font-bold text-red-500">{cancellationRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
