# Developer README

Ez a rovid guide segit, hogyan inditsd el a projektet GitHub klonozas utan.

## 1. Klonozas

```bash
git clone https://github.com/htomi0928/webshop.git
cd webshop
```

## 2. Env beallitas

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Fontos: ebben a projektben a gyoker `.env` az egyetlen env forras.

## 3. Fuggosegek telepitese

```bash
npm --prefix backend install
npm --prefix storefront install
```

## 4. Egyparancsos dev inditas (ajanlott)

```bash
npm run start:dev:medusa
```

Ez a parancs:

- elinditja a `postgres` + `redis` szolgaltatasokat Dockerben,
- elinditja a backendet,
- elinditja a storefrontot.

Megjegyzes: a script platformfüggetlen, Windows/macOS/Linux alatt is ugyanigy fut.

## 5. Kezi inditas (ha kell)

```bash
docker compose up -d postgres redis
```

## 6. Medusa backend inditasa (dev)

```bash
npm run start:dev:medusa
```

Backend URL: `http://localhost:9000`

## 7. Storefront inditasa (dev)

Kulon terminalben:

```bash
npm run start:dev:storefront
```

Storefront URL: `http://localhost:8000`

## 8. Elso ellenorzes

- Health: `http://localhost:9000/health`
- Storefront: `http://localhost:8000`
- Admin: `http://localhost:9000/app`

## 9. Gyakori hibak

1. `EADDRINUSE: 9000`
- Mar fut egy masik backend process.
- Allitsd le a regi processzt, majd inditsd ujra a `npm run start:dev:medusa` parancsot.

2. `KnexTimeoutError SELECT 1`
- A Postgres/Redis nincs elinditva.
- Futtasd: `docker compose up -d postgres redis`.

3. Google login `redirect_uri_mismatch`
- Google Console-ban add hozza a callback URI-ket:
`http://localhost:8000/api/auth/google/callback`
`http://localhost/api/auth/google/callback`

## 10. Hasznos parancsok

```bash
docker compose ps
docker compose logs backend --tail=100
docker compose logs postgres --tail=100
npm --prefix backend run migrate
```
