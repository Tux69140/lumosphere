# Carte des conditions de mot de passe — Design

**Date :** 2026-07-01
**Statut :** Spec validée (conception), implémentation à planifier
**Périmètre :** Écran unique `SetPasswordPage` (invitation + renouvellement) + petit ajout backend sur `tokenInfo`.

## Objectif

Afficher, sur l'écran de définition/renouvellement de mot de passe, une **carte listant les conditions à remplir**, qui :

- se met à jour **en temps réel** pendant la frappe (coche verte dès qu'une condition est remplie) ;
- affiche un **décompte** pour la longueur (« encore N caractères ») ;
- **s'adapte au niveau d'accès** en cours de paramétrage (en-tête + seuils requis) ;
- rend transparentes les 4 conditions, y compris les 2 aujourd'hui découvertes seulement après un échec serveur.

## Contexte existant (source de vérité actuelle)

- Écran unique : `src/features/auth/SetPasswordPage.tsx` (route `definir-mot-de-passe`), utilisé pour **invitation** (`type=invite`) et **renouvellement** (`type=reset`).
- Validation client actuelle : `minLength = isPrivileged ? 12 : 8` ; soumission gatée sur robustesse `strong` pour les privilégiés uniquement ; jauge affichée seulement pour les privilégiés.
- Validation serveur (juge final) : `api/dal/password_policy.php` → `dal_password_validate()` :
  - longueur : `is_privileged ? 12 : 8` ;
  - liste noire de mots courants (`PASSWORD_BLACKLIST`, ~15 entrées, insensible à la casse) ;
  - ressemblance interdite avec prénom / nom / partie locale de l'email (si segment ≥ 4 caractères) ;
  - robustesse via zxcvbn PHP : privilégié score ≥ 3 (« Fort »), non-privilégié score ≥ 2 (« Moyen »).
- `isPrivileged = role ∈ {Admin, Éditeur}`. Les autres rôles (Visiteur, Abo3, Abo4) sont « standard ».
- Info renvoyée aujourd'hui par `apiClient.tokenInfo(token)` : `role_id` + `type` uniquement.
- Support existant : `PasswordStrengthMeter.tsx`, `usePasswordStrength.ts` (zxcvbn via `@zxcvbn-ts/core`, import dynamique).
- Pas de composant `Card`/`Alert` générique ; patterns Tailwind ad hoc. Icônes : `@phosphor-icons/react`.

## Décisions validées

1. **Règles plus strictes selon le rôle** — on conserve la distinction existante privilégié (12 + Fort) vs standard (8 + Moyen). Pas de nouvelle politique par rôle individuel : on réutilise le binaire existant.
2. **Les 4 conditions affichées** dans la carte : longueur, robustesse, pas trop courant, ne ressemble pas au nom/email.
3. **Vérification en direct pour les 4** — nécessite un ajout serveur (voir plus bas).

## Conception

### A. La carte (UI)

Placée sous le champ mot de passe. Remplace/absorbe la jauge actuelle.

```
┌─────────────────────────────────────────────┐
│ 🛡️  Compte Administrateur — sécurité renforcée │
│                                               │
│  ✓  Au moins 12 caractères                    │
│  ○  Robustesse : Fort   [▓▓▓░] Moyen          │
│  ✓  Pas un mot de passe trop courant          │
│  ○  Ne ressemble pas à votre nom / email      │
└─────────────────────────────────────────────┘
```

- **En-tête adapté au rôle** :
  - privilégié → icône bouclier + « Compte {LibelléRôle} — sécurité renforcée » ;
  - standard → « Compte {LibelléRôle} — sécurité standard » (ton plus léger, pas de bouclier ou bouclier neutre).
- **Ligne longueur** : tant que non atteinte → « encore N caractères » (décompte). Atteinte → coche verte + « Au moins {min} caractères ».
- **Ligne robustesse** : mini-jauge intégrée (fusion de `PasswordStrengthMeter`) + rappel du niveau requis (« Fort » privilégié / « Moyen » standard). Passe au vert quand le seuil requis est atteint.
- **Ligne « pas trop courant »** : coche quand le mot de passe n'est pas dans la liste noire.
- **Ligne « ne ressemble pas au nom/email »** : coche quand aucun segment ≥ 4 caractères du prénom/nom/partie locale email n'est contenu dans le mot de passe (miroir de la règle serveur).
- **Construction** : à partir des primitives Tailwind existantes (enveloppe carte `rounded-lg border border-(--color-border) bg-(--color-bg-card) p-…`), icônes Phosphor (`ShieldCheck`, `CheckCircle` / `Circle`).

### B. Comportement

- **Calcul en direct** à chaque frappe, côté navigateur, reproduisant **exactement** les 4 règles serveur.
- **Bouton « Valider » désactivé** tant que les 4 conditions ne sont pas vertes **et** que le champ confirmation est identique. Le champ « confirmation identique » reste géré à part (hors carte), affiché près du champ de confirmation.
- **Le serveur reste le juge final** : la carte est une aide visuelle. En cas de divergence improbable, le message d'erreur serveur s'affiche comme aujourd'hui (bloc `--color-danger-*`).
- **Accessibilité** :
  - chaque ligne expose son état via `aria` (ex. liste avec état validé/non validé, `aria-live` mesuré pour ne pas spammer le lecteur d'écran) ;
  - état signalé par **icône + texte**, pas uniquement par la couleur (WCAG AA) ;
  - contraste conforme AA.

### C. Ajout backend

`apiClient.tokenInfo(token)` (endpoint correspondant côté PHP) doit renvoyer, en plus de `role_id` et `type` :

- `prenom`, `nom`, `email` — pour la vérification live « ne ressemble pas au nom/email » ;
- `role_label` (libellé lisible du rôle) — pour l'en-tête de la carte.

Justification confidentialité : ce sont **les données du propre compte de l'utilisateur**, accédées via **son propre jeton** à usage unique/temporaire. Pas de fuite : l'utilisateur connaît déjà son nom et son email.

### D. Cohérence des règles (dette maîtrisée)

Les règles existent déjà en double (client `SetPasswordPage` + serveur `password_policy.php`). La carte amplifie ce besoin de cohérence (longueur, seuils zxcvbn, liste noire, logique de ressemblance).

- Regrouper la logique client dans un **module dédié** (ex. `src/features/auth/passwordPolicy.ts`) exposant, pour un rôle donné, les 4 vérifications + le décompte, réutilisé par la carte et par le gating du bouton.
- Ce module reste un **miroir** de `api/dal/password_policy.php` (le serveur est la source de vérité). Documenter le lien (commentaire croisé) pour maintenir la cohérence lors d'un futur changement de règle.
- La liste noire des mots courants est dupliquée client-side (petite liste stable) ; commentaire pointant vers `PASSWORD_BLACKLIST` côté PHP.

## Périmètre

- **Couvre** invitation ET renouvellement (même écran) d'un seul travail.
- **Hors périmètre** : aucune page « changer mon mot de passe en étant connecté » (n'existe pas aujourd'hui, non demandée). Le flux « premier admin » (`auth/setup`) n'a pas d'écran React actif : non traité ici.

## Tests

- **Unit (Vitest)** sur le module `passwordPolicy.ts` : chaque règle (longueur/décompte, liste noire, ressemblance nom/email, seuils robustesse privilégié vs standard) + combinaison → état global « prêt à valider ».
- **Composant** : la carte reflète correctement chaque état ; en-tête change selon le rôle ; décompte correct.
- **e2e (Playwright)** : parcours invitation privilégié + parcours renouvellement standard — la carte passe au vert, le bouton s'active, la soumission réussit.
- **Backend** : `tokenInfo` renvoie bien les nouveaux champs pour un jeton valide ; ne les renvoie pas / erreur propre pour jeton invalide ou expiré.
- **Non-régression** : validation serveur inchangée (mêmes refus qu'avant).

## Risques / points d'attention

- Divergence client/serveur des règles → mitigée par module dédié + commentaires croisés + tests unitaires miroir.
- `aria-live` trop verbeux pendant la frappe → mesurer les annonces (annoncer les changements d'état, pas chaque caractère).
- Ne pas exposer d'info sensible au-delà du strict nécessaire (uniquement prénom/nom/email/role_label du propriétaire du jeton).
