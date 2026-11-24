import { Link } from 'react-router'
import logo from '../assets/logo.svg'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#12121c]">
      <div className="catalog-container flex flex-wrap items-center justify-between gap-x-8 gap-y-5 py-7">
        <Link className="w-30" to="/"><img alt="QuickShow home" src={logo} /></Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300" aria-label="Footer navigation">
          <Link className="hover:text-white" to="/movies">Movies</Link>
          <Link className="hover:text-white" to="/favorites">Favorites</Link>
          <Link className="hover:text-white" to="/my-bookings">My bookings</Link>
        </nav>
      </div>
    </footer>
  )
}
