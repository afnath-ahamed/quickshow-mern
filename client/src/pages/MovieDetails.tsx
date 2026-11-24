import { ArrowLeft, CalendarDays, Play, Star } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import FavoriteButton from '../features/movies/FavoriteButton'
import FeaturedMovies from '../features/movies/FeaturedMovies'
import { MovieArtwork } from '../features/movies/MovieCard'
import MovieCast from '../features/movies/MovieCast'
import { formatRuntime, getMovie, getMovies, type MovieDetails as Movie } from '../features/movies/moviesApi'
import ShowtimePicker from '../features/movies/ShowtimePicker'
import { TrailerPlayer } from '../features/movies/TrailerList'
import useMovieQuery from '../features/movies/useMovieQuery'
import ErrorState from '../shared/ui/ErrorState'
import LoadingState from '../shared/ui/LoadingState'

const languageNames = new Intl.DisplayNames('en', { type: 'language' })

function MovieContent({ movie }: { movie: Movie }) {
  const [trailerOpen, setTrailerOpen] = useState(false)
  const catalog = useMovieQuery(getMovies)
  const { trailerId } = movie

  function goToShowtimes() {
    const showtimes = document.getElementById('showtimes')
    showtimes?.focus({ preventScroll: true })
    showtimes?.scrollIntoView()
  }

  return (
    <>
      <div className="details-backdrop" style={{ backgroundImage: 'url(' + movie.backdropUrl + ')' }} aria-hidden="true" />
      <Link className="catalog-text-link mb-7" to="/movies"><ArrowLeft size={17} aria-hidden="true" /> All movies</Link>
      <div className="relative grid items-start gap-7 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <MovieArtwork src={movie.posterUrl} className="aspect-[2/3] w-44 rounded-2xl border border-white/10 sm:w-full" />
        <div className="self-center">
          <p className="mb-3 text-sm font-medium text-[#ff7790]">{movie.genres.join(' · ')}</p>
          <h1 className="catalog-page-title">{movie.title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-200 sm:text-base">
            <span className="inline-flex items-center gap-1.5"><Star fill="currentColor" className="text-amber-300" size={16} aria-hidden="true" /> {movie.rating.toFixed(1)} / 10</span>
            <span>{formatRuntime(movie.runtime)}</span>
            <span>{movie.releaseDate.slice(0, 4)}</span>
            {movie.originalLanguage && <span>Original language: {languageNames.of(movie.originalLanguage)}</span>}
          </p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{movie.overview}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="catalog-button catalog-button-primary" onClick={goToShowtimes} type="button">
              <CalendarDays size={18} aria-hidden="true" /> Buy tickets
            </button>
            {trailerId && (
              <button aria-expanded={trailerOpen} className="catalog-button catalog-button-secondary" onClick={() => setTrailerOpen(!trailerOpen)} type="button">
                <Play size={18} aria-hidden="true" /> {trailerOpen ? 'Hide trailer' : 'Watch trailer'}
              </button>
            )}
            <FavoriteButton movieId={movie.id} />
          </div>
        </div>
      </div>
      <div className="relative mt-12 space-y-12">
        {trailerOpen && trailerId && (
          <section aria-label={movie.title + ' trailer'} className="max-w-3xl">
            <TrailerPlayer trailer={{ id: trailerId, title: movie.title, thumbnailUrl: 'https://i.ytimg.com/vi/' + trailerId + '/hqdefault.jpg' }} />
          </section>
        )}
        <MovieCast cast={movie.cast} />
        <ShowtimePicker showtimes={movie.showtimes} timeZone={movie.timeZone} />
        {catalog.result.status === 'success' && (
          <FeaturedMovies movies={catalog.result.data.movies.filter(({ id }) => id !== movie.id)} recommended />
        )}
      </div>
    </>
  )
}

export default function MovieDetails() {
  const { movieId = '' } = useParams()
  const load = useCallback((signal: AbortSignal) => getMovie(movieId, signal), [movieId])
  const { result, retry } = useMovieQuery(load)

  return (
    <main className="catalog-container catalog-page relative">
      {result.status === 'loading' && <LoadingState />}
      {result.status === 'error' && <ErrorState message={result.message} retry={retry} />}
      {result.status === 'success' && (result.data ? <MovieContent key={result.data.id} movie={result.data} /> : (
        <>
          <h1 className="catalog-page-title">Movie not found</h1>
          <Link className="catalog-text-link mt-5" to="/movies"><ArrowLeft size={17} aria-hidden="true" /> Back to movies</Link>
        </>
      ))}
    </main>
  )
}
