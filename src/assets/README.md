# Assets de marque — bandeau

Wordmarks « Lumosphère » affichés dans la barre de menu supérieure (`src/components/Header.tsx`).

| Fichier | Thème | Fond attendu | Dimensions de référence |
|---|---|---|---|
| `lumosphere-wordmark-clair.png` | clair | crème `#FDF7F1` | 1536×300 (ratio ~5:1) |
| `lumosphere-wordmark-sombre.png` | sombre | vert `#14281E` | 1536×300 (ratio ~5:1) |

## Remplacer les images (aucune modif de code)

Déposer la nouvelle version **au même chemin, même nom**. Contraintes :
- Fond de l'image = fond du bandeau (`--color-bg-header` dans `src/index.css`) pour un fondu sans bord visible : crème `#FDF7F1` (clair), vert `#14281E` (sombre).
- Garder un ratio large proche de 5:1 et un cadrage identique entre les deux versions (le bandeau les affiche à hauteur fixe `h-9`).
- Sans sous-titre (illisible à cette taille).

Version rognée initiale produite depuis `docs/UI/Nom-clair.png` / `Nom-sombre.png` via :
`convert <source> -crop 1536x300+0+35 +repage <cible>`
