# 00 — Product context

## What it is
Single web app (installable PWA): **prepares** document sources, then serves an **editorial library** of spiritual quotes/texts. Two zones, one app:
- **Atelier** (ex-Epuriel): import PDF/Telegram/YouTube/HTML, clean, segment, AI-enrich, review.
- **Library** (ex-Index Lulumineux): validated entries; authors/works/themes/keywords/rights; consultation + search.

**Validation rule**: at end of review the Editor **validates the lot**; if conform, the entry is **auto-integrated into the corpus** (direct write in a transaction, then lot deleted). **Integration ≠ publication**: entry lands as `À Corriger`; moving to `Publiée` is a **separate human act** (validates AI-proposed keywords).

## Locked decisions (do not reopen)
- **Stack**: React/Vite + PHP API + **single MySQL/MariaDB** = source of truth. (Old Index SvelteKit/Node/SQLite plan dropped.)
- **PWA installable, online**: Win/Linux/Mac/Android, one codebase, stores via PWABuilder. **No Electron.** Abstraction layer kept (Tauri possible later).
- **No offline** this phase (internet required).
- **No pivot file, no staging zone**: lot validation writes directly to corpus, in a transaction.
- **Disposable lots**: a lot is a temp workspace deleted after corpus integration (unless debug mode); only per-source collection markers kept.
- **Strong server auth**: PHP sessions (httpOnly/Secure cookie + CSRF), bcrypt, rate-limit + lockout, robust password policy (no 2FA this phase). No secret browser-side.
- **AI**: LiteLLM cloud, configurable providers (local Ollama dropped).
- **Name**: app = Lumosphère; "Epuriel" = atelier internal name (`epuriel_*` functions kept).

## Roles
Visiteur, Abo3, Abo4 (read, per-work rights) · Éditeur (edits, validates lots → corpus integration, decides `Publiée`) · Administrateur (all). Atelier = Éditeur/Admin only.

## Out of scope
Offline/cache; offline editing w/ sync; mobile editing tool for 2-3 editors (separate, future); native store app (Tauri); Apple App Store; RAG/embeddings; PDF/EPUB exports (phase 3).

## Target
~50k entries. Reliability over speed. Privacy (no third-party analytics).
