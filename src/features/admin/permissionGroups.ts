export type Permission = {
  id: number
  code: string
  label: string
}

export type PermissionGroup = {
  title: string
  permissions: Permission[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'Corpus',
    permissions: [
      { id: 1, code: 'corpus.read', label: 'Lire les publications' },
      { id: 2, code: 'corpus.read_all', label: 'Voir tout le corpus (brouillons inclus)' },
      { id: 3, code: 'corpus.write', label: 'Créer et modifier des citations' },
      { id: 4, code: 'corpus.delete', label: 'Supprimer des citations' },
    ],
  },
  {
    title: 'Référentiels',
    permissions: [
      { id: 8, code: 'oeuvres.manage', label: 'Gérer les œuvres et auteurs' },
      { id: 9, code: 'themes.manage', label: 'Gérer les thèmes' },
      { id: 10, code: 'keywords.manage', label: 'Gérer les mots-clés' },
    ],
  },
  {
    title: 'Export',
    permissions: [{ id: 11, code: 'export.request', label: 'Exporter (PDF / EPUB)' }],
  },
  {
    title: 'Atelier',
    permissions: [
      { id: 12, code: 'atelier.access', label: "Accéder à l'atelier" },
      { id: 13, code: 'atelier.lots', label: 'Traiter des lots' },
      { id: 14, code: 'atelier.validate', label: 'Valider et intégrer au corpus' },
      { id: 15, code: 'atelier.sources', label: 'Configurer les sources' },
    ],
  },
  {
    title: 'Administration',
    permissions: [
      { id: 5, code: 'admin.users', label: 'Gérer les utilisateurs' },
      { id: 6, code: 'admin.roles', label: 'Gérer les rôles et droits' },
      { id: 7, code: 'admin.settings', label: 'Gérer la configuration' },
      { id: 16, code: 'admin.sessions', label: 'Voir les connexions / déconnecter' },
    ],
  },
]
