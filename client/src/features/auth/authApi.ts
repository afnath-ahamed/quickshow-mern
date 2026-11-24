import { request } from '../../shared/api/httpClient'

export type CurrentUser = { userId: string; role: 'user' | 'admin' }

export async function getCurrentUser(token: string, signal?: AbortSignal): Promise<CurrentUser> {
  const response = await request('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

  if (!response.ok) throw new Error('Could not load your account.')
  return response.json() as Promise<CurrentUser>
}

export async function checkAdminAccess(token: string, signal?: AbortSignal): Promise<boolean> {
  const response = await request('/api/admin/access', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

  if (response.status === 403) return false
  if (!response.ok) throw new Error('Could not verify admin access.')
  return true
}
