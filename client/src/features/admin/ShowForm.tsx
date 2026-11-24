import { useAuth } from '@clerk/react'
import { CalendarPlus, Check, X } from 'lucide-react'
import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { currencyFractionDigits } from '../../shared/lib/formatCurrency'
import { MovieArtwork } from '../movies/MovieCard'
import useMovieQuery from '../movies/useMovieQuery'
import ErrorState from '../../shared/ui/ErrorState'
import LoadingState from '../../shared/ui/LoadingState'
import { createShows, getNowPlaying, type TmdbMovie } from './adminApi'

const fieldClass = 'min-h-11 w-full min-w-0 rounded-lg border border-white/20 bg-[#141421] px-3 py-2 text-white'

function toMinorUnits(input: string, digits: number) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(input.trim())
  if (!match || (match[2]?.length ?? 0) > digits) return null
  const value = Number(match[1] + (match[2] ?? '').padEnd(digits, '0'))
  return Number.isSafeInteger(value) && value >= 1 && value <= 1_000_000_000 ? value : null
}

function localDateTime(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(value)
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return fields.year + '-' + fields.month + '-' + fields.day + 'T' + fields.hour + ':' + fields.minute
}

export default function ShowForm() {
  const { getToken } = useAuth()
  const [page, setPage] = useState(1)
  const [movie, setMovie] = useState<TmdbMovie>()
  const [price, setPrice] = useState('')
  const [time, setTime] = useState('')
  const [times, setTimes] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; message: string }>()
  const load = useCallback((signal: AbortSignal) => getNowPlaying(getToken, page, signal), [getToken, page])
  const { result, retry } = useMovieQuery(load)
  const config = result.status === 'success' ? result.data : null

  function addTime() {
    if (!config) return
    let error = ''
    if (!time || time <= localDateTime(new Date(), config.timeZone)) error = 'Choose a future screening date and time.'
    else if (times.includes(time)) error = 'That screening time is already selected.'
    else if (times.length >= config.maxScreenings) error = 'You can add up to ' + config.maxScreenings + ' screenings per submission.'
    if (error) {
      setFeedback({ error: true, message: error })
      return
    }
    setTimes((current) => [...current, time].sort())
    setTime('')
    setFeedback(undefined)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!config || pending) return
    if (!movie || !times.length) {
      setFeedback({ error: true, message: 'Select a movie and add at least one screening time.' })
      return
    }
    const priceMinor = toMinorUnits(price, currencyFractionDigits(config.currency))
    if (priceMinor === null) {
      setFeedback({ error: true, message: 'Enter a valid positive ticket price in ' + config.currency + '.' })
      return
    }

    setPending(true)
    setFeedback(undefined)
    try {
      const { shows } = await createShows(getToken, { movieId: movie.id, priceMinor, startsAt: times })
      const keptPrices = shows.some((show) => show.priceMinor !== priceMinor || show.currency !== config.currency)
      setFeedback({
        error: false,
        message: shows.length + (shows.length === 1 ? ' screening is scheduled.' : ' screenings are scheduled.') +
          (keptPrices ? ' Previously scheduled times kept their existing prices.' : ''),
      })
      setTimes([])
      setTime('')
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : 'Could not schedule the screenings.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <fieldset disabled={pending} className="min-w-0 space-y-6">
        <section aria-labelledby="now-playing-admin">
          <h2 id="now-playing-admin" className="mb-3 text-lg font-semibold">Now Playing Movies</h2>
          {result.status === 'loading' && <LoadingState />}
          {result.status === 'error' && <ErrorState message={result.message} retry={retry} />}
          {config && (
            <>
              {config.movies.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {config.movies.map((item) => (
                    <li key={item.id}>
                      <button
                        aria-pressed={movie?.id === item.id}
                        className="group relative h-full w-full rounded-xl border border-white/10 bg-[#181824] p-2 text-left hover:border-[#ff7790] aria-pressed:border-[#ff7790]"
                        onClick={() => setMovie(item)}
                        type="button"
                      >
                        <MovieArtwork className="aspect-[2/3] rounded-lg" src={item.posterUrl} />
                        {movie?.id === item.id && <Check className="absolute top-3 right-3 size-6 rounded-full bg-[#f84565] p-1 text-black" aria-hidden="true" />}
                        <span className="mt-2 block text-sm font-semibold">{item.title}</span>
                        <span className="block text-xs text-slate-300">{item.releaseDate.slice(0, 4)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-slate-300">TMDB returned no movies on this page.</p>}
              {(page > 1 || config.totalPages > 1) && (
                <nav aria-label="TMDB movie pages" className="mt-4 flex flex-wrap items-center gap-3">
                  <button className="catalog-button catalog-button-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} type="button">Previous</button>
                  <span className="text-sm text-slate-300">Page {page} of {config.totalPages}</span>
                  <button className="catalog-button catalog-button-secondary" disabled={page >= config.totalPages} onClick={() => setPage(page + 1)} type="button">Next</button>
                </nav>
              )}
            </>
          )}
        </section>
        <section aria-labelledby="schedule-heading" className="max-w-3xl space-y-4 rounded-xl border border-white/10 bg-[#181824] p-4 sm:p-5">
          <div>
            <h2 id="schedule-heading" className="text-lg font-semibold">Screening schedule</h2>
            <p className="mt-1 text-sm text-slate-300" aria-live="polite">{movie ? 'Selected movie: ' + movie.title : 'Select a movie above.'}</p>
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]">
            <label className="grid gap-1.5 text-sm" htmlFor="show-price">
              Ticket price {config && '(' + config.currency + ')'}
              <input className={fieldClass} id="show-price" inputMode="decimal" maxLength={16} onChange={(event) => setPrice(event.target.value)} value={price} />
            </label>
            <label className="grid gap-1.5 text-sm" htmlFor="show-time">
              Date and time (Colombo)
              <input className={fieldClass} id="show-time" type="datetime-local" onChange={(event) => setTime(event.target.value)} value={time} />
            </label>
            <button className="catalog-button catalog-button-secondary" disabled={!config} onClick={addTime} type="button"><CalendarPlus size={16} aria-hidden="true" /> Add time</button>
          </div>
          {times.length > 0 && (
            <ul aria-label="Selected times" className="flex flex-wrap gap-2">
              {times.map((slot) => (
                <li key={slot}>
                  <button aria-label={'Remove ' + slot.replace('T', ' ')} className="catalog-button catalog-button-secondary text-sm" onClick={() => setTimes((current) => current.filter((item) => item !== slot))} type="button">
                    {slot.replace('T', ' ')} <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <button className="catalog-button catalog-button-primary" disabled={!config || pending} type="submit">{pending ? 'Saving…' : 'Schedule shows'}</button>
            {feedback && (
              <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? 'text-sm text-rose-300' : 'text-sm text-green-300'}>
                {feedback.message}
                {!feedback.error && <Link to="/admin/shows" className="ml-2 underline">View shows</Link>}
              </p>
            )}
          </div>
        </section>
      </fieldset>
    </form>
  )
}
