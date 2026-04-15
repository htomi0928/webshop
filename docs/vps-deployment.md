# VPS Deployment

## 1. VPS alapok

- Ubuntu LTS
- Docker Engine
- Docker Compose plugin
- domain vagy subdomain a storefronthoz

## 2. Fajlok feltoltese

Toltsd fel a teljes projektet a VPS-re, majd hozd letre a gyoker `.env` fajlt a `.env.example` alapjan.

## 3. Production `.env` minimum

- `CADDY_SITE_ADDRESS=shop.sajatdomain.hu`
- `PUBLIC_STORE_ORIGIN=https://shop.sajatdomain.hu`
- `PUBLIC_ADMIN_ORIGIN=https://shop.sajatdomain.hu`
- `PUBLIC_AUTH_ORIGIN=https://shop.sajatdomain.hu`
- eros `JWT_SECRET`
- eros `COOKIE_SECRET`
- `RUN_BOOTSTRAP=false`
- `RUN_SEED_TEST_PRODUCTS=false`
- `ENABLE_MANUAL_PAYMENT=false` (ha nincs szukseg manual teszt fizetesre)
- `NEXT_PUBLIC_ENABLE_MANUAL_PAYMENT=false`
- `MEDUSA_ADMIN_PASSWORD` ne maradjon default
- managed Postgres eseten `DATABASE_URL` SSL-es provider string legyen

## 4. Inditas

```bash
docker compose up --build -d
```

## 5. Elso admin user

```bash
docker compose exec backend npx medusa user -e admin@example.com -p "StrongRandomPasswordHere"
```

## 6. Ellenorzes

- storefront nyilik
- admin nyilik
- `https://shop.sajatdomain.hu/health` 200
- customer regisztracio mukodik
- checkoutban nincs manual payment opcio productionben

## 7. Frissites

```bash
git pull
docker compose up --build -d
```

Schema valtozasnal a backend indulaskor futtatja a migraciot.  
Bootstrap/teszt seed csak akkor fut, ha a megfelelo `RUN_*` flag `true`.
