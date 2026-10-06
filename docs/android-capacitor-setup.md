# إعداد Sahil Drive كتطبيق Android عبر Capacitor

## ما تم تجهيزه

- Capacitor `8.5.2`
- Package ID: `com.sahildrive.app`
- اسم التطبيق: `Sahil Drive`
- Android SDK و`targetSdkVersion`: `36`
- صلاحيات الموقع الدقيق والتقريبي، الإنترنت، الاهتزاز، وإشعارات Android.
- أوامر مزامنة وبناء Android داخل `package.json`.
- إعداد توقيع اختياري عبر ملف محلي غير مرفوع إلى Git.

## تشغيل التطوير

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

يفتح الأمر الأخير المشروع في Android Studio. بعد ذلك يمكن اختيار جهاز أو محاكي ثم الضغط على **Run**.

## بناء APK تجريبي

```bash
npm run android:build
```

الناتج:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## إعداد توقيع الإصدار

أنشئ مفتاح رفع خاصًا بك، ولا ترفعه إلى GitHub:

```bash
keytool -genkeypair -v \\
  -keystore sahildrive-upload.jks \\
  -alias sahildrive-upload \\
  -keyalg RSA -keysize 4096 -validity 10000
```

ثم أنشئ الملف:

```text
android/keystore.properties
```

باستخدام النموذج الموجود في:

```text
keystore.properties.example
```

يجب أن يحتوي الملف المحلي على:

```properties
storeFile=/absolute/path/to/sahildrive-upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=sahildrive-upload
keyPassword=YOUR_KEY_PASSWORD
```

تمت إضافة `android/keystore.properties` وملفات `.jks` و`.keystore` إلى `.gitignore`.

## بناء AAB الخاص بـ Google Play

بعد إعداد `android/keystore.properties`:

```bash
npm run android:bundle
```

الناتج:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## ملاحظات مهمة

- لا تغيّر `com.sahildrive.app` بعد إنشاء التطبيق في Play Console.
- احتفظ بنسخة احتياطية من ملف `.jks` وكلمات المرور؛ فقدان مفتاح التوقيع يسبب مشاكل في تحديث التطبيق.
- يجب إعداد Google OAuth لعميل Android وإضافة SHA-1/SHA-256 لشهادة التوقيع.
- يجب إضافة سياسة الخصوصية وحذف الحساب قبل النشر.
- يجب تعبئة نموذج أمان البيانات في Play Console.
- إذا كان حساب Play Console شخصيًا جديدًا، يلزم اختبار مغلق وفق متطلبات Google قبل الإصدار العلني.
