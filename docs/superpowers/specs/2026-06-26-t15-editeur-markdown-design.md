# T15 — Note de choix de l'éditeur Markdown riche

**Date :** 2026-06-26
**Tâche :** T15 (trame, ligne 66) — « Décision éditeur Markdown : évaluation candidats (TipTap/Milkdown/MDXEditor/BlockNote), prototype »
**Statut :** **re-challengé le 2026-06-27** (critère confort d'usage, prototype comparatif Milkdown vs TipTap — cf. §7) → **Milkdown recommandé**, validation finale du chef de projet en attente.
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

---

## 7. Re-challenge T15 — Milkdown vs TipTap (critère : **confort d'usage**)

**Date :** 2026-06-27. **Demande du chef de projet :** re-challenger le choix avant de coder T19, le **confort d'usage non-technique** primant sur tout le reste.

**Méthode :** prototype comparatif réel — les **deux** moteurs montés derrière la **même** interface `value/onChange` (façade `src/components/MarkdownEditor.tsx`), sur le **même document piégeux**, page labo `/admin/labo-editeur` (Milkdown et TipTap côte-à-côte, source Markdown en direct). Vérifié en navigateur (Chromium) : les deux éditeurs montent, 2 instances ProseMirror actives, 66/66 tests + `tsc`/`lint`/`build` verts.

**Observations factuelles (capture labo) :**

| Aspect | Milkdown (Crepe) | TipTap (headless + barre maison) |
|---|---|---|
| **Rendu visuel immédiat** | ✅ riche d'emblée : vrais titres, listes, citation, **tableau bordé**, note en exposant, emoji — « type Typora » | ⚠️ **plat / non stylé** par défaut (titres, listes, tableau sans style) : tout le CSS/prose reste à écrire |
| **Barre d'outils** | native (flottante + menu blocs) + complément maison | **100 % maison** (gras, titres, listes, citation, lien, tableau, image, annuler/rétablir construits ici) |
| **Tableaux visuels** | ✅ natifs | ✅ via extension (édition correcte) |
| **Fidélité Markdown (aller-retour)** | ⚠️ **accroc** : le bloc-image de Crepe a écrasé l'alt `texte alternatif` → `![1.00](…)` | ✅ **fidèle** : alt préservé, note `[^note]` + définition conservées |
| **Notes de bas de page** | rendues (exposant) | non rendues (texte brut `[^note]`) — pas d'extension footnote |
| **Effort pour atteindre le confort cible** | faible (clé en main) | **élevé** (styliser tout le WYSIWYG + extensions manquantes) |

**Lecture :** sur le **critère retenu (confort d'usage)**, **Milkdown domine nettement** — il offre l'expérience « type Typora » immédiatement, là où TipTap, headless, exige de construire **et habiller** toute la surface d'édition avant d'approcher le même confort. TipTap conserve un avantage de **fidélité brute** et de contrôle, mais au prix d'un travail d'intégration important.

**Recommandation : conserver Milkdown** (le re-challenge le confirme sur le confort), avec **deux réserves à lever en T19** :
1. **Fidélité image** : configurer/neutraliser la *feature* `image-block` de Crepe (responsable de la réécriture de l'alt) ou n'autoriser l'insertion d'image que par la barre maison (`![alt](chemin)` standard) → rétablir l'aller-retour sans perte.
2. **Notes de bas de page** : valider le rendu (plugin remark footnotes) ou documenter l'édition en mode source.

**Plan B (TipTap) toujours valable** si la fidélité native et le contrôle total devaient un jour primer sur le confort — coût assumé : styliser le WYSIWYG + fiabiliser notes/emoji.

> **Décision finale laissée au chef de projet** après essai direct de `/admin/labo-editeur`. La case T15 de la trame n'est cochée qu'après sa validation explicite.

**Encapsulation acquise :** quel que soit le verdict, le reste de la Tranche 3 ne dépend que de la façade `MarkdownEditor` (props `value/onChange/engine`) — basculer de moteur = changer le défaut de la façade, sans toucher aux écrans consommateurs.
