# طوابير (Tawabeer)

نظام إدارة طوابير وحجوزات للمحلات — يبني على Next.js 16 و React 19 و Postgres (Neon).
المالك يدير الطوابير والشبابيك والحجوزات، والزبون يحجز دوره ويصله إشعار (متصفح / واتساب / تيليجرام).

> **هذا الإصدار خضع لتصليب أمني شامل.** راجع `HARDENING.md` لتفاصيل ما تغيّر.

---

## ⚠️ مطلوب قبل أي شيء: تدوير الأسرار المكشوفة

القيم التالية كانت مكشوفة في الكود سابقاً ويجب تغييرها فوراً:

1. **كلمة مرور قاعدة بيانات Neon** — غيّرها من لوحة Neon ثم حدّث `DATABASE_URL` / `POSTGRES_URL`.
2. **مفاتيح VAPID** — أنشئ زوجاً جديداً: `npx web-push generate-vapid-keys`.
3. `SESSION_SECRET` و `ADMIN_PASSWORD` — تم توليدهما تلقائياً في `.env.local` (يمكنك تغييرهما).

---

## التشغيل محلياً

المتطلبات: Node.js 20+.

```bash
# 1) ثبّت الحزم
npm install

# 2) جهّز متغيرات البيئة
cp .env.example .env.local
#   ثم املأ القيم. لتوليد مفتاح جلسة قوي:
openssl rand -base64 48        # ضعه في SESSION_SECRET
#   ولمفاتيح VAPID:
npx web-push generate-vapid-keys

# 3) شغّل خادم التطوير
npm run dev
```

افتح http://localhost:3000

> قاعدة البيانات: المشروع يستخدم `DATABASE_URL` (Postgres/Neon) **محلياً وعلى Vercel بنفس الكود**.
> أبسط إعداد: استخدم نفس رابط Neon السحابي محلياً (يعمل عبر HTTPS بلا إعداد إضافي).

### الحسابات
- لوحة المالك: `/dashboard` (تسجيل دخول برقم الهاتف + كلمة المرور).
- لوحة المشرف: `/admin` (كلمة المرور = `ADMIN_PASSWORD`).

---

## النشر على Vercel

1. اربط المستودع بمشروع Vercel.
2. في Project → Settings → Environment Variables أضِف نفس مفاتيح `.env.example`:
   `SESSION_SECRET`, `ADMIN_PASSWORD`, `DATABASE_URL`, `POSTGRES_URL`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
   و(اختياري) `BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
3. `SESSION_SECRET` **إلزامي في الإنتاج** — التطبيق يرفض العمل بدونه (fail-closed).
4. انشر. الترحيلات (migrations) تُنشأ تلقائياً عند أول طلب.

---

## الأوامر

```bash
npm run dev      # تطوير
npm run build    # بناء إنتاجي (يفحص TypeScript)
npm run start    # تشغيل البناء
npm run lint     # ESLint (يكشف دين الجودة المتبقي)
```

---

## نموذج المصادقة

- تسجيل الدخول يصدر **كوكي جلسة موقّع httpOnly** (`tawabeer_session`) — لا تُرسل كلمة المرور مع كل طلب ولا تُخزَّن في المتصفح.
- كل مسار يعدّل بيانات يتحقق من ملكية المحل عبر `requireOwner`، ومسارات الإدارة عبر `requireAdmin`.
- الأسرار كلها من متغيرات البيئة فقط (لا قيم مثبتة في الكود).
