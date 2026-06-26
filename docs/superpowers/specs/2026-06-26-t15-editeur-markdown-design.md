# T15 — Note de choix de l'éditeur Markdown riche

**Date :** 2026-06-26
**Tâche :** T15 (trame, ligne 66) — « Décision éditeur Markdown : évaluation candidats (TipTap/Milkdown/MDXEditor/BlockNote), prototype »
**Statut :** décision arrêtée → **Milkdown**
**Préalable à :** T19 (éditeur riche complet, devbook §III.5)

---

## 1. Besoin et critères

Sources : cahier des charges §16, devbook §I.5 / §III.5, `.claude/rules/frontend.md`.

| Critère | Exigence |
|---|---|
| Format source | Markdown standard **donnée-maître** (CommonMark + tableaux GFM), HTML dérivé |
| Aller-retour | Sérialiser / désérialiser **sans perte** (critère décisif) |
| Rendu | WYSIWYG **type Typora**, **bascule source** possible |
| Barre d'outils | gras, italique, titres H1–H4, listes, citation, liens, images, tableaux visuels, notes de bas de page, emojis, annuler/rétablir, reset |
| Images | insérées **par référence Markdown** (`![alt](chemin)` + alt + légende + chemin stable) — pas de DataURI |
| Stack | React 19 + TypeScript + Tailwind |
| Licence | MIT / Apache (pas de licence virale) |
| Avenir | usage **smartphone** : petit écran lisible malgré le clavier affiché |

---

## 2. Évaluation des candidats

Vérifié sur documentation à jour (Context7, 2026-06-26).

| Éditeur | Modèle interne | Aller-retour Markdown | Notes bas de page | Mobile | Licence | Verdict |
|---|---|---|---|---|---|---|
| **Milkdown** | ProseMirror **+ remark** (Markdown natif) | ✅ excellent — le Markdown *est* le moteur | via plugin remark | réglable | MIT | **RETENU** |
| MDXEditor | Lexical + remark (Markdown natif) | ✅ très bon | incertain | bon | MIT | orienté MDX (JSX inutile ici) |
| TipTap | ProseMirror (interne HTML) | ⚠️ Markdown = export traduit, cas limites à corriger | custom | bon (headless) | MIT | **plan B** |
| BlockNote | Blocs façon Notion | ❌ import Markdown **documenté « lossy »** (perte) | non | faible (poignées/glisser) | MPL-2.0 | **éliminé** |

**BlockNote éliminé** : sa propre documentation indique que la conversion Markdown est « lossy » (non-perte uniquement via export JSON), ce qui contredit le choix « Markdown = donnée-maître » ; licence MPL plus contraignante que MIT/Apache ; interface tactile la moins adaptée au smartphone.

---

## 3. Décision : Milkdown

Milkdown est retenu parce que :

1. **Aller-retour garanti par conception** — son moteur interne est le Markdown (via remark). Le critère décisif des docs est satisfait structurellement, pas par rustines.
2. **Couverture fonctionnelle** — notes de bas de page (plugin remark), tableaux GFM visuels, images par référence, emojis (plugin).
3. **Confort « type Typora »** — exactement la philosophie décrite au cahier §16.
4. **Licence MIT** et compatibilité React 19 / TypeScript.

**Faiblesses assumées** (prises en charge à l'implémentation) : communauté plus restreinte que TipTap, montées de version parfois cassantes, réglages mobiles à soigner (famille ProseMirror).

**Plan B explicite : TipTap** — à retenir seulement si la longévité de l'écosystème et le contrôle total de l'interface mobile devaient primer sur la fidélité native de l'aller-retour. Coût : fiabiliser l'aller-retour et les notes de bas de page par du code maison.

---

## 4. Périmètre du prototype T15

**Inclus :**

1. Composant réutilisable **`MarkdownEditor`** — interface propre `value: string (markdown)` → `onChange(markdown)`. Les rouages Milkdown restent **encapsulés** : changer d'éditeur un jour = remplacer cette seule pièce.
2. **Barre d'outils complète** (cahier §16) : gras/italique, titres H1–H4, listes, citation, liens, **image par référence** (alt + légende + chemin), **tableaux visuels**, **notes de bas de page**, **emojis**, annuler/rétablir, reset, **bascule source**.
3. **Page labo** (route dédiée, ex. `/admin/labo-editeur`) : édition + panneau « source Markdown » en direct = prototype cliquable.
4. **Tests d'aller-retour** (Vitest) sur un document piégeux complet.
5. **Barre d'outils responsive** (compacte, défilement horizontal, zone d'édition utilisable sur petit écran).

**Exclus (relèvent de T19 ou plus tard) :** sauvegarde serveur réelle d'une entrée (POST sous session, **verrou d'édition**, réindexation FULLTEXT) ; branchement à l'écran d'édition d'entrée du corpus.

---

## 5. Approche technique

- **Paquets :** `@milkdown/crepe` + `@milkdown/react` (+ `@milkdown/kit` pour presets/plugins commonmark/gfm).
- **Crepe vs kit (à arbitrer tôt) :** démarrer avec Crepe (clé en main, type Typora). Si sa barre d'outils imposée ne permet pas couramment **bascule source + notes de bas de page + emojis + toolbar mobile sur mesure**, basculer sur `@milkdown/kit` (core + commonmark + gfm + listener + plugins) avec **toolbar React maison**. Choix par défaut si la personnalisation coince : kit + toolbar maison.
- **Notes de bas de page :** plugin remark dédié (GFM footnotes) + nœud d'édition. *Risque signalé, à valider en début de codage.*
- **Emojis :** `@milkdown/plugin-emoji` (palette). *Risque signalé de même.*
- **Image par référence :** bouton ouvrant un petit formulaire (chemin + alt + légende) → insère `![alt](chemin)`. Aucune dépendance externe.
- **Bascule source :** bouton basculant entre vue WYSIWYG et Markdown brut.
- **Encapsulation :** tout passe par `MarkdownEditor` ; la page labo ne consomme que ses props.

**Fichiers prévus :**
- `src/components/MarkdownEditor.tsx`
- `src/features/admin/LaboEditeurPage.tsx` (+ route SPA)
- `src/components/__tests__/MarkdownEditor.roundtrip.test.tsx`
- `package.json` (dépendances Milkdown)

---

## 6. Recette de vérification

1. `pnpm install`, puis `pnpm tsc --noEmit` ✓, `pnpm lint` ✓, `pnpm build` ✓.
2. `pnpm test` : aller-retour vérifié sur document piégeux (gras, titres, listes, citation, tableau GFM, lien, image, note de bas de page, emoji).
3. `/admin/labo-editeur` : utiliser **chaque** bouton, vérifier que le panneau source reflète fidèlement le contenu et qu'une recopie de cette source redonne le même rendu.
4. Tester en **fenêtre étroite** : toolbar lisible/défilante, zone d'édition utilisable.
5. Confirmer **notes de bas de page** et **emojis** (ou documenter le contournement retenu).
