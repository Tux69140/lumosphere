export const queryKeys = {
  oeuvres: ['oeuvres'] as const,
  auteurs: ['auteurs'] as const,
  themes: ['themes'] as const,
  keywords: ['keywords'] as const,
  etats: ['etats'] as const,
  emojis: ['emojis'] as const,
  favorites: ['favorites'] as const,
  collectSources: ['collectSources'] as const,
  keywordUsages: (id: number) => ['keywords', 'usages', id] as const,
  // Invalidation large spectrum (search + admin) — préfixe commun ['citations'].
  citationsAll: ['citations'] as const,
  // Recherche corpus paginée (clé = empreinte des filtres débouncés).
  citationsSearch: (filtersKey: string) => ['citations', 'search', filtersKey] as const,
  // Liste admin des citations.
  citationsAdmin: (filtersKey: string) => ['citations', 'admin', filtersKey] as const,
  aiSettings: ['ai', 'settings'] as const,
  aiPrompts: ['ai', 'prompts'] as const,
  aiLogs: ['ai', 'logs'] as const,
}
