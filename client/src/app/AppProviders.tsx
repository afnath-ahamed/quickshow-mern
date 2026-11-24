import { ClerkProvider } from '@clerk/react'
import type { PropsWithChildren } from 'react'
import { BrowserRouter, useNavigate } from 'react-router'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function ClerkSessionProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate()

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => void navigate(to)}
      routerReplace={(to) => void navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  )
}

export default function AppProviders({ children }: PropsWithChildren) {
  if (!publishableKey) {
    return <p role="alert">Set VITE_CLERK_PUBLISHABLE_KEY in client/.env to run QuickShow.</p>
  }

  return (
    <BrowserRouter>
      <ClerkSessionProvider>{children}</ClerkSessionProvider>
    </BrowserRouter>
  )
}
