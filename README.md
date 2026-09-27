# Sahil Drive — تطبيق الراكب (Web App)

تطبيق ويب مبني بـ React + Vite + Tailwind، متصل بـ Supabase، يغطي شاشات الراكب:
تسجيل الدخول/الحساب، نسيان كلمة السر، الشاشة الرئيسية، تحديد الوجهة، اختيار الرحلة،
تأكيد الرحلة، البحث عن سائق، متابعة الرحلة، التقييم، المحفظة، وجدولة الرحلات.

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local   # وحطّ فيه بيانات مشروع Supabase بتاعك
npm run dev
```

هيفتح على `http://localhost:5173` — التصميم متظبط لعرض الموبايل (max-width 430px)
وهيفضل شكله مضبوط لو فتحته على شاشة موبايل حقيقية أو Responsive mode في المتصفح.

## إعداد Supabase

1. اعمل مشروع جديد على [supabase.com](https://supabase.com).
2. روح على **SQL Editor** وشغّل محتوى ملف `supabase/schema.sql` — ده هيعمل:
   - جداول: `profiles`, `wallets`, `rides`, `ride_stops`, `saved_places`,
     `payment_methods`, `drivers`, `promo_codes`
   - Trigger بيعمل بروفايل ومحفظة تلقائيًا لكل مستخدم جديد
   - Row Level Security عشان كل راكب يشوف بياناته بس
3. من **Project Settings → API** خد الـ `Project URL` والـ `anon public key`
   وحطهم في `.env.local`.
4. (اختياري) اعمل Edge Functions باسم `send-otp` و `verify-otp` لإرسال
   كود تحقق عبر SMS من مزود مصري (مثل Vodafone SMS Gateway أو Taqnyat) —
   دلوقتي الكود عامل استدعاء لهم جاهز في `src/context/AuthContext.jsx`.

## هيكل المشروع

```
src/
  lib/supabase.js          إعداد عميل Supabase
  context/AuthContext.jsx  تسجيل الدخول/الحساب وإدارة الجلسة
  context/RideContext.jsx  حالة حجز الرحلة (نقطة الانطلاق، الوجهة، نوع الرحلة...)
  components/              مكونات مشتركة (أزرار، حقول إدخال، أيقونات، خريطة)
  screens/
    onboarding/            شاشة البداية + الترحيب
    auth/                   تسجيل الدخول، إنشاء حساب، استرجاع كلمة السر
    home/                   الرئيسية، تحديد الوجهة، التوقفات، اختيار/تأكيد الرحلة
    trip/                   البحث عن سائق، تأكيد الالتقاء، متابعة الرحلة، التقييم
    wallet/                 المحفظة وطرق الدفع
    schedule/               جدولة رحلة لاحقًا
```

## ملاحظات مهمة قبل الإنتاج

- **الخريطة**: `MapView.jsx` حاليًا شكل توضيحي فقط. استبدله بـ Google Maps
  (`@react-google-maps/api`) أو Mapbox GL مع مفتاح API حقيقي ومواقع lat/lng فعلية.
- **الدفع**: أضف فودافون كاش وإنستاباي كطرق دفع أساسية (الأكثر استخدامًا في مصر)
  بجانب النقدي والبطاقات، عن طريق بوابة دفع محلية (مثل Paymob أو Fawry).
- **تتبع السائق اللحظي**: استخدم Supabase Realtime (`supabase.channel(...)`)
  للاستماع لتحديثات موقع السائق وحالة الرحلة بدل الـ `setTimeout` التجريبي
  الموجود في `FindingDriver.jsx`.
- **OTP فعلي**: لازم مزود SMS مصري مربوط بـ Edge Functions بدل الكود التجريبي.
- **الترخيص**: التشغيل الفعلي في القليوبية محتاج تسجيل رسمي لدى هيئة تنظيم
  النقل البري قبل الإطلاق.
