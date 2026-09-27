# Sahil Drive — تطبيق الراكب (Web App)

تطبيق ويب بـ React + Vite + Tailwind متصل بـ Supabase. التسجيل والدخول بالإيميل الحقيقي، والموقع والخريطة والتسعير والرحلات من بيانات حية.

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local
```

ضع في `.env.local`:

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

يفتح على `http://localhost:5173` بعرض موبايل (max-width 430px).

## إعداد Supabase

1. أنشئ مشروعًا على supabase.com.
2. شغّل `supabase/schema.sql` في SQL Editor. ينشئ:
   - `profiles`, `wallets`, `wallet_txns`, `rides`, `ride_stops`, `saved_places`
   - `payment_methods`, `drivers`, `ride_types`, `promo_codes`
   - Trigger لبروفايل ومحفظة لكل مستخدم جديد
   - تعيين أقرب سائق متصل عند طلب الرحلة
   - Row Level Security
3. من Project Settings → API انسخ Project URL و anon public key إلى `.env.local`.
4. Authentication → Providers: فعّل Email. اختياريًا Google / Facebook / Apple.
5. Authentication → URL Configuration: أضف رابط التطبيق في Redirect URLs.

## ما يعمل فعليًا

- تسجيل / دخول / استعادة كلمة السر عبر Supabase Auth بالإيميل
- تحديد الموقع من GPS وعكس العنوان عبر OpenStreetMap Nominatim
- البحث عن الوجهة من خريطة حقيقية
- حساب المسار والمسافة والوقت عبر OSRM
- تسعير الرحلة حسب المسافة والمدة ونوع المركبة
- حفظ الرحلة والتوقفات والتقييم في جداول Supabase
- انتظار السائق عبر Realtime + polling
- محفظة وشحن رصيد وطرق دفع محفوظة
- جدولة رحلة بموعد حقيقي يُحفظ في `scheduled_at`

## هيكل المشروع

```
src/
  lib/supabase.js
  lib/geo.js
  context/AuthContext.jsx
  context/RideContext.jsx
  components/
  screens/
```
