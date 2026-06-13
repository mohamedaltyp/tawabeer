"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PricingPage() {
  const router = useRouter();

  const plans = [
    {
      id: "free",
      name: "مجاني",
      price: "مجاناً",
      period: "دائماً",
      icon: "🆓",
      color: "bg-gray-50 border-gray-200",
      badge: "",
      features: [
        "✅ محل واحد",
        "✅ حتى ٥٠ زبون يومياً",
        "✅ إشعارات المتصفح",
        "✅ QR كود",
        "✅ إحصائيات أساسية",
      ],
      cta: "ابدأ مجاناً",
      popular: false,
    },
    {
      id: "basic",
      name: "أساسي",
      price: "١٩٩",
      period: "شهرياً",
      icon: "⭐",
      color: "bg-blue-50 border-blue-200 ring-2 ring-blue-400",
      badge: "الأكثر طلباً",
      features: [
        "✅ حتى ٣ محلات",
        "✅ حتى ٢٠٠ زبون يومياً",
        "✅ إشعارات المتصفح + واتساب",
        "✅ QR كود مخصص لكل محل",
        "✅ إحصائيات متقدمة",
        "✅ تقارير PDF أسبوعية",
        "✅ دعم عبر واتساب",
      ],
      cta: "اشترك الآن",
      popular: true,
    },
    {
      id: "pro",
      name: "احترافية",
      price: "٣٩٩",
      period: "شهرياً",
      icon: "💎",
      color: "bg-purple-50 border-purple-200",
      badge: "",
      features: [
        "✅ حتى ١٠ محلات",
        "✅ زبائن غير محدود",
        "✅ كل ميزات الأساسي +",
        "✅ اسم نطاق مخصص",
        "✅ تقارير Excel + PDF",
        "✅ API للربط الخارجي",
        "✅ دعم فني فوري",
      ],
      cta: "اشترك الآن",
      popular: false,
    },
    {
      id: "enterprise",
      name: "مؤسسات",
      price: "٩٩٩",
      period: "شهرياً",
      icon: "🏢",
      color: "bg-amber-50 border-amber-200",
      badge: "",
      features: [
        "✅ محلات غير محدود",
        "✅ زبائن غير محدود",
        "✅ White-Label (بدون علامة طوابير)",
        "✅ لوحة تحكم مركزية",
        "✅ مديرين لكل فرع",
        "✅ تكامل مع أنظمتك",
        "✅ دعم 24/7",
      ],
      cta: "تواصل معنا",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-700">طوابير</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-all"
          >
            ← الرجوع للوحة التحكم
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">💰 الباقات والأسعار</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            اختر الباقة المناسبة لمحلك — ابدأ مجاناً وطور عملك مع المزيد من المميزات
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 ${plan.color} transition-all hover:shadow-lg ${
                plan.popular ? "scale-105" : ""
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                  {plan.badge}
                </div>
              )}
              <div className="text-center mb-6">
                <span className="text-4xl block mb-2">{plan.icon}</span>
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500 mr-1">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-gray-600">
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  if (plan.id === "enterprise") {
                    // TODO: replace with actual contact
                    window.location.href = "mailto:contact@dawer.app?subject=مؤسسات";
                  } else if (plan.id === "free") {
                    router.push("/dashboard");
                  } else {
                    router.push(`/dashboard/upgrade?plan=${plan.id}`);
                  }
                }}
                className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${
                  plan.popular
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg"
                    : plan.id === "free"
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    : "bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-300"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Payment Info */}
        <div className="mt-12 rounded-2xl bg-white border border-gray-100 p-6 text-center max-w-lg mx-auto">
          <h3 className="font-bold text-gray-900 mb-4">💳 طرق الدفع المتاحة</h3>
          <PaymentMethodsList />
        </div>
      </section>
    </div>
  );
}

// ─── Payment Methods List ───
function PaymentMethodsList() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payment-methods", { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((d) => setMethods(d.methods || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400">جاري التحميل...</p>;

  return (
    <>
      <div className="space-y-2 text-right">
        {methods.map((m) => (
          <div key={m.id} className="rounded-xl bg-gray-50 p-3 border border-gray-100 flex items-center gap-3">
            <span className="text-2xl">{m.icon || "💳"}</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-gray-900">{m.name}</p>
              <p className="text-xs text-gray-500">{m.details}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4">
        * بعد التحويل، تواصل معانا عشان نفعل الباقة فوراً
      </p>
    </>
  );
}
