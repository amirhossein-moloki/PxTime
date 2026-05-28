# راهنمای APIهای سیستم گیم‌نت (Game Net)

این مستند شامل لیست کامل APIهای سیستم به همراه توضیحات عملکردی هر کدام است.

---

## ۱. احراز هویت (Authentication)
مدیریت ورود و خروج کاربران و مشتریان.

| متد | مسیر | توضیحات |
| :--- | :--- | :--- |
| POST | `/auth/user/otp/request` | درخواست ارسال کد تأیید برای کارکنان |
| POST | `/auth/user/otp/verify` | تأیید کد و دریافت توکن ورود کارکنان |
| POST | `/auth/user/login/otp` | ورود مستقیم کاربر با کد یکبار مصرف |
| POST | `/auth/customer/otp/request` | درخواست کد تأیید برای مشتریان |
| POST | `/auth/customer/otp/verify` | تأیید هویت مشتری |
| POST | `/auth/login` | ورود با موبایل و رمز عبور (ادمین) |
| POST | `/auth/refresh` | تمدید توکن منقضی شده |
| POST | `/auth/logout` | خروج از حساب کاربری |
| GET | `/auth/me` | دریافت اطلاعات پروفایل فعلی |

---

## ۲. مدیریت مراکز بازی (Gaming Centers)
عملیات مربوط به مدیریت شعبه‌ها.

| متد | مسیر | توضیحات |
| :--- | :--- | :--- |
| GET | `/gamingCenters` | لیست تمام مراکز بازی |
| POST | `/gamingCenters` | ایجاد مرکز جدید (System Admin) |
| GET | `/gamingCenters/:id` | مشاهده جزئیات یک مرکز |
| PATCH | `/gamingCenters/:id` | ویرایش اطلاعات مرکز |
| DELETE | `/gamingCenters/:id` | حذف مرکز از سیستم |

---

## ۳. ایستگاه‌های بازی (Game Stations)
مدیریت کنسول‌ها و سیستم‌های PC.

| متد | مسیر | توضیحات |
| :--- | :--- | :--- |
| GET | `/gamingCenters/:id/stations` | لیست ایستگاه‌های یک مرکز |
| POST | `/gamingCenters/:id/stations` | تعریف ایستگاه جدید |
| GET | `/gamingCenters/:id/stations/:sid` | جزئیات یک ایستگاه |
| PATCH | `/gamingCenters/:id/stations/:sid` | ویرایش ایستگاه |
| DELETE | `/gamingCenters/:id/stations/:sid` | حذف ایستگاه |
| GET | `/public/gamingCenters/:slug/stations` | لیست ایستگاه‌ها برای رزرو عمومی |

---

## ۴. رزرواسیون (Reservations)
هسته اصلی مدیریت نوبت‌ها.

| متد | مسیر | توضیحات |
| :--- | :--- | :--- |
| GET | `/gamingCenters/:id/reservations` | لیست تمامی رزروها |
| POST | `/gamingCenters/:id/reservations` | ثبت رزرو توسط اپراتور |
| GET | `/gamingCenters/:id/reservations/:rid` | جزئیات یک رزرو |
| PATCH | `/gamingCenters/:id/reservations/:rid` | ویرایش زمان/ایستگاه رزرو |
| POST | `/gamingCenters/:id/reservations/:rid/confirm` | تأیید نوبت |
| POST | `/gamingCenters/:id/reservations/:rid/cancel` | لغو نوبت |
| POST | `/gamingCenters/:id/reservations/:rid/complete` | اتمام بازی و تسویه |
| POST | `/gamingCenters/:id/reservations/:rid/no-show` | ثبت عدم حضور |
| POST | `/public/gamingCenters/:slug/reservations` | رزرو آنلاین توسط مشتری |

---

## ۵. پنل مشتری (Customer Panel)
دسترسی‌های اختصاصی برای مشتریان.

| متد | مسیر | توضیحات |
| :--- | :--- | :--- |
| GET | `/customer/me` | پروفایل مشتری |
| GET | `/customer/reservations` | سوابق رزرو مشتری |
| POST | `/customer/reservations/:id/cancel` | لغو رزرو توسط خود مشتری |
| POST | `/customer/reservations/:id/ratings` | ثبت امتیاز و نظر |

---

## ۶. کارکنان و شیفت‌ها (Staff & Shifts)
| متد | مسیر | توضیحات |
| :--- | :--- | :--- |
| GET | `/gamingCenters/:id/staff` | لیست پرسنل |
| POST | `/gamingCenters/:id/staff` | افزودن کارمند جدید |
| PUT | `/gamingCenters/:id/staff/:uid/staffShifts` | تنظیم شیفت‌های کاری |

---

## ۷. آنالیز و گزارشات (Analytics)
| متد | مسیر | توضیحات |
| :--- | :--- | :--- |
| GET | `/gamingCenters/:id/analytics/summary` | خلاصه عملکرد مرکز |
| GET | `/gamingCenters/:id/analytics/staff` | گزارش عملکرد پرسنل |
| GET | `/gamingCenters/:id/analytics/stations` | آمار استفاده از دستگاه‌ها |
| GET | `/gamingCenters/:id/analytics/revenue-chart` | نمودار درآمد |

---

## ۸. مدیریت محتوا (CMS)
| متد | مسیر | توضیحات |
| :--- | :--- | :--- |
| POST | `/gamingCenters/:id/media/upload` | آپلود تصاویر |
| GET | `/gamingCenters/:id/pages` | مدیریت صفحات استاتیک |
| PUT | `/gamingCenters/:id/site-settings` | تنظیمات سایت عمومی |

---

## ۹. مالی و سیستمی
| متد | مسیر | توضیحات |
| :--- | :--- | :--- |
| POST | `/gamingCenters/:id/reservations/:rid/payments/init` | ایجاد تراکنش بانکی |
| POST | `/webhooks/payments/:provider` | دریافت تأییدیه‌های پرداخت |
| GET | `/health` | وضعیت سلامت سرور |
| GET | `/gamingCenters/:id/audit-logs` | گزارش تغییرات حساس |
