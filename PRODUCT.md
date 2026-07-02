# Product

## Register

product

## Users

**Administrateur (1 personne)** — gère l'intégralité de la plateforme : corpus, utilisateurs, rôles, atelier de préparation. Contexte de travail : bureau, sessions longues, tâches répétitives d'édition et de validation. A besoin d'efficacité et de densité d'information, pas de mise en scène.

**Éditeurs** — préparent et valident les citations avant publication. Travaillent dans l'atelier et le corpus. Expertise métier forte, contexte similaire à l'admin.

**Abonnés (niveaux 3 et 4)** — lecteurs payants avec accès à un corpus curé d'œuvres sélectionnées. Lisent et explorent, ne créent pas. Contexte : lecture sur mobile ou desktop, parcours découverte.

**Visiteurs** — accès public au corpus publié. Découverte, navigation libre.

## Product Purpose

Lumosphère est une bibliothèque éditoriale de citations spirituelles. Elle fusionne deux outils internes en une seule PWA :

- **L'atelier** — workflow de préparation : import de lots depuis Telegram, PDF, YouTube, HTML ; nettoyage IA ; validation humaine ; intégration au corpus.
- **La bibliothèque** — corpus public de citations filtrable par thème, œuvre, auteur ; navigation par keyset ; lecture Markdown.

Succès : un éditeur peut importer 100 citations d'une source, les valider en une session, et les voir publiées accessibles aux abonnés — sans friction technique.

## Brand Personality

Littéraire · sobre · artisanal · contemplative.

Lumosphère ressemble à une revue indépendante de qualité : soignée sans être prétentieuse, dense sans être surchargée, chaude sans être décorative. La chaleur naît de la palette (or, vert forêt, tons proches du papier) et de la précision typographique — pas d'effets visuels ni d'animations expressives. Le contenu étant des citations spirituelles, la surface de lecture (accueil/bibliothèque) porte en plus une intention contemplative et apaisée : un rythme de lecture ralenti, plus d'air autour du texte, moins de densité d'information par écran. Cette respiration ne s'étend pas à l'admin et à l'atelier, qui restent denses et efficaces — voir Design Principles §5.

## Anti-references

- **SaaS générique (Notion, Linear, Vercel)** — blanc aseptisé, violet/bleu startup, typographie système sans caractère.
- **Bibliothèque académique austère** — gris institutionnel, interfaces d'archives universitaires, froideur fonctionnelle.
- **Dashboard analytics lourd** — grilles de KPI, graphiques partout, interfaces de reporting.
- **Site vitrine marketing** — hero sections pleine page, animations de scroll expressives, copywriting aguicheur.
- **Sites religieux/institutionnels datés** — esthétique de site paroissial ou associatif daté : couleurs criardes, mise en page chargée, iconographie religieuse clichée (colombes, mandalas, halos).

## Design Principles

1. **Le texte est la matière première.** La typographie et la lisibilité priment sur la décoration. Chaque décision visuelle sert la lecture, pas l'image de marque.
2. **Sobre mais pas froid.** La chaleur vient de la palette et des proportions, jamais d'effets graphiques. Retirer un élément décoratif doit améliorer la page.
3. **L'interface s'efface devant le corpus.** L'UI est un cadre, le contenu est le tableau. Pas d'éléments qui distraient de la lecture ou du travail éditorial.
4. **Artisanal = chaque détail compte.** Espacement, alignement, hiérarchie typographique — précis et délibérés. Un écran "presque bien" n'est pas bien.
5. **Le contexte fait la tonalité.** L'admin et l'éditeur voient des outils efficaces et denses ; le lecteur voit du contenu curé à un rythme ralenti et contemplatif. Même application, deux registres d'usage — chaque surface doit servir son utilisateur principal, pas l'inverse.

## Accessibility & Inclusion

WCAG AA : contraste ≥ 4,5:1 pour le texte courant, ≥ 3:1 pour les grands éléments. Navigation clavier complète sur les parcours principaux. `prefers-reduced-motion` respecté (transitions réduites ou supprimées). Pas de contrainte de certification formelle.
