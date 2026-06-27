# 01 — Architecture

## Overview
```
Browser (PWA)  --HTTPS, same-origin-->  PHP API (o2switch)  --PDO-->  single MySQL
  React/Vite                                  |                    [atelier|corpus|auth]
  abstraction layer (services)                |
                                       server_jobs + cron --> Python workers (venv py311)
```

## Front
- React 19 + Vite + TS + Tailwind (validated palette: green/gold/slate + indigo, light-dark; **Phosphor Icons**).
- **PWA**: `manifest.json` + minimal service worker (installable; **no offline cache**). Stores via PWABuilder (MSIX, TWA + `assetlinks.json`).
- **Responsive** desktop/tablet/mobile (current UI is desktop-first, to adapt).
- **Mandatory abstraction**: UI never calls runtime directly; goes through `EpurielServices` contract (`abstraction/uiContract.ts`, `services/`). One adapter today (Web/`fetch`). Settings persisted in `localStorage`.
- **Server state**: TanStack Query (React Query) — `queryFn`/`mutationFn` call `EpurielServices`/`apiClient`, **never** `fetch` directly; caching, loading/error states, post-mutation invalidation, abstraction preserved. (TanStack Table for grids, TanStack Virtual for >200 rows.)

## PHP API
- Single router + `bootstrap.php` (CORS, config, PDO, helpers). `epuriel_*` functions kept.
- Sensitive config **outside repo**: `config/config.php` (db_*, lots_root, python_bin, timezone, AI keys). No hardcoded URL/secret.
- **Strong session auth** (replaces `X-Epuriel-Token`): bcrypt, rate-limit + lockout, robust password policy, session-id regen, expiry/idle (no 2FA). Every endpoint checks session; CSRF on sensitive actions.
- PDO **bound params** only.

## Long tasks
All heavy work → **`server_jobs`** table drained by cron **`run_jobs.php`**. No long `exec()` in a web request. No Celery/RQ/Redis. Python workers via `exec()`.

## AI
LiteLLM (cloud). Configurable providers, default `gemini`, model allowlist, keys in server config.

## Email
PHPMailer + authenticated SMTP (o2switch). Sends: visitor contact acknowledgment, notification to admin/editor (routed by category), job error alerts, lot-ready digest (cron, frequency per user in days). Config in `config/config.php`.

## o2switch limits (shared, no VPS)
| | |
|---|---|
| PHP | 8.1.34 (web+cli) · MariaDB 11.4.12 |
| `exec()`/cron | OK (`/usr/local/bin/php`) |
| Python | system 3.6.8 unusable → **venv py311** |
| OK | PyMuPDF, Pillow, LiteLLM, Ghostscript (`/usr/bin/gs`) |
| **Absent → install** | Tesseract, OCRmyPDF, Poppler, Pandoc (venv if needed / embedded binary) |
| No | VPS, GPU, persistent process (→ local Ollama dropped) |

→ OCR and **EPUB Pandoc** (phase 3): **to install**, not deferred.

## Deploy
Site at **root** `/home2/mist2786/public_html/` (React build + PHP API, same origin). `ssh lumosphere`. DB `mist2786_lumosphere`, app user `mist2786_lumo_usr` (SELECT/INSERT/UPDATE/DELETE only).
