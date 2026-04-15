# Managed Postgres Migration

Ez a projekt úgy van kialakítva, hogy a Postgres könnyen kiváltható legyen managed szolgáltatóval.

## Átállás menete

1. Hozd létre a managed Postgres példányt.
2. Exportáld a jelenlegi adatbázist.
3. Importáld a managed példányba.
4. Írd át a gyökér `.env` fájlban a `DATABASE_URL` értékét.
5. Managed szolgáltatónál általában már nem `sslmode=disable`, hanem a szolgáltató által adott SSL paraméterezés kell.
5. A `postgres` service később eltávolítható a compose-ból vagy csak nem használod.

## Mi marad változatlan?

- Medusa backend
- storefront
- Redis
- Caddy

## Mi változik?

- csak a `DATABASE_URL`
- backup/rollback onnantól a managed szolgáltatón keresztül kezelhető
