"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50">
          <span className="text-5xl">⚠️</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">حدث خطأ غير متوقع</h1>

        {/* Message */}
        <p className="mt-3 text-gray-500 leading-relaxed">
          يبدو أن هناك مشكلة في تحميل الصفحة. لا تقلق، يمكنك المحاولة مرة أخرى.
        </p>

        {/* Error details (dev only) */}
        {error.message && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-right">
            <p className="text-sm font-medium text-red-700">تفاصيل الخطأ:</p>
            <p className="mt-1 text-xs text-red-500 font-mono" dir="ltr">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
          >
            🔄 حاول مرة أخرى
          </button>
          <a
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            🏠 العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
