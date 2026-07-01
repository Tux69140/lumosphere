# Conventions de traitement — Lumosphère

Consolide les conventions de préparation documentaire (atelier), récupérées de l'archive Epuriel : `info - Formatage_md_pour_rag.md` (formatage RAG) et `Youtube*.md` (chaîne YouTube). **Abandons actés** : SDK Google natif → **LiteLLM** ; Celery/RQ/Redis/S3 → **`server_jobs` + cron** ; Electron / export pivot → **intégration directe au corpus**.

## 1. Principe : préparer pour la lecture ET le futur RAG

Le contenu maître est du **Markdown enrichi**. La préparation doit produire un texte **propre, structuré, fidèle** — jamais un résumé.

## 2. Garde-fou anti-résumé (règle dure)

Le nettoyage/structuration IA **ne doit pas perdre de contenu** : si le texte nettoyé est plus court que le brut de **plus de 20 %**, le résultat est **suspecté de résumé** → rejet/alerte et reprise. L'IA reformate (titres, ponctuation, segmentation), elle **ne condense pas**.

## 3. Formatage Markdown pour RAG

- **Front-matter YAML** en tête de chaque document : `title`, `author`, `category`, `tags`.
- **Synthèse exécutive** (H1 « Synthèse ») juste après le front-matter : 300–500 mots max, thèse + concepts clés + corrélations.
- **Nommer les sections explicitement** : jamais « Introduction » / « Analyse » seuls, mais « Introduction à la cosmogonie d'Urantia », etc.
- **Tableaux** : toujours accompagnés d'une **synthèse** juste avant ou après (le tableau = donnée brute, la synthèse = interprétation).
- **FAQ** optionnelle en fin de document pour cibler des formulations d'utilisateurs.
- **Segmentation** (`segments`) : ordre, type de segment, texte Markdown, hash de segment, timecodes éventuels (cf. modèle de données `_contexte-ia/02`).

## 4. Chaîne YouTube (Phase 2)

1. **Entrée** : URL de playlist déclarée → collecteur cron crée/sélectionne un **lot**, dépose le brut dans `0_raw/`.
2. **Transcription** : `yt-dlp` + `youtube-transcript-api` → transcription brute conservée dans le lot.
3. **Traitement IA en 2 passes via LiteLLM** :
   - **Passe Map** : découpage en blocs.
   - **Passe Clean** : nettoyage/structuration par bloc (modèle choisi, ex. `gemini/...`), **avec le garde-fou anti-résumé §2**.
4. **Timecodes** conservés (repères de navigation dans la transcription).
5. **Intégration** : à la validation du lot conforme → **écriture directe au corpus** (plus d'export pivot ni de ZIP autoritaire ; un ZIP n'est qu'une copie de consultation).

Tout traitement long passe par **`server_jobs` + cron** (jamais dans la requête web) ; les écrans YouTube passent par les **services applicatifs** (mêmes contrats que les autres sources, pas d'écran séparé).

## 5. Chaînes PDF / Telegram / HTML

Mêmes principes : brut dans `0_raw/`, traitement découplé (jobs+cron), formatage RAG §3, garde-fou §2, segmentation, puis **intégration directe au corpus** à la validation. Spécificités OCR (PDF) : outils à installer en venv (Tesseract/OCRmyPDF/Poppler), cf. stack §9.

## 6. Correspondance des styles de source → Markdown (chaîne Telegram)

Principe : tout style de source **non natif du Markdown** est traduit vers l'équivalent Markdown propre le plus proche — **jamais de HTML** dans le texte maître (cf. `docs/superpowers/specs/2026-07-01-formatage-styles-source-md-design.md`).

| Style Telegram | Devient en Markdown | Statut |
|---|---|---|
| gras / italique / barré / code | inchangé (`**`, `_`, `~~`, `` ` ``) | en place |
| souligné | gras + italique `***…***` (sens variable titre/emphase, tranché par l'humain en révision) | en place |
| texte masqué (spoiler) | *non géré* | différé — brancher si besoin réel |
| citation dépliable | *non géré* | différé — brancher si besoin réel |
| emoji personnalisé | *non géré* | différé — brancher si besoin réel |
| tout autre style inconnu | texte simple (style retiré) | comportement par défaut |

Table centralisée dans `tg_formatting_map()` (`cron/lib/telegram_pipeline.php`), utilisée par la collecte en direct (Bot API, entities) et par l'import d'historique (export Telegram Desktop) — source unique, pas de duplication.
