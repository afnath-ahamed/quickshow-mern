import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import ErrorState from '../../shared/ui/ErrorState'
import LoadingState from '../../shared/ui/LoadingState'
import { checkAdminAccess } from './authApi'

type Access = 'loading' | 'allowed' | 'denied' | 'error'

function AdminAccess() {
  const { getToken } = useAuth()
  const [access, setAccess] = useState<Access>('loading')

  useEffect(() => {
    const controller = new AbortController()

    async function verifyAccess() {
      try {
        const token = await getToken()
        if (!token) throw new Error('Authentication required.')

        const allowed = await checkAdminAccess(token, controller.signal)
        if (!controller.signal.aborted) setAccess(allowed ? 'allowed' : 'denied')
      } catch {
        if (!controller.signal.aborted) setAccess('error')
      }
    }

    void verifyAccess()
    return () => controller.abort()
  }, [getToken])

  if (access === 'loading') return <LoadingState />
  if (access === 'denied') return <ErrorState message="You need admin access to view this page." />
  if (access === 'error') return <ErrorState message="Admin access could not be verified. Refresh to try again." />
  return <Outlet />
}

export default function RequireAdmin() {
  const { sessionId, userId } = useAuth()
  return <AdminAccess key={`${userId}:${sessionId}`} />
}
