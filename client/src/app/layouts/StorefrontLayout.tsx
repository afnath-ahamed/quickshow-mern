import type { PropsWithChildren } from 'react'
import { Link, NavLink } from 'react-router'
import AccountMenu from '../../features/auth/AccountMenu'
import logo from '../../shared/assets/logo.svg'
import Footer from '../../shared/ui/Footer'

export default function StorefrontLayout({ children }: PropsWithChildren) {
  return (
    <div className="storefront">
      <header className="storefront-header">
        <nav className="catalog-container storefront-nav" aria-label="Main navigation">
          <Link to="/" className="w-30 shrink-0 sm:w-35"><img alt="QuickShow home" src={logo} /></Link>
          <div className="storefront-links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/movies">Movies</NavLink>
            <NavLink to="/favorites">Favorites</NavLink>
          </div>
          <div className="storefront-account"><AccountMenu /></div>
        </nav>
      </header>
      <div className="storefront-content">{children}</div>
      <Footer />
    </div>
  )
}
