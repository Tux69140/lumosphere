type ApiResponse<T> = {
  status: 'ok' | 'error'
  data: T | null
  errors: string[]
}

let csrfToken: string | null = null
let onSessionExpired: (() => void) | null = null

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const isMutation = !!options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)
  if (isMutation) {
    if (!csrfToken) {
      const csrf = await fetchCsrf()
      csrfToken = csrf.data?.csrf_token ?? null
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }
  }

  const response = await fetch(`/api/${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (response.status === 403) {
    const body = await response
      .clone()
      .json()
      .catch(() => null)
    const isCsrfError = body?.errors?.some((e: string) => e.toLowerCase().includes('csrf'))
    if (isCsrfError) {
      csrfToken = null
      // Jeton périmé vis-à-vis de la session : on rafraîchit et on rejoue une seule fois.
      if (isMutation && !retried) {
        await fetchCsrf()
        return request<T>(path, options, true)
      }
    }
  }

  if (response.status === 401) {
    onSessionExpired?.()
  }

  return response.json() as Promise<ApiResponse<T>>
}

function get<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path)
}

function post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

function del<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'DELETE' })
}

function delWithBody<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'DELETE', body: JSON.stringify(body) })
}

function buildQuery(params?: Record<string, string>): string {
  return params ? '?' + new URLSearchParams(params).toString() : ''
}

async function fetchCsrf() {
  const result = await get<{ csrf_token: string }>('auth/csrf')
  if (result.status === 'ok' && result.data?.csrf_token) {
    csrfToken = result.data.csrf_token
  }
  return result
}

export const apiClient = {
  // Auth
  getCsrf: fetchCsrf,
  getMe: () =>
    get<{
      id: number
      prenom: string
      nom: string
      email: string
      role_id: number
      role_nom: string
    } | null>('auth/me'),
  login: (email: string, password: string, remember: boolean) =>
    post<{
      id: number
      prenom: string
      nom: string
      email: string
      role_id: number
    }>('auth/login', { email, password, remember }),
  logout: () => {
    csrfToken = null
    return post<void>('auth/logout', {})
  },
  setup: (data: {
    setup_secret: string
    prenom: string
    nom: string
    email: string
    password: string
    password_confirm: string
  }) =>
    post<{ id: number; prenom: string; nom: string; email: string; role_id: number }>(
      'auth/setup',
      data,
    ),
  findSessions: () =>
    get<
      {
        id: number
        user_id: number
        prenom: string
        nom: string
        email: string
        ip: string
        user_agent: string
        last_seen: string
        created_at: string
      }[]
    >('auth/sessions'),
  forceLogout: (sessionId: number) => del<void>(`auth/sessions/${sessionId}`),
  onSessionExpired: (callback: () => void) => {
    onSessionExpired = callback
  },

  // Citations
  findCitations: (params?: Record<string, string>) =>
    get<{ items: unknown[]; next_cursor: string | null }>(`citations${buildQuery(params)}`),
  countCitations: (params?: Record<string, string>) =>
    get<{ total: number }>(`citations/count${buildQuery(params)}`),
  getCitation: (id: number) => get<unknown>(`citations/${id}`),
  createCitation: (data: unknown) => post<{ id: number }>('citations', data),
  updateCitation: (id: number, data: unknown) => put<{ id: number }>(`citations/${id}`, data),
  deleteCitation: (id: number) => del<void>(`citations/${id}`),
  setCitationKeywords: (id: number, keywordIds: number[]) =>
    put<void>(`citations/${id}/keywords`, { keyword_ids: keywordIds }),
  bulkUpdateCitations: (ids: number[], fields: Record<string, unknown>) =>
    put<{ updated: number }>('citations/bulk', { ids, fields }),
  bulkDeleteCitations: (ids: number[]) =>
    delWithBody<{ deleted: number }>('citations/bulk', { ids }),

  // Auteurs
  findAuteurs: (params?: Record<string, string>) => get<unknown[]>(`auteurs${buildQuery(params)}`),
  getAuteur: (id: number) => get<unknown>(`auteurs/${id}`),
  createAuteur: (data: unknown) => post<{ id: number }>('auteurs', data),
  updateAuteur: (id: number, data: unknown) => put<{ id: number }>(`auteurs/${id}`, data),
  deleteAuteur: (id: number) => del<void>(`auteurs/${id}`),

  // Sources de collecte
  findCollectSources: () =>
    get<{ id: number; label: string; source_type: string }[]>('collect_sources'),
  linkOeuvreSource: (oeuvreId: number, sourceId: number | null) =>
    post<void>(`oeuvres/${oeuvreId}/source`, { source_id: sourceId }),
  // Canaux Telegram (vue admin « Sources »)
  findTelegramChannels: () =>
    get<
      {
        id: number
        label: string
        source_type: string
        chat_id: number | null
        enabled: boolean
        run_every_hours: number
        oeuvre_id: number | null
        last_run_at: string | null
        last_error: string | null
      }[]
    >('collect_sources?type=telegram'),
  getCollectSource: (id: number) => get<unknown>(`collect_sources/${id}`),
  createCollectSource: (data: unknown) => post<{ id: number }>('collect_sources', data),
  updateCollectSource: (id: number, data: unknown) =>
    put<{ id: number }>(`collect_sources/${id}`, data),
  deleteCollectSource: (id: number) => del<void>(`collect_sources/${id}`),

  // Oeuvres
  findOeuvres: (params?: Record<string, string>) => get<unknown[]>(`oeuvres${buildQuery(params)}`),
  getOeuvre: (id: number) => get<unknown>(`oeuvres/${id}`),
  createOeuvre: (data: unknown) => post<{ id: number }>('oeuvres', data),
  updateOeuvre: (id: number, data: unknown) => put<{ id: number }>(`oeuvres/${id}`, data),
  deleteOeuvre: (id: number) => del<void>(`oeuvres/${id}`),

  // Themes
  findThemes: () => get<unknown[]>('themes'),
  getTheme: (id: number) => get<unknown>(`themes/${id}`),
  createTheme: (data: unknown) => post<{ id: number }>('themes', data),
  updateTheme: (id: number, data: unknown) => put<{ id: number }>(`themes/${id}`, data),
  deleteTheme: (id: number) => del<void>(`themes/${id}`),

  // Keywords
  findKeywords: (params?: Record<string, string>) =>
    get<{ id: number; mot: string }[]>(`keywords${buildQuery(params)}`),
  createKeyword: (data: unknown) => post<{ id: number }>('keywords', data),
  findOrCreateKeyword: (mot: string) =>
    post<{ id: number; mot: string }>('keywords/find-or-create', { mot }),
  deleteKeyword: (id: number) => del<void>(`keywords/${id}`),
  updateKeyword: (id: number, mot: string) => put<{ id: number }>(`keywords/${id}`, { mot }),
  getKeywordUsages: (id: number) =>
    get<{ citation_id: number; titre: string }[]>(`keywords/${id}/usages`),

  // Etats
  findEtats: () => get<unknown[]>('etats'),
  getEtat: (id: number) => get<unknown>(`etats/${id}`),
  updateEtat: (id: number, data: unknown) => put<{ id: number }>(`etats/${id}`, data),
  deleteEtat: (id: number) => del<void>(`etats/${id}`),

  // Emojis
  findEmojis: (params?: Record<string, string>) =>
    get<{ id: number; code: string }[]>(`emojis${buildQuery(params)}`),
  createEmoji: (data: { code: string }) => post<{ id: number }>('emojis', data),
  deleteEmoji: (id: number) => del<void>(`emojis/${id}`),

  // Roles
  findRoles: () => get<unknown[]>('roles'),
  getRoleWithPermissions: (id: number) =>
    get<{ id: number; nom: string; permissions: { id: number; code: string }[] }>(`roles/${id}`),
  updateRolePermissions: (id: number, permissionIds: number[]) =>
    put<void>(`roles/${id}/permissions`, { permission_ids: permissionIds }),
  createRole: (nom: string, permissionIds: number[]) =>
    post<{ id: number; nom: string }>('roles', { nom, permission_ids: permissionIds }),
  updateRole: (id: number, nom: string) => put<{ id: number; nom: string }>(`roles/${id}`, { nom }),
  deleteRole: (id: number) => del<void>(`roles/${id}`),
  getRoleOeuvres: (roleId: number) => get<{ oeuvre_ids: number[] }>(`roles/${roleId}/oeuvres`),
  setRoleOeuvres: (roleId: number, oeuvreIds: number[]) =>
    put<{ oeuvre_ids: number[] }>(`roles/${roleId}/oeuvres`, { oeuvre_ids: oeuvreIds }),

  // Users
  findUsers: () => get<unknown[]>('users'),
  getUser: (id: number) => get<unknown>(`users/${id}`),
  createUser: (data: unknown) => post<{ id: number }>('users', data),
  updateUser: (id: number, data: unknown) => put<{ id: number }>(`users/${id}`, data),
  deleteUser: (id: number) => del<void>(`users/${id}`),

  // Config
  getConfig: (key: string) => get<string | null>(`config/${key}`),
  setConfig: (key: string, value: string) => put<void>(`config/${key}`, { value }),
  listConfig: () => get<{ cle: string; valeur: string | null }[]>('config'),

  // Favorites
  findFavorites: (params?: Record<string, string>) =>
    get<{ items: unknown[]; next_cursor: string | null }>(`favorites${buildQuery(params)}`),
  addFavorite: (citationId: number) => post<void>(`favorites/${citationId}`, {}),
  removeFavorite: (citationId: number) => del<void>(`favorites/${citationId}`),

  // Lots (atelier)
  findLots: (params?: Record<string, string>) =>
    get<{ items: unknown[]; next_cursor: string | null }>(`lots${buildQuery(params)}`),
  getLotCounts: () => get<Record<string, number>>('lots/counts'),
  getLot: (id: number) => get<unknown>(`lots/${id}`),
  getLotJournal: (id: number) => get<unknown[]>(`lots/${id}/journal`),
  updateLotStatus: (id: number, status: string, message?: string) =>
    put<void>(`lots/${id}/status`, { status, message }),
  assignLot: (id: number, userId: number | null) =>
    put<void>(`lots/${id}/assign`, { user_id: userId }),
  integrateLot: (id: number) =>
    post<{ integrated: number; duplicates: number }>(`lots/${id}/integrate`, {}),
  checkLotConformity: (id: number) =>
    post<{ conforme: boolean; missing: string[]; documents_ok: number; documents_total: number }>(
      `lots/${id}/conformity`,
      {},
    ),
  updateLotDocument: (lotId: number, data: Record<string, unknown>) =>
    put<void>(`lots/${lotId}/document`, data),
  setLotDocumentKeywords: (lotId: number, docId: number, keywordIds: number[], source?: string) =>
    put<void>(`lots/${lotId}/document-keywords`, {
      document_id: docId,
      keyword_ids: keywordIds,
      source,
    }),
  deleteLotDocument: (lotId: number, docId: number) =>
    delWithBody<void>(`lots/${lotId}/document`, { document_id: docId }),

  // Collecte manuelle (atelier)
  collecteRun: () => post<{ lots: string[] }>('collecte/run', {}),
  collecteTopup: (more = 0) => post<{ created: number }>('collecte/topup', { more }),

  // AI
  aiSuggestKeywords: (citationId: number, contenu: string) =>
    post<{ keywords: string[] }>('ai/suggest-keywords', { citation_id: citationId, contenu }),
  aiSuggestTheme: (citationId: number, contenu: string) =>
    post<{ theme_id: number }>('ai/suggest-theme', { citation_id: citationId, contenu }),
  aiTestConnection: () =>
    post<{ ok: boolean; provider: string; model: string }>('ai/test-connection', {}),
  aiGetSettings: () =>
    get<{
      provider: string
      model: string
      timeout_seconds: number
      max_retries: number
      catalog: Array<{
        key: string
        label: string
        base_url: string
        models: string[]
        default: string
        configured: boolean
        note?: string
      }>
    }>('ai/settings'),
  aiSaveSettings: (data: {
    provider: string
    model: string
    timeout_seconds: number
    max_retries: number
  }) => post<{ provider: string; model: string }>('ai/settings', data),
  aiGetPrompts: () =>
    get<Array<{ prompt_key: string; content: string; updated_at: string }>>('ai/prompts'),
  aiUpdatePrompt: (key: string, content: string) => put<void>('ai/prompts', { key, content }),
  aiGetLogs: (params?: Record<string, string>) =>
    get<{
      items: Array<{
        id: number
        provider: string
        model: string
        action: string
        prompt_tokens: number
        completion_tokens: number
        latency_ms: number
        status: 'ok' | 'error'
        error_message: string | null
        error_type: string | null
        error_origin: string | null
        user_id: number | null
        created_at: string
      }>
      next_cursor: string | null
    }>(`ai/logs${buildQuery(params)}`),

  aiGetRegistry: () =>
    get<{
      providers: Record<
        string,
        Array<{
          model_id: string
          label: string
          enabled: boolean
          deprecated: boolean
          pricing_input_per_million_usd: number | null
          pricing_output_per_million_usd: number | null
          pricing_source: string
          context_window: number
          supports_json: boolean
          supports_vision: boolean
          notes: string | null
          usable: boolean
        }>
      >
      last_refreshed_at: string | null
    }>('ai/registry'),

  aiRefreshModels: () =>
    post<{
      providers: Array<{ key: string; count: number; error: string | null }>
      refreshed_at: string
    }>('ai/models-refresh', {}),

  aiToggleModel: (provider: string, model_id: string, enabled: boolean) =>
    post<void>('ai/registry-toggle', { provider, model_id, enabled }),

  aiOverrideModel: (data: {
    provider: string
    model_id: string
    pricing_input_per_million_usd?: number | null
    pricing_output_per_million_usd?: number | null
    context_window?: number
    notes?: string | null
    reset_pricing?: boolean
  }) => put<void>('ai/registry-override', data),

  aiUsageSummary: () =>
    get<{
      total_usd: number
      by_provider: Record<
        string,
        {
          models: Array<{
            model: string
            calls: number
            prompt_tokens: number
            completion_tokens: number
            estimated_usd: number | null
          }>
          subtotal_usd: number
        }
      >
    }>('ai/usage-summary'),
}
