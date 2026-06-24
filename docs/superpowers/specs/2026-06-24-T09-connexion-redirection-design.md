# T09 — Connexion + redirection : design

> Spec validée par brainstorming. Source : devbook développement §II.1 (Phase II), trame T09.
> **Dépend de T08** (squelette React : routage, AuthLayout, LoginPage placeholder, Header) et **T07** (moteur d'auth PHP, déjà livré). À coder **après** T08 — les deux tâches touchent les mêmes fichiers (LoginPage, Header, App), donc pas d'exécution en parallèle.

## Objectif

Construire la **partie visible** de l'authentification : écran de connexion, déconnexion, gestion de l'état « qui est connecté », protection des pages admin et redirection. Le moteur serveur (sessions PHP sécurisées, bcrypt, rate-limit, expiration 2 h, CSRF) est **déjà construit en T07** — T09 ne fait que l'interface.

---

## Contexte serveur (déjà en place, T07)

Endpoints disponibles (via `apiClient` dans `src/services/api.ts`) :

| Endpoint | Méthode apiClient | Rôle |
|----------|-------------------|------|
| `GET /auth/csrf` | `getCsrf()` | Jeton CSRF (déjà géré automatiquement par apiClient) |
| `GET /auth/me` | `getMe()` | Utilisateur courant `{ id, prenom, nom, email, role_id, role_nom }` ou `null` |
| `POST /auth/login` | `login(email, password)` | Crée la session, renvoie `{ id, prenom, nom, email, role_id }` |
| `POST /auth/logout` | `logout()` | Détruit la session |

Règles serveur à connaître :
- **Session** : cookie `httpOnly` + `Secure` + `SameSite=Lax`, expiration après **2 h d'inactivité**, révocable par un admin.
- **Rate-limit** : blocage après **5 tentatives** ratées pendant **30 min**. Message serveur : « Trop de tentatives. Réessayez dans X minutes. »
- **Identifiants erronés** : message serveur « Identifiants incorrects. »
- **401** : sur toute requête avec session expirée/révoquée. `apiClient.onSessionExpired(cb)` permet de réagir.
- **Rôles** (constantes serveur) : Administrateur=1, Éditeur=2, Visiteur=3, Abo3=4, Abo4=5.
- **Filtrage corpus** : un visiteur non connecté (rôle Visiteur) ne voit que les citations `Publiée` ; un Éditeur/Admin voit tous les états. Le filtrage est fait **côté serveur**, pas besoin de le refaire côté interface.

**Premier admin** : créé manuellement par le chef de projet via phpMyAdmin (hash bcrypt généré en ligne de commande). **Pas d'écran « premier démarrage » dans T09.**

---

## 1. État d'authentification (frontend)

Un contexte React `AuthProvider` enveloppe l'application et expose un hook `useAuth()`.

```ts
type AuthUser = {
  id: number
  prenom: string
  nom: string
  email: string
  role_id: number
  role_nom: string
}

useAuth(): {
  user: AuthUser | null
  loading: boolean              // true pendant la vérification initiale de session
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}
```

- **Au montage de l'app** : `AuthProvider` appelle `apiClient.getMe()`. Si une session est active, `user` est rempli → recharger la page ne déconnecte pas. Pendant cet appel, `loading = true`.
- **`login`** : appelle `apiClient.login()`, puis `apiClient.getMe()` (pour récupérer `role_nom`), remplit `user`. Renvoie `{ ok: true }` ou `{ ok: false, error }` (message serveur).
- **`logout`** : appelle `apiClient.logout()`, vide `user`.

Fichiers : `src/hooks/useAuth.ts` (contexte + hook), `AuthProvider` monté dans `src/main.tsx` autour de `<App />`.

---

## 2. Page de connexion (`/login`)

Remplace le placeholder créé en T08. Utilise `AuthLayout` (bandeau + carte centrée).

**Formulaire** :
- Champ email (type `email`, requis).
- Champ mot de passe (type `password`, requis) avec bouton œil (icône Phosphor `Eye` / `EyeSlash`) pour afficher/masquer.
- Bouton « Se connecter » (désactivé pendant l'envoi, avec indicateur de chargement).

**Validation côté client** : email et mot de passe non vides (schéma Zod). Le serveur revalide toujours.

**Affichage des erreurs** : message renvoyé par le serveur affiché dans la carte (zone `--color-danger-bg` / `--color-danger-text`) :
- « Identifiants incorrects. »
- « Trop de tentatives. Réessayez dans X minutes. »
- « Impossible de contacter le serveur. » (erreur réseau)

**Comportements** :
- Connexion réussie → redirection vers l'accueil (`/`).
- Déjà connecté et on visite `/login` → redirection immédiate vers l'accueil.

Fichier : `src/features/auth/LoginPage.tsx`.

---

## 3. Bandeau : connexion / déconnexion + menu selon le rôle

Modifie `src/components/Header.tsx` (créé en T08) pour réagir à l'état d'auth (`useAuth`) :

| État | Éléments affichés (à droite du bandeau) |
|------|------------------------------------------|
| Non connecté | Bascule thème · « Connexion » (→ `/login`) |
| Connecté (tout rôle) | Bascule thème · « Déconnexion » |
| Connecté **Admin ou Éditeur** | + lien « Admin » (→ `/admin`) |

- « Déconnexion » : icône Phosphor `SignOut`. Au clic → `logout()` puis redirection vers l'accueil.
- Le lien « Admin » n'apparaît que pour `role_id ∈ {1, 2}` (Administrateur, Éditeur).
- Comportement responsive (burger mobile) conservé : ces éléments passent dans le menu déroulant sur mobile.

Pas de nom d'utilisateur affiché (décision T08 : l'utilisateur connaît son nom).

---

## 4. Protection des pages

- **Accueil (`/`)** : publique. Aucun blocage côté interface — le serveur filtre déjà ce que chaque rôle voit (visiteur = `Publiée` seulement). Un éditeur/admin connecté voit tout.
- **Admin (`/admin`)** : protégée. Composant `RequireAuth` enveloppant la route :
  - Pendant `loading` : rien (ou indicateur discret).
  - Non connecté **ou** rôle hors {Administrateur, Éditeur} → redirection vers `/login`.
  - Sinon → affiche la page.
- **`/login`** : si déjà connecté → redirection vers `/`.

Fichier : `src/components/RequireAuth.tsx`.

---

## 5. Expiration / révocation de session

- Dans `AuthProvider`, brancher `apiClient.onSessionExpired(callback)`.
- Au déclenchement (401) : vider `user`, rediriger vers `/login`, afficher une notification (toast Sonner, déjà installé) : « Session expirée, reconnectez-vous. »

---

## 6. Redirection après connexion

Toujours vers l'accueil (`/`).

**Amélioration différée** (hors T09) : « retour à la page d'où l'on venait » après connexion (utile quand la session expire en plein travail). À coder **au plus tôt à T16** (référentiels admin : première vraie zone protégée multi-écrans) et **au plus tard à T20** (gestion/édition des entrées, où perdre sa place coûte cher).

---

## 7. Tests

### Vitest (unitaires)
- `useAuth` : `login` réussi remplit `user` ; `login` échoué renvoie `{ ok: false, error }` ; `logout` vide `user` ; `getMe` au montage restaure la session. (apiClient mocké.)

### Playwright (e2e)
- Connexion avec identifiants corrects → arrivée sur l'accueil, le bandeau affiche « Déconnexion ».
- Connexion avec identifiants incorrects → message d'erreur affiché, on reste sur `/login`.
- Déconnexion → le bandeau réaffiche « Connexion ».
- Accès à `/admin` sans être connecté → redirigé vers `/login`.
- Connecté en admin → le lien « Admin » est visible et mène à `/admin`.

Note : le blocage rate-limit est difficile à tester de façon fiable en e2e (état serveur partagé) ; couvert par le rendu du message côté unitaire/manuel.

### Quality gate
1. `pnpm lint` ✓
2. `pnpm build` ✓
3. `pnpm test` ✓
4. `pnpm test:e2e` ✓
5. `gitleaks detect -v` ✓

---

## 8. Ce qui n'est PAS dans T09

- Écran « premier démarrage » / création du premier admin (fait manuellement via phpMyAdmin).
- Gestion des utilisateurs/rôles (écran admin) → T16 / III.1.
- Liste des sessions actives + déconnexion forcée (UI admin) → plus tard (endpoints déjà présents).
- « Retour à la page d'où l'on venait » après connexion → T16/T20.
- Changement de mot de passe / mot de passe oublié → hors périmètre v1 connue.

---

## 9. Critères de validation

- [ ] Un éditeur/admin se connecte via le navigateur → session PHP active, cookie sécurisé visible (critère trame Tranche 1).
- [ ] Après connexion, les 6 citations de test (état « À Corriger ») sont visibles sur l'accueil.
- [ ] Recharger la page garde l'utilisateur connecté.
- [ ] Mauvais identifiants → message d'erreur clair, pas de connexion.
- [ ] Déconnexion → retour à l'accueil, bandeau « Connexion » réaffiché.
- [ ] `/admin` inaccessible sans connexion (redirige vers `/login`).
- [ ] Lien « Admin » visible uniquement pour Administrateur/Éditeur.
- [ ] Session expirée (2 h) → redirection vers `/login` + message.
- [ ] `gitleaks detect -v` ne détecte aucun secret.
