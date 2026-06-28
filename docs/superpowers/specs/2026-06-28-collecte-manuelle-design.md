# Collecte manuelle & moteur d'import historique (Tranche 6 — T40)

Date : 2026-06-28

## Contexte

La chaîne Telegram fonctionne aujourd'hui uniquement par **tâches programmées** (crons o2switch) :

1. **Collecte** (`cron/collect_telegram_bot.php`, 2×/jour) — interroge l'API Bot Telegram (`getUpdates`) → remplit `telegram_updates_buffer`.
2. **Agrégation** (`cron/agregateur_telegram_weekly.php`, lundi) — transforme les messages de la **semaine précédente** en 1 lot/source + documents + crée un job `process_telegram_v2`.
3. **Enrichissement** (`cron/run_jobs.php`) — le worker Python `workers/process_telegram_v2.py` nettoie le texte → `documents.contenu_revise` → lot `en_revision`.

Deux besoins non couverts :

- **Déclenchement manuel** : l'éditrice veut lancer collecte→agrégation→nettoyage **à la demande**, sans attendre l'horaire des crons.
- **Récupération de l'historique** (~7000 messages) : le **bot Telegram ne peut pas** lire les anciens messages (limite de l'API Bot). Il faut un chemin séparé pour ingérer l'historique exporté, sans noyer l'éditrice sous des milliers de lignes.

Cette tranche couvre les deux, en posant un **moteur d'import générique** réutilisable demain pour YouTube / PDF / articles.

---

## Décisions de design (validées par le chef de projet)

| # | Sujet | Décision |
|---|-------|----------|
| 1 | Déclenchement live | **Un picto** « ⟳ Tout récupérer maintenant » à droite de la ligne `telegram` dans la carte **SOURCE** de l'atelier. Enchaîne les 3 étapes (collecte → agrégation → nettoyage). |
| 2 | Ordre live | **Collecte D'ABORD, puis agrégation** (chercher du neuf sur Telegram avant de fabriquer le lot). |
| 3 | Périmètre live | Le picto ramasse **tout le « en attente »** (tous les messages live du tampon pas encore mis en lot), **1 lot par canal**. |
| 4 | Exécution | **Arrière-plan** : la partie rapide (collecte + lot) est synchrone, le **nettoyage tourne en coulisse** (worker réveillé immédiatement). Le lot apparaît aussitôt en `en_traitement`. Conforme à « pas de tâche longue en HTTP ». |
| 5 | Suivi | Statut visible dans l'atelier (solution A) **+ toasts** (sonner) qui suivent partout : « lancé » / « prêt ✅ » (avec **lien cliquable** vers le lot) / « erreur ⚠️ » (rouge). Toasts avec lien = persistants/fermables, pas d'auto-disparition rapide. |
| 6 | Détection de fin | L'appli **sonde** discrètement le statut du/des lot(s) créés (toutes les ~3–5 s) tant qu'un traitement est en cours, puis lance le toast et s'arrête. |
| 7 | Historique — ingestion | **Import d'un fichier d'export Telegram Desktop (JSON)**, via un **script SSH** lancé par un admin. Pas de page web, pas de compte Telethon sur le serveur mutualisé. |
| 8 | Historique — découpage | **1 lot par semaine** (~70 msg/lot). |
| 9 | Historique — dosage | **Réapprovisionnement automatique** (Option A) : maintenir **≤ 8 lots historiques « en attente »**, refabriqués au fur et à mesure que l'éditrice avance. + bouton bonus « m'en donner plus ». |
| 10 | Séparation des flux | La réserve marque chaque message d'une **origine** (`live` / `historique`). L'agrégation live ne lit que `live`, le tapis roulant ne lit que `historique`. **Jamais de mélange.** |
| 11 | Interrupteur | Réglage **par source** « import historique : actif / terminé » pour couper le tapis quand l'historique est épuisé. |
| 12 | Généricité | **Poser les fondations génériques** (moteur réserve → découpage → réappro), prouvées sur Telegram. YouTube/PDF/articles se brancheront plus tard (sources non en dev actuellement). Pas de sur-ingénierie. |

---

## Architecture — le moteur générique

Un **seul moteur** alimente l'atelier, par deux entrées qui ne se mélangent jamais.

