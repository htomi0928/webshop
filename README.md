# Webshop Medusa MVP

Production-ready Medusa MVP alap egy kulon `backend` es `storefront` appal, Docker Compose VPS celinfrahoz.

## Mi van benne?

- Medusa v2 backend
- Medusa admin
- Next.js storefront
- Medusa-native customer auth
- Postgres + Redis
- Caddy reverse proxy
- Minimal bootstrap script regiohoz, publishable key-hez es alap store setuphoz
- Ideiglenes teszt cipo termekek placeholder kepekkel
- SimplePay-ready env es integracios elokeszites

## Auth megjegyzes

Ez a projekt nem hasznal Supabase-et.

- customer auth: Medusa-native email/jelszo auth
- admin auth: Medusa admin user auth
- session es auth kezeles: Medusa backend oldalon

Ha masik projektedben van Supabase, azt ne keverd ezzel a repoval: a `Webshop_medusa` teljesen kulon auth stackkel megy.

## Google login

A projekt most mar tud Google customer login flow-t is az email/jelszo mellett.

- email/jelszo: Medusa `emailpass`
- Google login: Medusa `google` auth provider
- account linking: ha a Google altal visszaadott verified email megegyezik egy mar letezo customer emaillel, akkor a Google identity ugyanahhoz a customerhez kapcsolodik

Google Console oldalon a callback URL-ek:

- local gyors fejleszteshez: `http://localhost:8000/api/auth/google/callback`
- Docker/Caddy stackhez: `http://localhost/api/auth/google/callback`

Biztonsagi megjegyzes:

- a Google client secretet production elott erdemes rotalni, ha mar megosztottad vagy commit kozelbe kerult

## Projekt struktura

- `backend/` - Medusa backend
- `storefront/` - Next.js storefront
- `infra/` - reverse proxy config
- `docs/` - deploy es backup dokumentacio

## Gyors inditas

1. Masold a gyokerben a `.env.example` fajlt `.env` nevre, ha meg nincs meg.
2. Inditsd el a teljes stacket:

```powershell
docker compose up --build -d
```

3. Eleres:

- Storefront: `http://localhost`
- Admin: `http://localhost/app`
- Health: `http://localhost/health`

Az indulaskor a backend automatikusan letrehoz 4 ideiglenes teszt cipo termeket is. A kepek a mellette levo eredeti `Webshop` projekt placeholder assetjeibol lettek atemelve a `storefront/public/products` mappaba.

## Egyetlen env fajl

A projekt egyetlen env forrast hasznal: a gyoker `.env` fajlt.

- Docker compose innen olvas.
- Backend fejlesztoi futas (`npm --prefix backend run dev`) innen olvas.
- Storefront fejlesztoi futas (`npm --prefix storefront run dev`) is innen olvas.

Megjegyzes:

- `DATABASE_URL`, `REDIS_URL`, `CACHE_REDIS_URL`: lokalis (hostos) dev futashoz.
- `DOCKER_DATABASE_URL`, `DOCKER_REDIS_URL`, `DOCKER_CACHE_REDIS_URL`: konteneren beluli hostnevekhez.

Fejlesztoi default:

- `RUN_BOOTSTRAP=true`
- `RUN_SEED_TEST_PRODUCTS=true`
- `ENABLE_MANUAL_PAYMENT=true`
- `NEXT_PUBLIC_ENABLE_MANUAL_PAYMENT=true`

Productionben javasolt:

- `RUN_BOOTSTRAP=false`
- `RUN_SEED_TEST_PRODUCTS=false`
- `ENABLE_MANUAL_PAYMENT=false`
- `NEXT_PUBLIC_ENABLE_MANUAL_PAYMENT=false`

## Elso admin user letrehozasa

Amikor a stack mar fut:

```powershell
docker compose exec backend npx medusa user -e admin@example.com -p ChangeMe123!
```

Ezutan az admin feluletre a fenti adatokkal tudsz belepni.

## Mit csinal a bootstrap?

Az indulaskor a backend idempotensen letrehozza a minimalis store setupot:

- default sales channel
- primary region
- tax region
- stock location
- default shipping profile
- default shipping option
- publishable API key

Kulon startup seedkent letrehoz 4 ideiglenes cipo termeket a storefront tesztelesehez. A seed idempotens, igy ujrainditasnal nem duplazza a mar letezo termekeket.

## Lokalis adatbazis megjegyzes

A Dockeres helyi Postgres setup nem SSL-es, ezert a lokalis `DATABASE_URL` direkt `sslmode=disable` ertekkel van megadva. Managed Postgresre valtasnal ezt a connection stringet a szolgaltatod ajanlott ertekere kell cserelni.

## SimplePay allapot

A projekt meg nem aktivalt SimplePay providerrel indul, de az alabbi env valtozok mar el vannak keszitve:

- `SIMPLEPAY_MERCHANT`
- `SIMPLEPAY_SECRET_KEY`
- `SIMPLEPAY_SANDBOX`
- `SIMPLEPAY_SUCCESS_URL`
- `SIMPLEPAY_FAILURE_URL`
- `SIMPLEPAY_CALLBACK_URL`

A kesobbi integracio backend oldali belepesi pontja:

- `backend/src/lib/simplepay.ts`

## Dokumentacio

- [VPS deploy](./docs/vps-deployment.md)
- [Backup es restore](./docs/backups.md)
- [Managed Postgres atallas](./docs/managed-postgres.md)
- [Developer setup](./README.developers.md)
