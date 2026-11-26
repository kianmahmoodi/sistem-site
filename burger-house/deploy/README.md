# نصب روی هاست (Docker)

این پوشه سایت را با سه سرویس بالا می‌آورد: **Postgres** (دیتابیس)، **API** (بک‌اند روی پورت داخلی ۸۰۰۰) و **web** (سایت + پنل‌ها روی پورت عمومی). Nginx در سرویس `web` درخواست‌های `/api` را به API می‌فرستد، پس همه‌چیز روی یک دامنه کار می‌کند و کوکی‌های ورود درست می‌مانند.

## پیش‌نیاز

- یک سرور لینوکسی (۲ گیگ رم کافی است) با Docker و Docker Compose
- دامنه‌ای که به IP سرور اشاره کند

## مراحل

```bash
# ۱- کد را روی سرور بگیرید
git clone -b build-burger-website https://github.com/kianmahmoodi/sistem-site.git
cd sistem-site/burger-house/deploy

# ۲- فایل تنظیمات را بسازید و مقادیر را عوض کنید
cp .env.example .env
nano .env

# ۳- ساخت و اجرا (بار اول چند دقیقه طول می‌کشد)
docker compose up -d --build
```

سایت روی `http://IP-سرور` بالا می‌آید. اولین ورود با `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` انجام می‌شود و بعد از آن می‌توانید از بخش **Users & Roles** مدیر و صندوق‌دار بسازید.

## دامنه و HTTPS

ساده‌ترین راه، گذاشتن Caddy جلوی سرویس است. یک `Caddyfile` کنار پوشه بسازید:

```
burger.your-domain.com {
    reverse_proxy 127.0.0.1:80
}
```

و در `deploy/.env` مقدار `WEB_PORT=8080` را بگذارید تا پورت ۸۰ سرور آزاد بماند.

## کار با دیتابیس

```bash
# ورود به psql
docker compose exec db psql -U burger -d burger

# بکاپ
docker compose exec -T db pg_dump -U burger burger > backup-$(date +%F).sql

# بازگردانی بکاپ
cat backup-2026-01-01.sql | docker compose exec -T db psql -U burger -d burger
```

اسکیما و داده‌های اولیه (دسته‌ها، ۱۶ محصول، کدهای تخفیف، تنظیمات سایت) در اولین اجرای API روی دیتابیس خالی ساخته می‌شوند.

## API

- سلامت سرویس: `GET /api/health`
- بقیه مسیرها زیر `/api/...` هستند و از همان دامنه‌ی سایت پاسخ می‌دهند.

```bash
curl http://localhost/api/health
docker compose logs -f api
```

## به‌روزرسانی سایت

```bash
git pull
cd burger-house/deploy
docker compose up -d --build
```

## نکته‌های امنیتی

- `deploy/.env` را در گیت کامیت نکنید (در `.gitignore` هست).
- `SESSION_SECRET` را طولانی و تصادفی بگذارید.
- رمز پیش‌فرض مدیر را همان روز اول عوض کنید.
- اگر بدون HTTPS بالا می‌آورید، حتماً قبل از گرفتن سفارش واقعی گواهی SSL بگذارید.
