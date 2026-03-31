import type {
  PasswordEntry,
  PasswordListResponse,
  PasswordCreateRequest,
  PasswordUpdateRequest,
} from './types'

// 開発時はViteプロキシ経由 (/api → VITE_PSINFO_ORIGIN)
// 本番ビルド時はVITE_PSINFO_ORIGINを直接使用
const getBaseUrl = (): string => {
  const origin = import.meta.env.VITE_PSINFO_ORIGIN
  if (import.meta.env.DEV) {
    return '/api/v1'
  }
  return `${origin || 'http://127.0.0.1:8000'}/api/v1`
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const err = await res.json()
      detail = err.detail || detail
    } catch {
      // ignore parse error
    }
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const passwordsApi = {
  list(keyword?: string): Promise<PasswordListResponse> {
    const params = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
    return request<PasswordListResponse>(`/passwords${params}`)
  },

  get(title: string): Promise<PasswordEntry> {
    return request<PasswordEntry>(`/passwords/${encodeURIComponent(title)}`)
  },

  create(data: PasswordCreateRequest): Promise<PasswordEntry> {
    return request<PasswordEntry>('/passwords', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update(currentTitle: string, data: PasswordUpdateRequest): Promise<PasswordEntry> {
    return request<PasswordEntry>(`/passwords/${encodeURIComponent(currentTitle)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete(title: string): Promise<PasswordEntry> {
    return request<PasswordEntry>(`/passwords/${encodeURIComponent(title)}`, {
      method: 'DELETE',
    })
  },
}
