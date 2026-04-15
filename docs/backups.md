# Backups and Restore

## Dockeres helyi vagy VPS Postgres backup

```bash
docker compose exec postgres pg_dump -U medusa medusa > medusa-backup.sql
```

## Restore

```bash
Get-Content .\\medusa-backup.sql | docker compose exec -T postgres psql -U medusa -d medusa
```

## Ajánlás

- napi automatikus dump productionben
- off-server backup tárolás
- restore teszt legalább staging környezetben
