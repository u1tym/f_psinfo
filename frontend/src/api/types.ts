export interface PasswordEntry {
  title: string
  userword: string
  psword: string
  site: string | null
  memo: string | null
}

export interface PasswordListResponse {
  total: number
  items: PasswordEntry[]
}

export interface PasswordCreateRequest {
  title: string
  userword: string
  psword: string
  site?: string | null
  memo?: string | null
}

export interface PasswordUpdateRequest {
  title: string
  userword: string
  psword: string
  site?: string | null
  memo?: string | null
}

export interface ApiError {
  detail: string
}
