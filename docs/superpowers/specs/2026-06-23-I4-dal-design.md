# Spec I.4 — Complétion de la DAL (couche d'accès données)

> **Phase** : I.4 du devbook de développement
> **But** : compléter et sécuriser la couche d'accès aux données existante, créer le point d'entrée API, et ajouter la couche de services côté front.
> **Approche retenue** : compléter l'existant (option A), ne pas réécrire. Le code actuel (11 fichiers dans `api/dal/`) est solide et vérifié — on corrige les 2 failles mineures, on ajoute ce qui manque.

---

## 1. Corrections sur le code existant

Deux fichiers (`etats.php` et `roles.php`) utilisent des requêtes non préparées pour lire les données. Aucune donnée utilisateur n'est injectée dans ces requêtes, mais par cohérence et principe de précaution, les convertir en requêtes préparées comme les 9 autres fichiers.

---

## 2. Point d'entrée API (`bootstrap.php`)

Créer le fichier `api/bootstrap.php` qui sert de porte d'entrée unique pour toutes les demandes du navigateur :

- **Chargement de la configuration** : connexion base de données, fuseau horaire, chemins serveur (depuis `config/config.php`, hors dépôt).
- **Gestion des sessions** : démarrage de session PHP avec cookies sécurisés (`httpOnly`, `Secure`, `SameSite=Lax`).
- **Protection CORS** : autorise uniquement le domaine exact de l'application (pas de `*`), avec `credentials: true`.
- **Vérification CSRF** : contrôle du jeton sur toutes les opérations d'écriture (création, modification, suppression).
- **Routage** : dirige chaque demande vers le bon fichier DAL selon l'URL (`/api/citations` → `citations.php`, `/api/auteurs` → `auteurs.php`, etc.).
- **Format de réponse** : toutes les réponses en JSON, avec le format standard `{status, data, errors}` déjà utilisé dans la DAL.

---

## 3. Couche de services côté front

Créer un fichier unique `src/services/api.ts` qui centralise tous les appels au serveur.

**Rôle** : c'est l'intermédiaire entre l'interface React et le serveur PHP. L'interface ne contacte jamais le serveur directement — elle passe toujours par ce fichier.

**Contenu** : une fonction par opération (chercher des citations, créer un auteur, modifier un thème, etc.). Chaque fonction :
- Envoie la demande au serveur avec les cookies de session (`credentials: 'include'`).
- Joint le jeton CSRF sur les opérations d'écriture (`X-CSRF-Token`).
- Renvoie les données ou l'erreur dans un format standard côté front.

**Portabilité** : ce fichier est le seul point de contact avec le serveur. Pour une future appli bureau (Tauri) ou mobile (Android), on remplacera uniquement ce fichier sans toucher à l'interface.

**Architecture** : un seul fichier, suffisant pour le périmètre défini de Lumosphère. Découpage possible plus tard si nécessaire, sans risque.

---

## 4. Tests

Tests automatisés pour la couche de données, exécutés sur une base de test dédiée (pas la base de production).

### Règles métier testées
- Un visiteur ne voit que les citations publiées des œuvres publiques.
- Un abonné (Abo3/Abo4) ne voit que les œuvres auxquelles il a accès.
- Un éditeur voit toutes les citations, tous les états.
- Une citation ne peut pas passer en « Publiée » sans thème, date, auteur et mots-clés.
- Les mots-clés proposés par l'IA ne s'appliquent pas sans validation humaine.
- Les états système (À Corriger, À Réviser, Publiée) ne peuvent pas être supprimés.
- Le rôle Administrateur ne peut pas être supprimé ni réduit.
- Les thèmes ne dépassent pas 2 niveaux.
- La suppression est récupérable (suppression douce) — seul l'administrateur peut voir les éléments supprimés.

### Recherche testée
- Recherche insensible aux accents (« ame » trouve « âme »).
- Mots courts trouvés (« IA », 2 caractères).
- Filtres combinés (texte + auteur + thème + mots-clés).
- Mode OU et ET sur les mots-clés.

### Solidité testée
- Deux modifications simultanées sur la même citation : la seconde est bloquée, pas de perte de données.
- Pagination stable : les résultats ne sautent pas quand de nouvelles citations sont ajoutées pendant la navigation.

---

## 5. Structure des fichiers après I.4

```
api/
├── bootstrap.php          ← point d'entrée API (nouveau)
├── dal/
│   ├── core.php           ← utilitaires communs (existant)
│   ├── auteurs.php        ← (existant, inchangé)
│   ├── citations.php      ← (existant, inchangé)
│   ├── config.php         ← (existant, inchangé)
│   ├── etats.php          ← (existant, corrigé)
│   ├── favorites.php      ← (existant, inchangé)
│   ├── keywords.php       ← (existant, inchangé)
│   ├── oeuvres.php        ← (existant, inchangé)
│   ├── roles.php          ← (existant, corrigé)
│   ├── themes.php         ← (existant, inchangé)
│   └── users.php          ← (existant, inchangé)

src/
├── services/
│   └── api.ts             ← couche de services front (nouveau)

tests/
├── dal/                   ← tests de la couche données (nouveau)
```
