# 00 — Contexte produit

## Ce qu'est Lumosphère
Application web unique (installable en PWA) qui **prépare** des sources documentaires puis sert une **bibliothèque éditoriale** de citations/textes spirituels. Deux zones dans une même app :
- **Atelier** (ex-Epuriel) : importe PDF/Telegram/YouTube/HTML, nettoie, segmente, enrichit (IA), fait réviser.
- **Bibliothèque** (ex-Index Lulumineux) : conserve les entrées validées, gère auteurs/œuvres/thèmes/mots-clés/droits, sert consultation et recherche.

Entre les deux : une **frontière de validation**. L'atelier écrit en **staging** ; un Éditeur valide ; la bibliothèque intègre. **Rien n'entre au corpus sans validation humaine.**

## Décisions verrouillées (ne pas remettre en cause)
- **Stack** : React/Vite + API PHP + **une base MySQL/MariaDB** = source de vérité. (Le plan SvelteKit/Node/SQLite de l'ancien Index est abandonné.)
- **PWA installable, en ligne** : Windows/Linux/Mac/Android, un seul code, magasins via PWABuilder. **Pas d'Electron.** Couche d'abstraction conservée (Tauri possible plus tard).
- **Pas de hors-ligne** dans cette phase (internet requis).
- **Pas de format pivot fichier** : remplacé par des **tables de staging** + statut de validation.
- **Lots jetables** : un lot est un espace de travail effacé après import en base (sauf mode débogage) ; seuls les repères de collecte par source sont conservés.
- **Auth serveur** : sessions PHP (cookie httpOnly/Secure + CSRF). Aucun secret côté navigateur.
- **IA** : LiteLLM cloud, providers configurables (Ollama local abandonné).
- **Nom** : app = Lumosphère ; « Epuriel » = nom interne de l'atelier (les fonctions `epuriel_*` restent).

## Profils
Visiteur, Abo3, Abo4 (consultation, droits par œuvre) · Éditeur (édite + valide le staging) · Administrateur (tout). L'atelier est réservé Éditeur/Admin.

## Hors périmètre
Hors-ligne/cache ; édition hors-ligne synchronisée ; outil mobile d'édition pour 2-3 éditeurs (séparé, futur) ; app native magasin (Tauri) ; App Store Apple ; RAG/embeddings ; exports PDF/EPUB (phase 3).

## Cible
~50 000 entrées. Fiabilité avant rapidité. Vie privée (pas d'analytics tiers).
