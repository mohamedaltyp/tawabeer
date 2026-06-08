"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="w-full max-w-md text-center">
        {/* Offline Icon */}
        <div className="relative mx-auto mb-6">
          <span className="block text-[10rem] font-black leading-none text-amber-100 select-none">
            📡
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">أنت غير متصل بالإنترنت</h1>

        {/* Message */}
        <p className="mt-3 text-gray-500 leading-relaxed">
          يبدو أنك فقدت الاتصال بالإنترنت. تحقق من اتصالك بالشبكة وحاول مرة أخرى.
        </p>

        {/* Offline Features */}
        <div className="mt-6 rounded-xl bg-amber-50 p-4 border border-amber-100">
          <p className="text-sm text-amber-700 font-medium mb-2">💡 يمكنك:</p>
          <ul className="text-sm text-amber-600 space-y-1">
            <li>• تصفح الصفحات المحفوظة مسبقاً</li>
            <li>• عرض آخر بيانات تم تحميلها</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
          >
            🔄 إعادة المحاولة
          </button>
          <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            🏠 العودة للرئيسية
          </Link>
        </div>

        {/* Fun suggestion */}
        <p className="mt-8 text-xs text-gray-400">
          💡 جرّب الاتصال بالإنترنت وسنعمل تلقائياً
        </p>
      </div>
    </div>
  );
}
