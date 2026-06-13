# ملخّص التصليب الأمني — طوابير

نسخة احتياطية من الحالة قبل التعديل محفوظة في مجلد المخرجات
(`backups/tawabeer-pre-hardening-*.tar.gz`)، وفرع `backup/pre-hardening` في git.

## ثغرات حرجة أُغلقت

1. **إدارة الطابور كانت مفتوحة للعامة** — `PATCH /api/shops/[id]/queue`
   (نداء التالي / إنهاء / إلغاء) لم يكن عليها أي تحقق. الآن تتطلب `requireOwner`.
2. **`PATCH /api/shops/[id]/whatsapp-settings` كانت مفتوحة** — أي أحد يقدر يغيّر
   توكن واتساب لأي محل. الآن تتطلب `requireOwner`.
3. **كلمة مرور أدمن مثبتة في الكود** (`dawer-admin-2026`) في 6+ ملفات خادم
   وفي واجهة الأدمن — أُزيلت بالكامل؛ تأتي الآن من `ADMIN_PASSWORD` فقط (fail-closed).
4. **مفتاح VAPID الخاص مثبت في الكود** — أُزيل؛ يأتي من البيئة فقط.

## تحسينات المصادقة

- نظام جلسات جديد (`src/lib/session.ts`): توكن HMAC-SHA256 موقّع داخل كوكي
  httpOnly / SameSite=Lax / Secure في الإنتاج. مدة 14 يوماً.
- مسارات `/api/auth/login` (تصدر الكوكي), `/api/auth/logout`, `/api/auth/session`.
- `requireOwner` و `requireAdmin` و `getAdminPassword` في `src/lib/auth.ts`.
- الواجهة لم تعد تخزّن كلمة المرور (كانت في sessionStorage) ولا ترسلها في روابط URL.

## تصليبات أخرى

- إيقاف تسريب `stack trace` ورسائل الأخطاء الخام من `GET/POST /api/shops`.
- تحقق سرّ webhook تيليجرام عبر `TELEGRAM_WEBHOOK_SECRET` (عند ضبطه).
- إصلاح تعارض دمج غير محلول في `.gitignore`، ومنع تسريب `.env`، مع `.env.example`.
- توحيد قاعدة البيانات على `DATABASE_URL` (تعمل محلياً وعلى Vercel). `better-sqlite3`
  تبعية ميتة غير مستخدمة (يمكن إزالتها لاحقاً).

## يُنصح به لاحقاً (دين متبقٍّ)

- نقل الـ rate limiting من الذاكرة إلى مخزن مشترك (Upstash/Redis) ليعمل على
  Vercel serverless بفعالية.
- تنظيف تحذيرات ESLint (أنواع `any`، setState داخل useEffect) — حالياً البناء
  لا يتوقف عليها (`eslint.ignoreDuringBuilds`) بينما يبقى فحص TypeScript صارماً.
- تكامل دفع فعلي بدل التفعيل اليدوي.
- تقسيم `src/lib/db.ts` (1000+ سطر) إلى وحدات.