```
                    ┌─────────────── LA RÉSERVE ───────────────┐
                    │  telegram_updates_buffer                  │
                    │  chaque ligne : origin = live | historique│
                    └───────────────────────────────────────────┘
        ▲ ENTRÉE 1 : LIVE (bot)                       ▲ ENTRÉE 2 : HISTORIQUE (script SSH)
        │ picto ⟳ dans l'atelier                      │ php cron/import_telegram_history.php
        │ → getUpdates → réserve (origin=live)        │ → lit l'export JSON → réserve (origin=historique)
        ▼                                             ▼
  AGRÉGATION IMMÉDIATE                          TAPIS ROULANT (réappro auto)
  1 lot/canal, tout le « live » en attente      maintient ≤ 8 lots « historique » en attente,
  → job process_telegram_v2                      découpage hebdo → job process_telegram_v2
        └──────────────┬──────────────────────────────┘
                       ▼
       run_jobs / worker : nettoyage + (IA passe 1)
                       ▼
              Lot « en_revision » dans l'atelier
                       ▼
       Toasts : lancé / prêt ✅ (lien) / erreur ⚠️
```

### Le « découpeur » (point d'extension générique)

Le schéma **réserve → découpage en petits lots → réapprovisionnement** est commun à toutes les sources. Seule la stratégie de **découpage** change :

| Source | Stratégie de découpage | Unité du lot |
|--------|------------------------|--------------|
| **Telegram** (cette tranche) | par **semaine** | 1 message = 1 document |
| YouTube (futur) | 1 playlist → 1 lot **par vidéo** | 1 transcription = 1 document |
| PDF / ebook (futur) | 1 document → 1 lot **par chapitre/extrait** | 1 extrait = 1 document |
| Articles (futur) | par **article** (ou paquet) | 1 article = 1 document |

Le moteur (`topup_historical_lots`) appelle un découpeur paramétré par `source_type` ; pour Telegram, le découpeur est « prochaine semaine non sortie de la réserve historique ».

---

## Données (migration 011, appliquée via phpMyAdmin)

Le compte SSH n'a pas les droits DDL — la migration s'applique via phpMyAdmin (compte cPanel), comme les précédentes.

**ALTER `telegram_updates_buffer`** :
- `origin ENUM('live','historique') NOT NULL DEFAULT 'live'` — sépare les deux flux.
- Index `(collect_source_id, origin, buffer_status)` pour les requêtes d'agrégation/réappro.

**ALTER `collect_sources`** :
- `history_import_enabled TINYINT(1) NOT NULL DEFAULT 0` — l'interrupteur du tapis roulant.
- Seuil (`history_lot_target`, défaut 8) et découpage (`history_slice`, défaut `week`) rangés dans le `config_json` existant (pas de nouvelle colonne).

Tables réutilisées **sans modification** : `lots`, `documents`, `server_jobs`, `journal_events`, `keywords`, `lot_document_keywords`.

---

## Backend PHP

### Module partagé (anti-duplication)

🆕 `cron/lib/telegram_pipeline.php` — centralise la logique appelée par **les crons ET l'endpoint** :
- `tg_collect_into_buffer(PDO, config, origin='live')` — `getUpdates` → réserve (origine paramétrée). Réutilise les helpers existants de `collect_telegram_bot.php`.
- `tg_aggregate_pending(PDO, origin, scope)` — fabrique 1 lot/canal depuis le « en attente » de l'origine donnée (au lieu de la logique « semaine précédente » figée). Réutilise `generate_lot_for_source()`.
- `tg_topup_historical(PDO, source, target)` — le tapis roulant : tant que `lots historiques en attente < target` ET stock restant, découpe la prochaine semaine → lot + job.
- `tg_with_source_lock(PDO, source_id, fn)` — verrou `GET_LOCK()` anti-collision (clic + cron, ou double clic).

✏️ `cron/collect_telegram_bot.php` + `cron/agregateur_telegram_weekly.php` — basculent sur le module partagé, écrivent `origin='live'`, filtrent `origin='live'`.

### Script d'import historique (SSH)

🆕 `cron/import_telegram_history.php <collect_source_id> <export.json> [export2.json ...]` :
- Lit l'export Telegram Desktop (JSON ; gère le découpage multi-fichiers `messages.json`, `messages2.json`…).
- Ne garde que le **texte** (id, date, texte) — pas les médias.
- `INSERT IGNORE` dans la réserve avec `origin='historique'` (dédup par `update_id`/`message_id`).
- Active `history_import_enabled = 1` sur la source.
- Affiche un récapitulatif (n messages ingérés, n ignorés/doublons).

### Endpoint API

🆕 `api/endpoints/collecte.php` → `endpoint_collecte()` (auto-découvert par le routeur) :
- `POST /api/collecte/run` — **picto live** : collecte → agrégation → réveille le worker en coulisse → renvoie les `lot_id` créés.
- `POST /api/collecte/topup` — **tapis roulant** : réapprovisionne jusqu'au seuil ; param `more` pour le bouton « m'en donner plus » (incrément ponctuel).

