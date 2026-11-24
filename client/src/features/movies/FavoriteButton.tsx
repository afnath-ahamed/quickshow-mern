import { useAuth } from '@clerk/react'
import { Heart } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { getFavorites, updateFavorite } from './favoritesApi'
import useMovieQuery from './useMovieQuery'

const controlClass = 'catalog-button catalog-button-secondary'

function SignedInFavorite({ movieId }: { movieId: string }) {
  const { getToken } = useAuth()
  const load = useCallback((signal: AbortSignal) => getFavorites(getToken, signal), [getToken])
  const { result, retry } = useMovieQuery(load)
  const [updated, setUpdated] = useState<boolean>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const saved = updated ?? (result.status === 'success' && result.data.includes(movieId))

  async function toggle() {
    setPending(true)
    setError('')
    try {
      await updateFavorite(getToken, movieId, !saved)
      setUpdated(!saved)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update your favorites.')
    } finally {
      setPending(false)
    }
  }

  if (result.status === 'error') {
    return (
      <div>
        <button className={controlClass} onClick={retry} type="button">Retry favorites</button>
        <p role="alert" className="mt-2 text-sm text-rose-300">{result.message}</p>
      </div>
    )
  }

  return (
    <div>
      <button
        aria-pressed={saved}
        className={controlClass}
        disabled={pending || result.status === 'loading'}
        onClick={() => void toggle()}
        type="button"
      >
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        {pending ? 'Updating…' : saved ? 'Saved to favorites' : 'Add to favorites'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  )
}

export default function FavoriteButton({ movieId }: { movieId: string }) {
  const { isLoaded, sessionId } = useAuth()
  const { pathname, search, hash } = useLocation()

  if (!isLoaded) return <button className={controlClass} disabled type="button">Loading favorites…</button>
  if (sessionId) return <SignedInFavorite key={sessionId + ':' + movieId} movieId={movieId} />

  return (
    <Link className={controlClass} to={'/sign-in?redirect_url=' + encodeURIComponent(pathname + search + hash)}>
      <Heart size={18} aria-hidden="true" />
      Add to favorites
    </Link>
  )
}
