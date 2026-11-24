import { useAuth } from '@clerk/react'
import { Navigate, Outlet, useLocation } from 'react-router'
import LoadingState from '../../shared/ui/LoadingState'

export default function RequireAuth() {
  const { isLoaded, isSignedIn } = useAuth()
  const { pathname, search, hash } = useLocation()

  if (!isLoaded) return <LoadingState />

  if (!isSignedIn) {
    const redirect = encodeURIComponent(pathname + search + hash)
    return <Navigate to={`/sign-in?redirect_url=${redirect}`} replace />
  }

  return <Outlet />
}
