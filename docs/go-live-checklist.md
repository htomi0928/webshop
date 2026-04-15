# Go-Live Checklist (MedusaJS Webshop)

Keszult: 2026-04-15  
Cél: production indulásra kész állapot elérése.

## Hasznalat

- `Owner`: ki felel a feladat lezárásáért.
- `Hatarido`: konkret datum.
- `Statusz`: `TODO` -> `IN PROGRESS` -> `DONE`.
- `Elfogadasi kriterium`: mi alapjan tekintjuk kesznek.

## P0 - Indulas elott kotelezo

| Prioritas | Feladat | Owner | Hatarido | Statusz | Elfogadasi kriterium |
|---|---|---|---|---|---|
| P0 | Backend secret fallback eltavolitasa (`supersecret` tiltasa) | Backend | 2026-04-16 | DONE | App startup fail-el, ha `JWT_SECRET` vagy `COOKIE_SECRET` hianyzik. |
| P0 | Storefront build gate visszakapcsolas (`ignoreBuildErrors`, `ignoreDuringBuilds` torlese) | Frontend | 2026-04-16 | IN PROGRESS | `npm --prefix storefront run build` sikeres, lint+typecheck hibamentes. |
| P0 | Startup flow szetvalasztasa (migrate/bootstrap/seed ne fusson minden restartkor) | DevOps + Backend | 2026-04-17 | DONE | Production compose/start script nem seedel teszt adatot es nem futtat bootstrapet automatikusan. |
| P0 | SimplePay callback endpoint implementalasa (signature + idempotencia + order-ops update) | Backend | 2026-04-18 | IN PROGRESS | Callback endpoint validalja alairast, duplikalt callback nem okoz duplikalt tranzakciot. |
| P0 | Manual payment (`pp_system_default`) kikapcsolasa productionben | Backend + Frontend | 2026-04-18 | IN PROGRESS | Checkoutban csak valos payment provider jelenik meg production regio(k)ban. |
| P0 | Production `.env` hardening (domain, eros secret, admin jelszo csere) | DevOps | 2026-04-16 | IN PROGRESS | Nincs `localhost`, nincs default jelszo, minden required env beallitva. |
| P0 | DB/Redis publikus port mapping megszuntetese | DevOps | 2026-04-17 | DONE | Postgres/Redis kivulrol nem erheto el, csak belso docker networkon. |

## P1 - Stabil uzemeltetes

| Prioritas | Feladat | Owner | Hatarido | Statusz | Elfogadasi kriterium |
|---|---|---|---|---|---|
| P1 | CI pipeline letrehozasa (build, test, lint, typecheck) | DevOps + FE + BE | 2026-04-20 | TODO | PR merge csak zold pipeline mellett engedett. |
| P1 | Kritikus integracios tesztek (auth, checkout, payment callback, cart restore, order lifecycle) | QA + Backend | 2026-04-22 | TODO | Minimum 10-15 kritikus teszt stabilan zold. |
| P1 | Observability bekotes (strukturalt log, error tracking, alap alerting) | DevOps | 2026-04-22 | TODO | 5xx, payment callback fail es checkout error rate alert definialva. |
| P1 | Backup automatizalas + restore drill stagingen | DevOps + Backend | 2026-04-21 | TODO | Napi backup fut, staging restore sikeres es dokumentalt. |
| P1 | Dependency pinning (`latest` helyett fix verziok) | Frontend | 2026-04-20 | TODO | `storefront/package.json` nem tartalmaz `latest` verziokat. |

## P2 - UX/Funkcionalis es operacios fejlesztes

| Prioritas | Feladat | Owner | Hatarido | Statusz | Elfogadasi kriterium |
|---|---|---|---|---|---|
| P2 | Account email/password update feature lezárása | Frontend + Backend | 2026-04-24 | TODO | Felhasznalo UI-bol biztonsagosan frissitheto email/jelszo. |
| P2 | Inventory TODO-k lezárása cart oldalon | Frontend + Backend | 2026-04-24 | TODO | Checkout/cart mennyiseg validacio valos inventory alapjan megy. |
| P2 | Admin order-ops UI (timeline + payment record megjelenites) | Backend + Admin FE | 2026-04-25 | TODO | Adminban rendelésenként látszik timeline és payment history. |
| P2 | Status transition szabalyok szigoritasa order-ops-ban | Backend | 2026-04-25 | TODO | Tiltott allapotvaltások API szinten blokkoltak. |
| P2 | Felesleges minta route-ok torlese (`/store/custom`, `/admin/custom`) | Backend | 2026-04-23 | TODO | Nem marad uresen 200-at ado placeholder endpoint productionben. |

## Go/No-Go kapu (release nap)

Javasolt release datum: 2026-04-26

| Kapu | Feltetel | Statusz |
|---|---|---|
| Security | Minden P0 `DONE` | TODO |
| Payments | Valos payment end-to-end tesztelve sandbox + production kulcsokkal | TODO |
| Quality | CI zold a release commiton | TODO |
| Operations | Backup + restore drill dokumentaltan sikeres | TODO |
| Rollback | Elozo stabil image/tag rollback lepesei kiprobalva | TODO |

## Rollback minimum terv

1. Elozo stabil image tag-ek rogzitese backend/storefront service-hez.
2. Release elott DB backup futtatasa.
3. Sikertelen release eseten image rollback + adatbazis rollback (ha schema torik).
4. Incident log es postmortem 24 oran belul.

## Uzemeltetesi runbook minimum

- Deploy runbook: build, migrate, health check, smoke test.
- Incident runbook: fizetesi callback hiba, checkout hiba, auth hiba.
- Access runbook: admin user kezeles, credential rotacio, secret update.
