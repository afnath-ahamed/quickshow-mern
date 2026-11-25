import { request } from '../../shared/api/httpClient'

export type CurrentUser = { userId: string; role: 'user' | 'admin' }

export async function getEmailPreferences(token: string, signal?: AbortSignal) {
  const response = await request('/api/users/me/email-preferences', {
    headers: { Authorization: `Bearer ${token}` }, signal,
  })
  if (!response.ok) throw new Error('Could not load email preferences.')
  return response.json() as Promise<{ showAnnouncements: boolean }>
}

export async function saveEmailPreferences(token: string, showAnnouncements: boolean) {
  const response = await request('/api/users/me/email-preferences', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ showAnnouncements }),
  })
  if (!response.ok) throw new Error('Could not save email preferences.')
}

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
