import { ArrowRight, CalendarDays, Clock3 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import FeaturedMovies from '../features/movies/FeaturedMovies'
import { getMovies } from '../features/movies/moviesApi'
import TrailerList from '../features/movies/TrailerList'
import useMovieQuery from '../features/movies/useMovieQuery'
import heroArtwork from '../shared/assets/backgroundImage.webp'
import marvelLogo from '../shared/assets/marvelLogo.svg'
import ErrorState from '../shared/ui/ErrorState'
import LoadingState from '../shared/ui/LoadingState'

export default function Home() {
  const { result, retry } = useMovieQuery(getMovies)

  return (
    <main>
      <section aria-labelledby="hero-title" className="home-hero" style={{ '--hero-art': 'url(' + heroArtwork + ')' } as CSSProperties}>
        <div className="catalog-container relative pt-12 pb-16 sm:pt-16">
          <div className="max-w-xl">
            <img alt="Marvel Studios" className="mb-6 w-29 sm:w-36" src={marvelLogo} />
            <h1 id="hero-title" className="text-[clamp(2.75rem,7vw,6rem)] leading-[0.93] font-semibold tracking-[-0.055em]">
              Guardians of<br className="hidden sm:block" /> the Galaxy
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-200 sm:text-base">
              <span>Action · Adventure · Sci-fi</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={17} aria-hidden="true" /> 2014</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 size={17} aria-hidden="true" /> 2h 1m</span>
            </div>
            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-200 sm:text-lg">
              An unlikely crew of misfits joins forces to keep a powerful orb from falling into the wrong hands.
            </p>
            <Link className="catalog-button catalog-button-primary mt-7" to="/movies">Explore movies <ArrowRight size={19} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
      <div className="catalog-container space-y-14 py-10 sm:space-y-20 sm:py-14">
        {result.status === 'loading' && <LoadingState />}
        {result.status === 'error' && <ErrorState message={result.message} retry={retry} />}
        {result.status === 'success' && (
          <>
            {result.data.movies.length ? <FeaturedMovies movies={result.data.movies} /> : <p>No movies are currently showing.</p>}
            <TrailerList trailers={result.data.trailers} />
          </>
        )}
      </div>
    </main>
  )
}
