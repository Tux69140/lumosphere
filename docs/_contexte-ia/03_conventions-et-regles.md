# 03 — Conventions & rules (index)

> **Implementation rules have moved to `.claude/rules/`** (auto-loaded per session). This file serves as an index only — do not duplicate rule content here.

## Rule files (`.claude/rules/`)

| File | Covers |
|------|--------|
| `security.md` | Secrets, auth (PHP sessions, CSRF), Gitleaks, fetch credentials |
| `database.md` | PDO bound params, role_oeuvre_access, soft-delete, corpus transactions, FULLTEXT, keyset pagination, dedup |
| `frontend.md` | React 19/Vite/TS/Tailwind stack, EpurielServices abstraction, Markdown editor, PWA, search UX |
| `backend-php.md` | PHP API (no framework), DAL, sessions, CORS, server_jobs + cron |
| `python-workers.md` | venv py311, worker stdin/stdout pattern, anti-summarization guard, o2switch constraints |
| `testing.md` | Test matrix (Vitest/Playwright/PHPStan/Ruff/Gitleaks), quality gates, performance benchmarks |
| `conventions.md` | Naming (PascalCase/camelCase/snake_case), business vocabulary (FR), commits, document priority |

## Business context (not in rules)

Product scope, locked decisions, roles → `00_contexte-produit.md`
Architecture, o2switch constraints → `01_architecture.md`
Schema (atelier + corpus + auth) → `02_schema-donnees.md`
API flows, auth flow → `04_flux-et-api.md`
