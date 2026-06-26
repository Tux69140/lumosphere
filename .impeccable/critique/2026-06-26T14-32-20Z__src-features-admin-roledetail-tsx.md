---
target: src/features/admin/RoleDetail.tsx
total_score: 21
p0_count: 0
p1_count: 2
timestamp: 2026-06-26T14-32-20Z
slug: src-features-admin-roledetail-tsx
---
## Design Health Score

| # | Heuristique | Score | Problème clé |
|---|-------------|-------|--------------|
| 1 | Visibilité du statut système | 2 | Aucun indicateur de modifications non enregistrées |
| 2 | Correspondance avec le monde réel | 2 | « Œuvres réservées » : signification opaque |
| 3 | Contrôle et liberté | 3 | OK — état conservé |
| 4 | Cohérence | 2 | Bordure pointillée ≠ bordure pleine |
| 5 | Prévention des erreurs | 2 | Sémantique Œuvres non expliquée |
| 6 | Reconnaissance vs mémorisation | 2 | 16 cases sans aide contextuelle |
| 7 | Flexibilité et efficacité | 2 | Pas de sélection groupée |
| 8 | Esthétique minimaliste | 2 | Sections agglomérées, rythme absent |
| 9 | Récupération après erreur | 3 | Toasts présents |
| 10 | Aide et documentation | 1 | Zéro aide contextuelle |
| **Total** | | **21/40** | |

## Priority Issues
- [P1] Rythme vertical absent — mb-5 entre sections indiscernable du gap interne
- [P1] Œuvres réservées sans explication — risque d'erreur admin
- [P2] Hiérarchie plate section/items
- [P2] Bordure pointillée incohérente
