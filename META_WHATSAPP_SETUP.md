# 🔑 خطوات جلب Meta WhatsApp Cloud API Credentials

## الخطوة 1: Meta Business Account
1. افتح `https://business.facebook.com`
2. سجل دخول بحسابك على فيسبوك
3. أنشئ Meta Business Account لو مش موجود

## الخطوة 2: Meta App
1. افتح `https://developers.facebook.com`
2. اضغط "My Apps" → "Create App"
3. اختار "Business" → اسم التطبيق (مثلاً: "Tawabeer WhatsApp")
4. اضغط "Create App"

## الخطوة 3: تفعيل WhatsApp
1. في الـ App Dashboard، اضغط "Add Products"
2. اختار "WhatsApp" → "Set Up"
3. اختار Meta Business Account بتاعك

## الخطوة 4: جلب البيانات
### ACCESS_TOKEN:
1. في WhatsApp → Getting Started
2. هتشوف "Temporary Access Token" — انسخه
3. **ملاحظة:** التوكن ده مؤقت (24 ساعة)
4. عشان تعمل permanent token:
   - افتح `https://developers.facebook.com/tools/explorer/`
   - اختار الـ App بتاعك
   - اختار "WhatsApp Business Management"
   - اضغط "Generate Access Token"

### PHONE_NUMBER_ID:
1. في WhatsApp → Getting Started
2. هتشوف "Phone Number ID" — انسخه
3. ده الرقم اللي بيتعمله send messages

## الخطوة 5: إضافة رقم الواتساب
1. في WhatsApp → Getting Started
2. اضغط "Add phone number"
3. أضف رقم الواتساب بتاعك (مثلاً: 01017603874)
4. تأكد من الرقم عبر SMS أو_call

## الخطوة 6: إدخال البيانات في Tawabeer
1. افتح Dashboard → Settings → إعدادات واتساب
2. حط ACCESS_TOKEN في حقل "توكن الواتساب"
3. حط PHONE_NUMBER_ID في حقل "Phone Number ID"
4. اضغط حفظ

## اختبار الإرسال
```bash
# اختبار من Terminal
curl -X POST "https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "201017603874",
    "type": "text",
    "text": {"body": "🎉 اختبار من Tawabeer!"}
  }'
```

## ملاحظات مهمة
- التوكن المؤقت بيعمل لمدة 24 ساعة بس
- عشان تعمل permanent token، لازم تستخدم App Dashboard
- رقم الواتساب لازم يكون registered على WhatsApp Business
- أول 1,000 محادثة/شهر مجانية
