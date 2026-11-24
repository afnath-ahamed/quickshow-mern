import { Link } from 'react-router'
import logo from '../assets/logo.svg'
import tmdbLogo from '../assets/tmdb-logo.svg'

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
      <section aria-labelledby="footer-credits" className="catalog-container border-t border-white/10 py-5">
        <h2 id="footer-credits" className="mb-2 text-sm font-semibold">Credits</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href="https://www.themoviedb.org/" className="inline-flex min-h-7 w-24 shrink-0 items-center rounded-sm">
            <img alt="The Movie Database (TMDB)" src={tmdbLogo} width={96} />
          </a>
          <p className="text-sm text-slate-300">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </section>
    </footer>
  )
}
