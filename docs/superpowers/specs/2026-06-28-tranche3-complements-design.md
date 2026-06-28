# Tranche 3 — Compléments (4 fonctions)

Date : 2026-06-28

## Contexte

Tranche 3 en cours, 4 fonctions manquantes à implémenter :
- F1 : Favoris (bug + filtre + entrée menu)
- F2 : Retour post-connexion + filtres synchronisés avec l'URL
- F3 : Menu déroulant de titres dans l'éditeur Markdown
- F4 : Configuration LiteLLM complète (admin UI)

---

## F1 — Favoris : bug fix + filtre

### Bug identifié

`api.ts:247` envoie `POST /api/favorites` avec `{citation_id}` dans le corps.
Le routeur PHP extrait `$id` de l'URL → `$id = null` → pas de match → erreur "Méthode non supportée".

**Fix** : `post<void>(`favorites/${citationId}`, {})`.

### Filtre "Mes favoris"

- Toggle dans la sidebar de filtres (composant `CorpusFilters`)
- Visiteurs (localStorage) : filtrage côté client via `favoriteIds` de `useFavorites()`
- Utilisateurs connectés : paramètre API `favorites_only=1` → JOIN sur `user_favorites` dans `dal_find_citations`
- Lien cœur dans le Header pour accéder aux favoris (`/?favoris=1`)

### Fichiers

| Fichier | Modification |
|---------|-------------|
| `src/services/api.ts` | Fix URL addFavorite |
| `src/components/Header.tsx` | Lien favoris |
| `src/features/corpus/CorpusSearchProvider.tsx` | État `favoritesOnly` |
| `src/components/CorpusFilters.tsx` | Toggle UI |
| `src/features/accueil/AccueilPage.tsx` | Filtre côté client visiteurs |
| `api/dal/citations.php` | Filtre `favorites_only` JOIN |
| `api/endpoints/citations.php` | Parse param GET |

---

## F2 — Retour post-connexion + filtres dans l'URL

### Filtres synchronisés avec l'URL

Les filtres vivent actuellement en `useState` React (perdus au refresh/navigation).
Nouveau : synchronisation bidirectionnelle avec `useSearchParams()` de React Router.

| Param URL | État |
|-----------|------|
| `q` | query texte |
| `oeuvres` | IDs séparés par virgule |
| `themes` | IDs séparés par virgule |
| `keywords` | IDs séparés par virgule |
| `kw_mode` | AND/OR |
| `date_from`, `date_to` | dates |
| `sort` | date/score (défaut: date, omis) |
| `favoris` | 1 (filtre favoris F1) |

Nouveau hook `useUrlFilterState.ts` encapsule la logique parse/serialize.
`CorpusSearchProvider` remplace ses `useState` par ce hook.

### Redirect login

`LoginPage.tsx:39` ne conserve que `pathname`. Fix : inclure `search` + `hash`.

### Fichiers

| Fichier | Modification |
|---------|-------------|
| `src/features/corpus/useUrlFilterState.ts` | **Nouveau** : hook sync URL |
| `src/features/corpus/CorpusSearchProvider.tsx` | Remplace useState par useUrlFilterState |
| `src/features/auth/LoginPage.tsx` | Fix redirect complet |

---

## F3 — Menu déroulant de titres (éditeur Markdown)

### Approche

Milkdown/Crepe expose l'API ProseMirror. Nouvelles méthodes sur `MarkdownEditorHandle` :
- `setHeading(level: 0|1|2|3)` — 0 = paragraphe, 1-3 = titres
- `getBlockType(): string` — détecte le type de bloc au curseur

Menu déroulant `<select>` dans `MarkdownToolbar` :
- Options : Paragraphe / Titre 1 / Titre 2 / Titre 3
- Affiche le niveau actuel (détection via plugin ProseMirror de sélection)

### Implémentation

- `MilkdownEditor.tsx` : import `wrapInHeadingCommand`, `turnIntoTextCommand` de `@milkdown/preset-commonmark`
- Tracking du bloc courant via état React + listener de sélection ProseMirror
- Passage de `onSetHeading` + `currentBlockType` en props à `MarkdownToolbar`

