// Document de référence couvrant les cas « piégeux » exigés par T15
// (cahier §16, devbook §I.5 / §III.5). Sert au test de fidélité ET de
// contenu initial de la page labo comparative.
export const SAMPLE_MARKDOWN = `# Titre H1

Texte avec **gras**, *italique* et un [lien](https://example.org).

## Titre H2

- item un
- item deux
  - sous-item

1. premier
2. second

> Une citation sur une ligne.

| Colonne A | Colonne B |
| --------- | --------- |
| a1        | b1        |
| a2        | b2        |

![texte alternatif](images/exemple.png)

Une phrase avec une note de bas de page.[^note]

Un emoji littéral : 😀

[^note]: Contenu de la note de bas de page.
`
