"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// دالة مساعدة — تحويل التاريخ من UTC للوقت المحلي صح
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

export default function StatsPage() {
  const { id } = useParams<{ id: string }>();
  const [shop, setShop] = useState<{ name: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [allQueue, setAllQueue] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/shops/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setShop(d.shop);
          setStats(d.stats);
          setAllQueue(d.allQueue || []);
        }
      });
  }, [id]);

  const todayCompleted = allQueue.filter(
    (e: any) => e.status === "completed" && parseDBDate(e.created_at).toDateString() === new Date().toDateString()
  ).length;
  const todayCancelled = allQueue.filter(
    (e: any) => e.status === "cancelled" && parseDBDate(e.created_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href={`/dashboard/shop/${id}`} className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{shop?.name || "المحل"}</h1>
            <p className="text-xs text-gray-400">الإحصائيات</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center shadow-sm">
            <span className="text-3xl block mb-2">🟢</span>
            <p className="text-3xl font-black text-gray-900">{stats?.waiting || 0}</p>
            <p className="text-sm text-gray-400 mt-1">في الانتظار الآن</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center shadow-sm">
            <span className="text-3xl block mb-2">📅</span>
            <p className="text-3xl font-black text-gray-900">{stats?.today_total || 0}</p>
            <p className="text-sm text-gray-400 mt-1">إجمالي اليوم</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center shadow-sm">
            <span className="text-3xl block mb-2">✅</span>
            <p className="text-3xl font-black text-emerald-600">{todayCompleted}</p>
            <p className="text-sm text-gray-400 mt-1">مكتمل اليوم</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center shadow-sm">
            <span className="text-3xl block mb-2">⏱️</span>
            <p className="text-3xl font-black text-amber-600">{stats?.avg_wait_minutes || 0}</p>
            <p className="text-sm text-gray-400 mt-1">متوسط الانتظار (دق)</p>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🕐 أوقات الذروة</h2>
          {stats?.peak_hours && stats.peak_hours.length > 0 ? (
            <div className="space-y-3">
              {stats.peak_hours.map((h) => (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-medium text-gray-500">{h.hour}:00</span>
                  <div className="flex-1 h-6 rounded-full bg-indigo-50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600"
                      style={{
                        width: `${Math.min(100, (h.count / Math.max(...stats.peak_hours.map((x) => x.count))) * 100)}%`,
                      }}
                    ></div>
                  </div>
                  <span className="w-8 text-sm font-bold text-gray-700">{h.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">لا توجد بيانات كافية بعد</p>
          )}
        </div>

        {/* Today Summary */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📋 ملخص اليوم</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">إجمالي الزبائن</span>
              <span className="font-bold text-gray-900">{stats?.today_total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">مكتمل</span>
              <span className="font-bold text-emerald-600">{todayCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ملغي</span>
              <span className="font-bold text-red-500">{todayCancelled}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">معدل الإنجاز</span>
              <span className="font-bold text-indigo-600">
                {stats?.today_total && stats.today_total > 0
                  ? `${Math.round((todayCompleted / stats.today_total) * 100)}%`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
