import { useAuth } from '@clerk/react'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import useMovieQuery from '../features/movies/useMovieQuery'
import BookingSummary from '../features/seat-booking/BookingSummary'
import SeatGrid from '../features/seat-booking/SeatGrid'
import { BookingApiError, getSeats, reserveSeats, type SeatAvailability } from '../features/seat-booking/bookingsApi'
import { useSeatSelection } from '../features/seat-booking/useSeatSelection'
import { formatShowtime } from '../shared/lib/formatShowtime'
import ErrorState from '../shared/ui/ErrorState'
import LoadingState from '../shared/ui/LoadingState'

function ScreeningSeats({ initial }: { initial: SeatAvailability }) {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const { selectedSeats, selectionMessage, toggleSeat, removeUnavailable, getRequestId } = useSeatSelection(data.maxSeats)
  const { show, timeZone } = data

  async function refresh() {
    try {
      const latest = await getSeats(show.id)
      setData(latest)
      removeUnavailable(latest.unavailable)
    } catch (failure) {
      if (failure instanceof BookingApiError && failure.code === 'SHOW_STARTED') setStarted(true)
      setError(failure instanceof Error ? failure.message : 'Could not refresh the seat map.')
    }
  }

  async function reserve() {
    if (pending || started || !selectedSeats.length) return
    setPending(true)
    setError('')
    try {
      const { booking } = await reserveSeats(getToken, { showId: show.id, seats: selectedSeats, requestId: getRequestId() })
      void navigate('/my-bookings', { state: { reservationSaved: booking.status === 'held' } })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not reserve seats.')
      if (failure instanceof BookingApiError && failure.code === 'SEATS_UNAVAILABLE') await refresh()
      if (failure instanceof BookingApiError && failure.code === 'SHOW_STARTED') setStarted(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Link to={'/movies/' + show.movieId} className="catalog-text-link mb-4">Back to movie</Link>
      <h1 className="catalog-page-title">Select seats</h1>
      <p className="mt-3 text-lg">{show.title}</p>
      <p className="mt-1 text-sm text-slate-300">{formatShowtime(new Date(show.startsAt), timeZone, 'en')} · Colombo time</p>
      <div className="my-5 flex flex-wrap items-center gap-3">
        <button type="button" className="catalog-button catalog-button-secondary" disabled={pending || started} onClick={() => {
          setError('')
          setPending(true)
          void refresh().finally(() => setPending(false))
        }}>Refresh availability</button>
        <p role="status" className="text-sm text-slate-300">{selectionMessage || 'Choose up to ' + data.maxSeats + ' seats.'}</p>
      </div>
      {error && <p role="alert" className="mb-4 text-rose-300">{error}</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <SeatGrid rows={data.rows} unavailable={data.unavailable} onSelect={toggleSeat} selectedSeats={selectedSeats} pending={pending || started} />
        <BookingSummary selectedSeats={selectedSeats} priceMinor={show.priceMinor} currency={show.currency}
          pending={pending || started} onReserve={() => void reserve()} />
      </div>
    </>
  )
}

export default function SeatSelection() {
  const { showId = '' } = useParams()
  const { sessionId } = useAuth()
  const load = useCallback((signal: AbortSignal) => getSeats(showId, signal), [showId])
  const { result, retry } = useMovieQuery(load)

  return (
    <main className="catalog-container catalog-page">
      {result.status === 'loading' && <LoadingState />}
      {result.status === 'error' && <>
        <ErrorState message={result.message} retry={retry} />
        <Link to="/movies" className="catalog-text-link mt-4">Browse movies</Link>
      </>}
      {result.status === 'success' && <ScreeningSeats key={sessionId + ':' + showId} initial={result.data} />}
    </main>
  )
}
