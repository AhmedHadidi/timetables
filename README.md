# نظام إدارة المناوبات الذكي

نظام ويب لإدارة جداول المناوبات بمحرك دوران ذكي، مبني بـ **React + TypeScript + Vite**، بقاعدة بيانات **Supabase** وجاهز للنشر على **Vercel**.

## المزايا

- محرك دوران ثابت: ٥ مساء ← يومان إجازة ← ٥ صباح ← يومان إجازة
- المساء موظف واحد فقط يوميًا، بفترات ٥ أيام متتالية إجبارية
- استمرارية المناوبة عبر الأشهر (من لم يُكمل فترته يُكملها الشهر التالي)
- قيود لكل موظف: صباح فقط، مساء فقط، لا نهاية أسبوع، دوام رسمي، إجازة سنوية، دورة تدريبية
- توليد شهري بالتقويم الميلادي مع تحكّم بيوم بداية الدوران وأول مناوب مساء
- إحصائيات وعدالة وتنبيهات ذكية
- تصدير Excel / PDF / طباعة
- مصادقة بالبريد وكلمة المرور، وبيانات مخزّنة في السحابة

---

## المتطلبات

- Node.js 18 أو أحدث
- حساب [GitHub](https://github.com)
- حساب [Supabase](https://supabase.com) (مجاني)
- حساب [Vercel](https://vercel.com) (مجاني)

---

## الخطوة ١: إعداد Supabase

1. أنشئ مشروعًا جديدًا في [supabase.com](https://supabase.com) → **New project**.
2. انتظر اكتمال التهيئة، ثم افتح **SQL Editor** → **New query**.
3. الصق محتوى ملف `supabase/schema.sql` بالكامل واضغط **Run**. يُنشئ هذا الجداول وسياسات الأمان وبيانات أولية.
4. من **Project Settings → API** انسخ:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
5. من **Authentication → Providers → Email** تأكد أن **Email** مُفعّل، وعطّل **Confirm email** (لأن الحساب يُنشأ يدويًا).
6. **أنشئ حساب المدير الوحيد:** من **Authentication → Users → Add user** أدخل:
   - Email: `seebawy19@gmail.com`
   - Password: (كلمة مرور قوية من اختيارك)
   - فعّل **Auto Confirm User**.
   هذا هو الحساب الوحيد المصرَّح له بالتعديل. لتغيير هذا البريد لاحقًا عدّل `ADMIN_EMAIL` في `src/lib/config.ts`.

### نموذج الوصول

- **الصفحة الرئيسية عامة:** أي زائر يفتح الرابط يرى الجدول والإحصائيات في **وضع العرض فقط** — بلا أي إمكانية تعديل.
- **زر «🔑 تسجيل دخول الإدارة»** في الأعلى يفتح صفحة الدخول.
- **المدير فقط** (بالبريد أعلاه) تظهر له أدوات: إنشاء الجدول، تعديل الخلايا، إضافة/حذف الموظفين، الإعدادات.
- **التسجيل مقفل نهائيًا** — لا يمكن إنشاء حسابات من داخل التطبيق.

---

## الخطوة ٢: التشغيل محليًا (اختياري)

```bash
# ثبّت الحزم
npm install

# أنشئ ملف البيئة
cp .env.example .env
# ثم عدّل .env وضع قيم Supabase الحقيقية

# شغّل خادم التطوير
npm run dev
```

افتح `http://localhost:5173`، أنشئ حسابًا، وسجّل الدخول.

---

## الخطوة ٣: الرفع إلى GitHub

```bash
git init
git add .
git commit -m "أول إصدار: نظام المناوبات"
git branch -M main
# أنشئ مستودعًا فارغًا في GitHub ثم:
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

> ملاحظة: ملف `.gitignore` يمنع رفع `.env` و`node_modules` — لا تضع مفاتيحك في المستودع.

---

## الخطوة ٤: النشر على Vercel

1. ادخل [vercel.com](https://vercel.com) → **Add New → Project**.
2. اختر مستودع GitHub الذي رفعته. سيكتشف Vercel أنه مشروع **Vite** تلقائيًا.
3. في **Environment Variables** أضف:
   | المفتاح | القيمة |
   |---|---|
   | `VITE_SUPABASE_URL` | رابط مشروع Supabase |
   | `VITE_SUPABASE_ANON_KEY` | مفتاح anon public |
4. اضغط **Deploy**. بعد دقائق سيكون النظام على رابط `https://your-app.vercel.app`.

> عند كل `git push` جديد، ينشر Vercel التحديث تلقائيًا.

---

## هيكل المشروع

```
shift-app/
├── index.html
├── package.json
├── vite.config.ts
├── vercel.json
├── supabase/
│   └── schema.sql          # مخطط قاعدة البيانات
└── src/
    ├── main.tsx
    ├── App.tsx             # الجذر: مصادقة + تبويبات + ربط البيانات
    ├── types/index.ts      # أنواع TypeScript
    ├── lib/
    │   ├── engine.ts       # محرك الجدولة (منطق الدوران والقيود)
    │   ├── supabase.ts     # عميل Supabase
    │   ├── api.ts          # قراءة/كتابة البيانات
    │   ├── useAuth.ts      # خطاف المصادقة
    │   └── exporters.ts    # تصدير Excel/PDF
    ├── pages/
    │   └── Login.tsx
    └── components/
        ├── TopBar.tsx
        ├── ScheduleView.tsx
        ├── EmployeesView.tsx
        ├── StatsView.tsx
        ├── Flash.tsx
        └── ui.tsx
```

---

## ملاحظات

- **المحرك** (`src/lib/engine.ts`) مستقل تمامًا ويمكن اختباره أو نقله للخادم لاحقًا.
- **العدالة**: مع الموظفين المقيّدين (صباح فقط/مساء فقط) قد تقل نسبة العدالة لأسباب تشغيلية طبيعية، والنظام يُظهر ذلك كتنبيه لا كخطأ.
- **الاستمرارية بين الأشهر**: ولّد الأشهر بالترتيب (يوليو ثم أغسطس…) ليربط النظام بينها عبر جدول `carryovers`.
