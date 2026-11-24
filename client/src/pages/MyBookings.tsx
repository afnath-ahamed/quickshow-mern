import { useAuth } from '@clerk/react'
import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router'
import useMovieQuery from '../features/movies/useMovieQuery'
import BookingList from '../features/seat-booking/BookingList'
import { getBookings } from '../features/seat-booking/bookingsApi'
import ErrorState from '../shared/ui/ErrorState'
import LoadingState from '../shared/ui/LoadingState'

function MyReservations() {
  const { getToken } = useAuth()
  const [page, setPage] = useState(1)
  const { state } = useLocation()
  const load = useCallback((signal: AbortSignal) => getBookings(getToken, page, signal), [getToken, page])
  const { result, retry } = useMovieQuery(load)

  return (
    <main className="catalog-container catalog-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="catalog-page-title">My Bookings</h1>
        <Link to="/movies" className="catalog-text-link">Browse movies</Link>
      </div>
      {state?.reservationSaved && <p className="mb-4 text-green-300" role="status">Your seat reservation was saved.</p>}
      {result.status === 'loading' && <LoadingState />}
      {result.status === 'error' && <ErrorState message={result.message} retry={retry} />}
      {result.status === 'success' && (
        <>
          <BookingList bookings={result.data.bookings} timeZone={result.data.timeZone} />
          {(page > 1 || result.data.total > result.data.pageSize) && (
            <nav aria-label="Booking pages" className="mt-5 flex items-center gap-3">
              <button type="button" className="catalog-button catalog-button-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page}</span>
              <button type="button" className="catalog-button catalog-button-secondary" disabled={page * result.data.pageSize >= result.data.total} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}

export default function MyBookings() {
  const { sessionId } = useAuth()
  return <MyReservations key={sessionId} />
}
