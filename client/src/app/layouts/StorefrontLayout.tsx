import type { PropsWithChildren } from 'react'
import { Link } from 'react-router'
import AccountMenu from '../../features/auth/AccountMenu'

export default function StorefrontLayout({ children }: PropsWithChildren) {
  return (
    <>
      <header className="border-b border-slate-200">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="font-semibold">QuickShow</Link>
          <AccountMenu />
        </nav>
      </header>
      {children}
    </>
  )
}
