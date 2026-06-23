type ApiResponse<T> = {
  status: 'ok' | 'error'
  data: T | null
  errors: string[]
}

let csrfToken: string | null = null

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
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
    csrfToken = null
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

function fetchCsrf() {
  return get<{ csrf_token: string }>('auth/csrf')
}

export const apiClient = {
  // Auth
  getCsrf: fetchCsrf,
  getMe: () => get<{ user_id: number; role_id: number } | null>('auth/me'),

  // Citations
  findCitations: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<{ items: unknown[]; next_cursor: string | null }>(`citations${qs}`)
  },
  getCitation: (id: number) => get<unknown>(`citations/${id}`),
  createCitation: (data: unknown) => post<{ id: number }>('citations', data),
  updateCitation: (id: number, data: unknown) => put<{ id: number }>(`citations/${id}`, data),
  deleteCitation: (id: number) => del<void>(`citations/${id}`),
  setCitationKeywords: (id: number, keywordIds: number[]) =>
    put<void>(`citations/${id}/keywords`, { keyword_ids: keywordIds }),

  // Auteurs
  findAuteurs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<unknown[]>(`auteurs${qs}`)
  },
  getAuteur: (id: number) => get<unknown>(`auteurs/${id}`),
  createAuteur: (data: unknown) => post<{ id: number }>('auteurs', data),
  updateAuteur: (id: number, data: unknown) => put<{ id: number }>(`auteurs/${id}`, data),
  deleteAuteur: (id: number) => del<void>(`auteurs/${id}`),

  // Oeuvres
  findOeuvres: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<unknown[]>(`oeuvres${qs}`)
  },
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
  findKeywords: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<unknown[]>(`keywords${qs}`)
  },
  createKeyword: (data: unknown) => post<{ id: number }>('keywords', data),
  deleteKeyword: (id: number) => del<void>(`keywords/${id}`),

  // Etats
  findEtats: () => get<unknown[]>('etats'),

  // Roles
  findRoles: () => get<unknown[]>('roles'),
  getRoleWithPermissions: (id: number) => get<unknown>(`roles/${id}`),
  updateRolePermissions: (id: number, permissionIds: number[]) =>
    put<void>(`roles/${id}/permissions`, { permission_ids: permissionIds }),

  // Users
  findUsers: () => get<unknown[]>('users'),
  getUser: (id: number) => get<unknown>(`users/${id}`),
  createUser: (data: unknown) => post<{ id: number }>('users', data),
  updateUser: (id: number, data: unknown) => put<{ id: number }>(`users/${id}`, data),
  deleteUser: (id: number) => del<void>(`users/${id}`),

  // Config
  getConfig: (key: string) => get<unknown>(`config/${key}`),
  setConfig: (key: string, value: string) => put<void>(`config/${key}`, { value }),

  // Favorites
  findFavorites: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<{ items: unknown[]; next_cursor: string | null }>(`favorites${qs}`)
  },
  addFavorite: (citationId: number) => post<void>('favorites', { citation_id: citationId }),
  removeFavorite: (citationId: number) => del<void>(`favorites/${citationId}`),
}
