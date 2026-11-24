import { useAuth } from '@clerk/react'
import { ArrowRight } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { getFavoriteMovies, updateFavorite } from '../features/movies/favoritesApi'
import MovieCard from '../features/movies/MovieCard'
import useMovieQuery from '../features/movies/useMovieQuery'
import ErrorState from '../shared/ui/ErrorState'
import LoadingState from '../shared/ui/LoadingState'

function FavoriteMovies() {
  const { getToken } = useAuth()
  const load = useCallback((signal: AbortSignal) => getFavoriteMovies(getToken, signal), [getToken])
  const { result, retry } = useMovieQuery(load)
  const [removed, setRemoved] = useState<string[]>([])
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function remove(movieId: string, title: string) {
    setPending(movieId)
    setError('')
    try {
      await updateFavorite(getToken, movieId, false)
      setRemoved((ids) => [...ids, movieId])
      setMessage(title + ' removed from favorites.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not remove this favorite.')
    } finally {
      setPending('')
    }
  }

  if (result.status === 'loading') return <LoadingState />
  if (result.status === 'error') return <ErrorState message={result.message} retry={retry} />
  const movies = result.data.filter(({ id }) => !removed.includes(id))

  return (
    <>
      <p className="sr-only" role="status">{message}</p>
      {error && <p className="mb-5 text-rose-300" role="alert">{error}</p>}
      {movies.length ? (
        <ul className="movie-grid">
          {movies.map((movie) => (
            <li key={movie.id}>
              <MovieCard movie={movie} />
              <button
                aria-label={'Remove ' + movie.title + ' from favorites'}
                className="catalog-button catalog-button-secondary mt-3"
                disabled={Boolean(pending)}
                onClick={() => void remove(movie.id, movie.title)}
                type="button"
              >
                {pending === movie.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="text-slate-300">No saved movies yet.</p>
          <Link className="catalog-button catalog-button-primary mt-5" to="/movies">Explore movies <ArrowRight size={17} aria-hidden="true" /></Link>
        </>
      )}
    </>
  )
}

export default function Favorites() {
  const { sessionId } = useAuth()
  return (
    <main className="catalog-container catalog-page">
      <h1 className="catalog-page-title mb-8">Favorites</h1>
      <FavoriteMovies key={sessionId} />
    </main>
  )
}
