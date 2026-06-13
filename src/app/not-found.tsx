import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="w-full max-w-md text-center">
        {/* 404 Number */}
        <div className="relative mx-auto mb-6">
          <span className="block text-[10rem] font-black leading-none text-indigo-100 select-none">
            404
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-6xl">
            🔍
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">الصفحة غير موجودة</h1>

        {/* Message */}
        <p className="mt-3 text-gray-500 leading-relaxed">
          يبدو أن الصفحة التي تبحث عنها لم تعد موجودة أو تم نقلها إلى مكان آخر.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
          >
            🏠 العودة للرئيسية
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Icon name="chart" size={16} className="inline -mt-0.5" /> لوحة التحكم
          </Link>
        </div>

        {/* Fun suggestion */}
        <p className="mt-8 text-xs text-gray-400">
          <Icon name="bulb" size={14} className="inline -mt-0.5" /> ربما تحاول البحث عن محل في الصفحة الرئيسية؟
        </p>
      </div>
    </div>
  );
}
