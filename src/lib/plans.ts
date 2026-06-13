// ─── Plan Definitions & Limits ───

export type Plan = "free" | "basic" | "pro" | "enterprise";

export interface PlanLimits {
  maxShops: number;
  maxDailyCustomers: number;
  features: string[];
  pricePerMonth: number; // EGP
  pricePerMonthUSD: number;
  popular?: boolean;
}

export const PLANS: Record<Plan, PlanLimits> = {
  free: {
    maxShops: 1,
    maxDailyCustomers: 50,
    features: [
      "محل واحد",
      "إشعارات المتصفح",
      "QR كود",
      "إحصائيات أساسية",
      "دعم عبر البريد الإلكتروني",
    ],
    pricePerMonth: 0,
    pricePerMonthUSD: 0,
  },
  basic: {
    maxShops: 3,
    maxDailyCustomers: 200,
    features: [
      "حتى ٣ محلات",
      "إشعارات المتصفح",
      "QR كود مخصص",
      "إحصائيات متقدمة",
      "تقارير PDF أسبوعية",
      "إشعارات واتساب",
      "دعم عبر واتساب",
    ],
    pricePerMonth: 199,
    pricePerMonthUSD: 10,
    popular: true,
  },
  pro: {
    maxShops: 10,
    maxDailyCustomers: 1000,
    features: [
      "حتى ١٠ محلات",
      "إشعارات المتصفح",
      "QR كود مخصص قابل للطباعة",
      "إحصائيات متقدمة",
      "تقارير PDF + Excel",
      "إشعارات واتساب",
      "اسم نطاق مخصص",
      "API للربط الخارجي",
      "دعم فني فوري",
    ],
    pricePerMonth: 399,
    pricePerMonthUSD: 20,
  },
  enterprise: {
    maxShops: 999,
    maxDailyCustomers: 99999,
    features: [
      "محلات غير محدود",
      "كل ميزات الاحترافية +",
      "White-Label (بدون علامة طوابير)",
      "لوحة تحكم مركزية لكل الفروع",
      "مديرين منفصلين لكل فرع",
      "API مخصص",
      "تكامل مع أنظمتك الحالية",
      "دعم فني مخصص 24/7",
      "عقد سنوي",
    ],
    pricePerMonth: 999,
    pricePerMonthUSD: 50,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLANS[plan as Plan] || PLANS.free;
}

export function isPlanFeatureEnabled(plan: string, feature: string): boolean {
  const limits = getPlanLimits(plan);
  return limits.features.some(
    (f) => f.includes(feature) || feature.includes(f)
  );
}

export function canCreateShop(plan: string, currentShopCount: number): boolean {
  const limits = getPlanLimits(plan);
  return currentShopCount < limits.maxShops;
}

export function canAcceptCustomer(
  plan: string,
  todayCustomerCount: number
): boolean {
  const limits = getPlanLimits(plan);
  return todayCustomerCount < limits.maxDailyCustomers;
}

export function getPlanBadgeColor(plan: string): string {
  switch (plan) {
    case "basic":
      return "bg-blue-100 text-blue-700";
    case "pro":
      return "bg-purple-100 text-purple-700";
    case "enterprise":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

export function getPlanBadgeText(plan: string): string {
  switch (plan) {
    case "free":
      return "مجاني";
    case "basic":
      return "أساسي";
    case "pro":
      return "احترافية";
    case "enterprise":
      return "مؤسسات";
    default:
      return plan;
  }
}
