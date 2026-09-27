# طرح رفع مشکل رنگ پس‌زمینه و متن فیلدهای ورودی هنگام انتخاب (Focus / Hover / Autofill)

## ۱. علت بروز مشکل
در مودال ورود به تلگرام (`TelegramLoginModal.tsx`) و مودال احراز هویت وب (`WebAppAuthModal.tsx`)، برای فیلدهای ورودی (`input` و `textarea`) از کلاس‌های `bg-slate-50 hover:bg-white focus:bg-white dark:bg-zinc-800` به همراه `dark:text-zinc-100` استفاده شده است:
- هنگام انتخاب (Focus) یا قرارگیری نشانگر ماوس (Hover) در **حالت تیره (Dark Mode)**، کلاس‌های `focus:bg-white` و `hover:bg-white` فعال شده و پس‌زمینه فیلد را سفید (`#ffffff`) می‌کنند، در حالی که رنگ متن در حالت تیره همچنان سفید (`dark:text-zinc-100`) باقی می‌ماند و نوشته داخل فیلد کاملاً غیرقابل مشاهده می‌شود.
- همچنین در صورت استفاده از تکمیل خودکار مرورگر (`:-webkit-autofill`)، مرورگر پس‌زمینه فیلد را به سفید یا آبی روشن تغییر می‌دهد که در حالت تیره باعث ناخوانایی متن می‌شود.

---

## ۲. تغییرات ظاهری و فنی (UI & Styling Fixes)

### الف) اصلاح استایل فیلدهای ورودی در مودال ورود تلگرام (`src/components/TelegramLoginModal.tsx`)
- جایگزینی کلاس‌های پس‌زمینه در تمامی فیلدهای ورودی (`شماره موبایل`، `API ID`، `API Hash`، `کد تایید OTP`، `رمز تایید دو مرحله‌ای 2FA` و `رشته Session`) با استایل صریح و سازگار با هر دو حالت روشن و تیره:
  - **حالت روشن:** پس‌زمینه `bg-slate-50 hover:bg-white focus:bg-white` با متن تیره `text-slate-900` و плейس‌هولدر `placeholder:text-slate-400`
  - **حالت تیره:** پس‌زمینه `dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900` با متن روشن `dark:text-zinc-100`، پلیس‌هولدر `dark:placeholder:text-zinc-500` و نشانگر تایپ واضح (`caret-blue-600 dark:caret-sky-400`)

### ب) اصلاح استایل فیلدهای ورودی در مودال ورود وب (`src/components/WebAppAuthModal.tsx`)
- اعمال همان الگوی `dark:hover:bg-zinc-800 dark:focus:bg-zinc-900` و رنگ متن و نشانگر تایپ روی فیلدهای نام کاربری و رمز عبور تا در حالت فوکوس سفید نشوند.

### ج) مهار سفید شدن خودکار مرورگر هنگام Autofill (`src/index.css`)
- افزودن استایل استاندارد `input:-webkit-autofill` برای حالت روشن و تیره (`.dark input:-webkit-autofill`) تا در صورت انتخاب مقادیر ذخیره‌شده در مرورگر نیز رنگ پس‌زمینه و متن فیلدها کاملاً خوانا و هماهنگ با تم باقی بماند.
