# 04 — Flows & API

## Auth (to create)
- `POST /auth/login` (email + password → PHP session, httpOnly/Secure/SameSite cookie).
- `POST /auth/logout`.
- All other endpoints: session check (replaces `epuriel_require_token`) + CSRF on sensitive actions. **Strong auth**: bcrypt, rate-limit + lockout, robust password policy (no 2FA this phase).
- First boot: default admin → forced password change.

## atelier → corpus flow (direct integration)
1. **Collect**: cron collector (Telegram/YouTube/HTML) **or** PDF upload → create `en_attente` **lot** (raw deposited, disposable).
2. **Process**: per-source steps via `server_jobs` (clean, segment, OCR if available, AI-enrich). Python workers.
3. **Review** by human in the atelier.
4. **Lot validation** by Editor → **conformity check** (full set theme+date+author+keywords; duplicates via hash + `telegram_message_id`). Non-conform → blocked, errors shown.
5. **Auto-integration**: if conform, create corpus entries in a **transaction** (default state `À Corriger`), apply business rules. After verified write → **delete lot folder**. *(Replaces old pivot file + staging.)*
6. **Publication** (separate): `Publiée` = distinct human act in the library, validating AI-proposed keywords.

## Manual collect & generic historical-import engine (T40)
Design: `docs/superpowers/specs/2026-06-28-collecte-manuelle-design.md`. One **generic engine** feeds the atelier; reused by future sources (YouTube/PDF/articles). **Telethon/encrypted-account path is dropped** (credentials on shared host).
- **Reserve**: the buffer (`telegram_updates_buffer`) tags each row `origin = live | historique`. Live aggregation reads only `live`; the historical conveyor reads only `historique`. **Never mixed.**
- **Shape** (source-agnostic): `reserve → slice into small lots → auto top-up → atelier`. Only the **slicer** varies per source (Telegram = by week; YouTube = by video; PDF = by chapter; article = by article). Shared PHP module `cron/lib/telegram_pipeline.php`, called by **both crons and the manual endpoint** (no duplication).
- **Entry 1 — live picto** (`⟳` next to `telegram` in the atelier SOURCE card): `collect first → aggregate all pending → wake worker via exec()` (no cron wait). Lot shows `en_traitement` immediately. **sonner toasts** (started / ready ✅ link / error ⚠️ red) driven by status **polling**.
- **Entry 2 — history by export file** (no web page): SSH script `cron/import_telegram_history.php <source_id> <export.json…>` (Telegram Desktop JSON, text-only) → reserve `origin=historique`. Weekly slices, **auto top-up** (≤ 8 `en_attente` lots; `POST /collecte/topup` on atelier open + "give me more" button). Per-source switch `collect_sources.history_import_enabled` + progress badge.
- **DB (migration 011)**: `telegram_updates_buffer.origin`; `collect_sources.history_import_enabled` (threshold/slice in `config_json`).
- **Routes (new)**: `POST /collecte/run` (live picto) · `POST /collecte/topup` (conveyor + `?more`). Concurrency: `GET_LOCK()` per source.

## Existing API routes (real, keep/adapt)
Lots: `POST /lots/create` · `/lots/{id}/0_raw` · `/take` · `/checkpoint` · `/pivot` (**→ validate & integrate to corpus** instead of writing a file) · `GET /lots/waiting` · `/lots/{id}` · `/lots/{id}/files` · `POST /lots/delete[/preview]`.
Telegram: `GET|POST /telegram/sources` · `POST /telegram/lots/create-from-buffer` · `/telegram/lots/collect-and-create`. *(Telethon `/telegram/history/auth/*` dropped — see T40 engine above; history now via SSH export-file import.)*
AI: `GET|POST /ia/settings` · `POST /ia/models/refresh|registry/save|test` · `/lots/{id}/ia/regenerate`.

**To add**: auth (`/auth/*`), lot validation/integration to corpus, library consult/search, authors/works/themes/keywords CRUD, `Publiée` transition, notifications/contact.

## Notifications & Contact
- `POST /api/contact` — visitor contact form submission (public, honeypot+CSRF). Category: "contenu" (→ editor) or "autre" (→ admin). Sends acknowledgment email to visitor + notification email to routed recipient.
- `GET /api/notifications` — list notifications (authenticated, admin/editor).
- `PUT /api/notifications/{id}` — update status/notes (authenticated).
- `DELETE /api/notifications/{id}` — soft-delete (authenticated, confirmation in frontend).
- `GET|PUT /api/notifications/preferences` — user email notification preferences (frequency in days for lot_pret digest).

## Email transport
PHPMailer + authenticated SMTP (o2switch). Config in `config/config.php` (server-only, never versioned). Internal events (job error → immediate; lots ready → cron digest per user frequency).

## Front (reminder)
Everything via `apiClient.ts` (`fetch`, `credentials: 'include'`). Services (`mockServices.ts` → rename `webServices`) = sole adapter. The displayed "pivot" becomes the lot's **prepared content** (before corpus integration).

## Search
MySQL `FULLTEXT` + accent-insensitive collation. Filters: author, work, theme, keywords (OR/AND), dates, state (admin), per-role rights. Keyset pagination, 300 ms debounce, virtualization > 200.
