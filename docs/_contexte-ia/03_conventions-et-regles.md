# 03 — Conventions & rules

## Business rules (PHP server-side, not UI-only)
- **Corpus integration**: on validating a **conform** lot (full set theme+date+author+keywords, no duplicate), write in a **transaction** (all-or-nothing), verify, then delete the lot. Atelier never writes partially to corpus.
- **Theme required for integration**.
- Default state at integration: **À Corriger** (integration ≠ publication).
- **`Publiée` forbidden without the full set** (theme, publication date, author, keywords) **and without human validation** (notably AI-proposed keywords) after review.
- System states (C/R/P) non-deletable; Administrateur role non-deletable/non-reducible.
- Themes: **2 levels max**. Keywords: **normalized**, case-insensitive unique.
- **Soft-delete** (`deleted_at`) filtered on all reads.
- **Per-work rights** (`role_oeuvre_access`) applied to **all** read queries (not visual masking).
- Validate before write (React + PHP re-validation). Concurrent edit: `SELECT … FOR UPDATE`; one lot = one owner (`assigned_to`).

## Disposable lots
- Lot = temp workspace. After successful corpus integration (verified write) → **delete the whole lot folder** (raw + intermediates).
- **Debug mode** (global setting + per-lot override, **default OFF**): keeps the folder for diagnosis.
- Keep in DB: `collect_sources.last_marker` + `first_marker`, per auto-collected source (not manual PDF).
- No per-lot `manifest.json`/`journal.csv`, no `*_exports/`. Light DB log, pruned. `telegram_updates_buffer` purged.

## Code conventions
- **TS/React**: `PascalCase` components, `camelCase` hooks/funcs. UI **no** runtime dependency (via services). No Electron.
- **PHP**: simple, o2switch-compatible, no heavy framework; `epuriel_*` internal functions kept; PDO bound params.
- **Python**: PEP8, `snake_case`, venv py311. CLI workers (stdin/stdout JSON), launched by PHP via `exec()`.
- Tech identifiers in English; user labels in **French** (correct accents).
- Business vocabulary (French): lot, source, brut, étape, révision, enrichissement, validation, intégration, publication, journal. (No "staging".)

## Prohibitions
- No hardcoded API URL/secret.
- No **partial/uncontrolled** corpus write: atelier writes only on **conform-lot validation**, in a **transaction**, then deletes the lot. No staging, no second review (integration ≠ publication).
- No browser-side secret (tokens, AI keys, Telegram creds).
- No long task in a web request (→ `server_jobs` + cron).
- No `.pivot.json` file (→ direct corpus integration).
- `apps/pdfmd/` = reference atelier, **never the main app**.
- Don't rely on the old repos' archive.

## Quality (pre-commit)
`pnpm lint` + `pnpm build` green + targeted manual check. Vitest/Playwright (front), Ruff (Python), PHPStan/PHPCS (PHP), Gitleaks (secrets incl. auth).
