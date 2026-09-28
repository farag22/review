# Sahil Drive — تطبيق الراكب والكابتن (Web App)

تطبيق ويب بـ React + Vite + Tailwind متصل بـ Supabase. التسجيل والدخول بالإيميل الحقيقي، والموقع والخريطة والتسعير والرحلات من بيانات حية. يشمل واجهة راكب وواجهة كابتن.

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
   - `payment_methods`, `drivers` (مع `user_id` لربط حساب الكابتن), `ride_types`, `promo_codes`
   - Trigger لبروفايل ومحفظة، وإنشاء صف سائق عند `role=captain`
   - سياسات RLS للراكب والكابتن (قبول الرحلات المعلقة وتحديث حالتها)
   - إن كان المشروع قديماً شغّل أيضاً `supabase/captain.sql`
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
- انتظار السائق عبر Realtime + polling حتى يقبل كابتن الطلب
- محفظة وشحن رصيد وطرق دفع محفوظة
- جدولة رحلة بموعد حقيقي يُحفظ في `scheduled_at`
- واجهة كابتن: تسجيل / دخول مربوط بجدول `drivers`
- تبديل `is_online` وتحديث `lat, lng` على خريطة Leaflet
- عرض الطلبات المعلقة المطابقة لـ `ride_type` وقبولها (`accepted`)
- إدارة الرحلة النشطة: وصول → بدء → إنهاء مع حساب المسافة والتكلفة

## هيكل المشروع

```
src/
  lib/supabase.js
  lib/geo.js
  context/AuthContext.jsx
  context/RideContext.jsx
  context/CaptainContext.jsx
  components/
  screens/
  screens/captain/
```

مسارات الكابتن: `/captain/signin` · `/captain/signup` · `/captain/dashboard` · `/captain/ride`

مسارات الإدارة: `/admin/signin` · `/admin/dashboard`

لتعيين حساب أدمن بعد التسجيل شغّل في SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```