### Fichiers

| Fichier | Modification |
|---------|-------------|
| `src/components/markdown/types.ts` | Ajout setHeading + getBlockType |
| `src/components/markdown/MilkdownEditor.tsx` | Implémentation + tracking sélection |
| `src/components/markdown/MarkdownToolbar.tsx` | Menu déroulant titres |

---

## F4 — LiteLLM : configuration admin complète

### Tables BDD

**`ia_settings`** (nouvelle, modèle Epuriel) :
- scope, provider, model, timeout_seconds, max_retries, updated_by, timestamps
- Clé unique sur scope, défaut `server_default`

**`ai_prompts`** (nouvelle) :
- prompt_key (unique), content (TEXT), updated_by, timestamps
- Lignes par défaut : `suggest_keywords`, `suggest_theme` (contenu extrait du code actuel)

**`ai_logs`** (enrichie) :
- Colonnes ajoutées : provider, action, status, error_message
- Index sur created_at pour pagination

Migration : `db/migrations/009_ai_admin.sql`

### Catalogue providers (PHP, en dur)

```
mistral   → mistral-small-latest, mistral-medium-latest, mistral-large-latest
anthropic → claude-sonnet-4-20250514, claude-haiku-4-20250414
openai    → gpt-4o-mini, gpt-4o, gpt-4.1-mini
gemini    → gemini-2.5-flash, gemini-2.5-pro
deepseek  → deepseek-chat
```

Chaque provider a un booléen `configured` (clé API présente dans config.php ou non).

### Sécurité

- Clés API restent dans `config.php` — jamais en BDD, jamais exposées au navigateur
- Seul le booléen `configured` est transmis au frontend
- Permission requise : `admin.settings`

### Backend PHP

- `dal_ai_provider_catalog($config)` : retourne le catalogue avec statut configuré
- `dal_ai_get_settings` / `dal_ai_save_settings` : CRUD ia_settings
- `dal_ai_get_prompts` / `dal_ai_update_prompt` : CRUD ai_prompts
- `dal_ai_get_logs` : pagination keyset
- `_dal_litellm_call` modifié : lit provider/modèle depuis ia_settings, prompt depuis ai_prompts
- `_dal_ai_log` enrichi : provider, action, status, error_message

### Frontend — 3 onglets

**Onglet Config** : dropdown provider (grisé si pas configuré), dropdown modèle, timeout, test connexion, bouton sauvegarder.

**Onglet Prompts** : textarea par prompt, sauvegarde individuelle, bouton réinitialiser.

**Onglet Journal** : tableau (date, fournisseur, modèle, action, tokens, latence, statut), pagination keyset.

### Fichiers

| Fichier | Modification |
|---------|-------------|
| `db/migrations/009_ai_admin.sql` | **Nouveau** : 3 tables |
| `config/config.php.example` | Clés API par provider |
| `api/dal/ai.php` | Refonte majeure |
| `api/endpoints/ai.php` | Nouvelles routes |
| `src/services/api.ts` | 5 endpoints AI admin |
| `src/services/queryKeys.ts` | Query keys AI |
| `src/features/admin/LiteLLMConfigPage.tsx` | Réécriture complète 3 onglets |

---

## Ordre d'implémentation

1. **F1 bug fix** — correction une ligne (~15 min)
2. **F1 filtre favoris** — backend + frontend (~2-3h)
3. **F3 titres éditeur** — contenu dans les fichiers markdown (~2-3h)
4. **F2 filtres URL** — refactoring CorpusSearchProvider (~3-4h)
5. **F4 LiteLLM config** — plus gros chantier (~6-8h)

F1 bug → F1 filtre et F3 en parallèle → F2 (intègre le paramètre `favoris` de F1) → F4.

## Vérification

- F1 : toggle favori fonctionne (visiteur + admin), filtre affiche seulement les favoris
- F2 : filtres dans l'URL, refresh conserve les filtres, login redirige avec filtres
- F3 : menu déroulant change le type de bloc, markdown exporté correct
- F4 : changement provider/modèle depuis l'UI, prompts éditables, journal des appels
