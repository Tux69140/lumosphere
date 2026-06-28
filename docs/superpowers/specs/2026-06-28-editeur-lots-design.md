# Spec — Poste de travail d'édition des lots

**Date** : 2026-06-28
**Scope** : Réécriture du composant `DetailLot` pour en faire un vrai poste de travail d'édition, avec éditeur riche, fusion de posts, date modifiable, oeuvre au niveau du lot, et layout éditeur/métadonnées côte à côte.

## Contexte

L'interface actuelle du `DetailLot` utilise un simple `<textarea>` pour éditer les textes des posts Telegram. L'éditeur riche Milkdown est déjà intégré dans le projet (utilisé dans `CitationEditor.tsx`) mais pas encore branché sur les lots. Il manque également : la fusion de posts, la correction de date, et l'oeuvre héritée du lot.

Le composant `DocumentCard` dans `DetailLot.tsx` est le seul fichier à réécrire. Les hooks (`useLots.ts`), les types (`types.ts`), l'API (`api.ts`), et le backend (`api/dal/lots.php`, `api/endpoints/lots.php`) sont déjà en place.

## Décisions

| # | Décision | Choix |
|---|----------|-------|
| D1 | Layout de chaque carte | Éditeur gauche 75% + métadonnées droite 25% (sticky) |
| D2 | Éditeur de texte | Milkdown (composant `MarkdownEditor` existant) |
| D3 | Oeuvre | Sélecteur au niveau du lot (en-tête), hérité par les posts, surchargeable post par post |
| D4 | Date | Champ `input[type=date]` éditable par post, pour raisons éditoriales |
| D5 | Fusion de posts | Bouton "Fusionner ↑" sur chaque carte (sauf la 1re), fusionne texte + mots-clés dans le post précédent, supprime le post courant |
| D6 | IA | Post par post (boutons IA sur chaque carte, pas de bouton global) |
| D7 | Responsive | 2 colonnes desktop (75/25) → 1 colonne empilée mobile/tablette |

## Architecture des composants

### En-tête du lot (dans `DetailLot`)

- Titre du lot
- Badge statut + boutons transition d'état
- **Sélecteur d'oeuvre du lot** : `<select>` qui propage aux posts non-surchargés (via `PUT /api/lots/{id}/document` sur chaque document dont `oeuvre_id` n'a pas été manuellement changé)
- Compteur "N/M messages inclus"
- Boutons "Vérifier conformité" et "Intégrer au corpus" (état `pret` uniquement)

### Carte de post (`DocumentCard`)

Layout en 2 colonnes :

**Colonne gauche (75%)** :
- En-tête : numéro du message (`#source_item_id`), champ date éditable, boutons "Inclus/Exclu" et "Fusionner ↑"
- Composant `MarkdownEditor` (Milkdown) chargé avec `contenu_revise ?? contenu_brut`
- Compteur de caractères + bouton "Enregistrer" visible uniquement si le texte a été modifié

**Colonne droite (25%, `sticky top-20`)** :
- **Thème** : `<select>` + bouton IA
- **Oeuvre** : `<select>` pré-rempli depuis le lot, modifiable
- **Mots-clés** :
  - Badges existants avec bouton `×` pour supprimer
  - Suggestions IA en badges pointillés ambrés (clic = accepter)
  - Champ texte "Ajouter..." + Entrée pour ajout manuel

Sur mobile (`< lg`), les deux colonnes s'empilent verticalement (éditeur en haut, métadonnées en bas).

### Fusion de posts

Bouton **"Fusionner ↑"** visible sur toutes les cartes sauf la première :

1. Récupère `contenu_revise ?? contenu_brut` du post courant
2. Appelle `PUT /api/lots/{id}/document` sur le post précédent pour ajouter le texte à la fin de son `contenu_revise` (séparé par `\n\n`)
3. Combine les mots-clés des deux posts (union)
4. Appelle `DELETE /api/lots/{id}/document/{doc_id}` pour supprimer le post courant
5. Invalide le cache TanStack Query du lot detail pour rafraîchir la liste

**Backend** : ajouter un endpoint `DELETE /api/lots/{lotId}/document/{docId}` dans `api/endpoints/lots.php` et une fonction `dal_delete_lot_document()` dans `api/dal/lots.php`. Suppression physique (pas soft-delete — c'est un document de travail, pas du corpus).

### Date modifiable

Chaque carte affiche un `<input type="date">` dans son en-tête, pré-rempli avec `doc.date_publication` (converti en format `YYYY-MM-DD`). La modification appelle `PUT /api/lots/{id}/document` avec `{ document_id, date_publication }`.

Le champ `date_publication` existe déjà dans la table `documents` et dans le type `LotDocument`.

### Éditeur riche Milkdown

Remplacement direct du `<textarea>` par :

```tsx
<MarkdownEditor
  value={doc.contenu_revise ?? doc.contenu_brut ?? ''}
  onChange={(md) => setEditText(md)}
/>
```

Le composant `MarkdownEditor` est déjà une façade lazy-loaded vers Milkdown. Il gère la toolbar (titres, emojis, images, footnotes), le mode source Markdown, et le roundtrip CommonMark.

La sauvegarde reste identique : bouton "Enregistrer" qui appelle `PUT /api/lots/{id}/document` avec `{ document_id, contenu_revise }`.

## Changements par fichier

| Fichier | Action |
|---------|--------|
| `src/features/atelier/components/DetailLot.tsx` | Réécriture du `DocumentCard` (Milkdown, layout 75/25, date, fusion, oeuvre lot) |
| `api/endpoints/lots.php` | Ajouter `DELETE /api/lots/{id}/document/{docId}` |
| `api/dal/lots.php` | Ajouter `dal_delete_lot_document()` |
| `src/services/api.ts` | Ajouter `deleteLotDocument(lotId, docId)` |
| `src/features/atelier/useLots.ts` | Ajouter `useDeleteLotDocument()` + `useMergeLotDocuments()` |

## Hors scope

- Bouton IA global sur tout le lot (décision D6 : post par post uniquement)
- Regroupement logique sans fusion (décision : fusion texte uniquement)
- Explorateur de fichiers et aperçu contenu (différés en Tranche 5)
- Virtualisation des cartes (pas nécessaire pour 5-30 posts par lot Telegram)

## Vérification

1. L'éditeur Milkdown s'affiche et fonctionne dans chaque carte de post
2. Les métadonnées (thème, oeuvre, mots-clés) sont dans le panneau droit sticky
3. La fusion de deux posts fonctionne : texte combiné, mots-clés fusionnés, post supprimé
4. La date est modifiable et sauvegardée en base
5. L'oeuvre du lot se propage aux posts
6. Le layout passe en une colonne sur mobile
7. `pnpm build` et `pnpm tsc --noEmit` passent sans erreur
