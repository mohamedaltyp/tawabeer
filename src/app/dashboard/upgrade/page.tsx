"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const plans: Record<string, { name: string; price: string; icon: string }> = {
  basic: { name: "أساسي", price: "١٩٩", icon: "⭐" },
  pro: { name: "احترافية", price: "٣٩٩", icon: "💎" },
};

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan") || "basic";
  const plan = plans[planId] || plans.basic;
  const [phone, setPhone] = useState("");
  const [shopId, setShopId] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"info" | "confirm">("info");

  const handleSubmit = () => {
    if (!phone || !shopId) return;
    setMessage(
      `تم استلام طلبك للترقية إلى الباقة ${plan.name}!\n\n` +
        `📱 رقم المحل: ${shopId}\n` +
        `💳 المطلوب: ${plan.price} ج.م شهرياً\n\n` +
        `يرجى تحويل المبلغ على:\n` +
        `📱 فودافون كاش: ٠١٠٠٠٠٠٠٠٠ (محمد)\n` +
        `🏦 بنك مصر: ١٠٠٠-٢٠٠٠٠٠-٣٠٠\n\n` +
        `بعد التحويل، أرسل صورة الإيصال على واتساب ٠١٠٠٠٠٠٠٠٠\n` +
        `وسيتم تفعيل الباقة فوراً ✅`
    );
    setStep("confirm");
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 h-16">
          <Link href="/dashboard/pricing" className="text-sm text-gray-500 hover:text-gray-700">
            → العودة للباقات
          </Link>
          <span className="text-lg font-bold text-indigo-700">دورك</span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-12">
        {step === "info" ? (
          <>
            <div className="text-center mb-8">
              <span className="text-5xl block mb-4">{plan.icon}</span>
              <h1 className="text-2xl font-bold text-gray-900">ترقية إلى {plan.name}</h1>
              <p className="text-gray-500 mt-1">{plan.price} ج.م / شهرياً</p>
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم هاتف صاحب المحل *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: 0100xxxxxxx"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم المحل (ID) *</label>
                <input
                  type="text"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  placeholder="مثال: a1b2c3d4-..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-50"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!phone || !shopId}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg"
              >
                🚀 أريد الترقية
              </button>
              <p className="text-xs text-gray-400 text-center">
                سيتم توجيهك لتعليمات الدفع يدوياً عبر فودافون كاش
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm text-center">
            <span className="text-6xl block mb-4">🎉</span>
            <h2 className="text-xl font-bold text-gray-900 mb-4">خطوة أخيرة!</h2>
            <div className="rounded-xl bg-green-50 p-4 text-sm text-gray-700 mb-6 whitespace-pre-line text-right">
              {message}
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-2xl bg-indigo-600 px-8 py-3 text-white font-bold hover:bg-indigo-700 transition-all"
            >
              ← الرجوع للوحة التحكم
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  );
}