🆕 `api/dal/collecte.php` :
- Vérifie la permission `atelier.lots` (lecture/gestion atelier).
- Appelle le module partagé sous verrou.
- **Réveille le worker en arrière-plan** : `exec('nohup php .../cron/run_jobs.php > /dev/null 2>&1 &')` (pattern « exec » déjà autorisé par les règles backend) — c'est ce qui permet de ne **pas attendre le cron**.
- Renvoie le format standard `{status, data, errors}`.

Pas de modification du routeur (`api/router.php` mappe `collecte` → `endpoints/collecte.php` automatiquement).

---

## Frontend

✏️ `src/features/atelier/AtelierPage.tsx` :
- **Picto ⟳** à droite de la ligne `telegram` dans la carte SOURCE (à côté du filtre). Tooltip « Tout récupérer maintenant ». État de chargement pendant l'appel.
- **Pastille de progression historique** (« 12 / 98 lots ») quand `history_import_enabled` est actif.
- Appel `topup` **au montage** de la page (réapprovisionne quand l'éditrice ouvre l'atelier).
- Bouton **« m'en donner plus »** (appel `topup?more`).

🆕 `src/features/atelier/useCollecte.ts` :
- Mutations React Query `useRunCollect()`, `useTopup()` — appellent l'API via le client de services (jamais `fetch` direct), invalident `queryKeys.lots` après succès.
- **Hook de sondage** : après un `run`, sonde le statut des lots créés (~3–5 s) tant qu'ils sont `en_traitement` ; à l'arrivée en `en_revision` → toast `success` avec lien ; à `erreur` → toast `error` rouge avec lien.
- Toasts via **sonner** (déjà installé). Toast « lancé » dès le clic.

✏️ `src/services/queryKeys.ts` + client de services — nouvelles clés et méthodes `collecte.run()`, `collecte.topup()`.

---

## Robustesse & cas limites

- **Anti-collision** : `GET_LOCK()` par source le temps de collecte/agrégation ; si occupé → message « collecte déjà en cours ». La réserve dédoublonne par `update_id` → recliquer est sans danger.
- **Telegram injoignable** : le picto renvoie une erreur → toast rouge ; aucun lot fantôme créé (collecte avant agrégation, en transaction).
- **Réserve vide** : le picto crée 0 lot → toast « aucun nouveau message ». Le tapis s'arrête tout seul quand le stock historique est épuisé.
- **Cron + picto simultanés** : le marqueur `buffer_status = lot_created` garantit qu'un message n'est agrégé qu'une fois ; le second arrivant ne trouve rien.
- **Dédup corpus** : inchangée — la garde existante à l'intégration (`telegram_message_id` / `hash_contenu`) protège déjà contre les doublons historique↔live.

---

## Tests (matrice testing.md)

- **Vitest** : `tg_topup` logique (seuil 8, découpage hebdo, séparation live/historique), hook de sondage → déclenchement des toasts.
- **PHP** : `php -l` sur les nouveaux fichiers ; test du script d'import sur un petit JSON d'exemple (3–4 messages) ; test des helpers de pipeline (collecte/agrégation « pending »).
- **Python** : worker `process_telegram_v2.py` inchangé (garde anti-résumé déjà en place).
- **Manuel** : clic picto → lot `en_traitement` → toast « prêt » avec lien → révision ; script d'import → réserve historique → ouverture atelier → 8 lots apparaissent.
- **Quality gate** : `pnpm lint` + `pnpm build` + `pnpm tsc --noEmit` ; `gitleaks detect -v` (le jeton bot reste dans `config.php`, hors dépôt).

---

## Vérification

1. **Migration 011** s'applique sans erreur (origin + history_import_enabled présents).
2. **Picto live** : un clic collecte, crée 1 lot/canal du « en attente », lance le nettoyage en coulisse, renvoie les ids immédiatement.
3. **Toasts** : « lancé » au clic, « prêt ✅ » avec lien à la fin, « erreur ⚠️ » rouge en cas d'échec ; les toasts à lien restent jusqu'au clic.
4. **Séparation** : un message `live` n'atterrit jamais dans un lot historique et inversement.
5. **Tapis roulant** : avec un stock historique, l'atelier maintient ≤ 8 lots `en_attente` « Telegram historique » ; « m'en donner plus » en ajoute.
6. **Interrupteur** : `history_import_enabled = 0` arrête toute génération historique.
7. **Anti-collision** : un clic pendant qu'un cron tourne ne crée pas de doublon.
8. **Généricité** : le découpeur Telegram est isolé derrière `topup_historical_lots(source_type)` — prêt à recevoir un découpeur YouTube/PDF/article.
