import { useAuth } from '@clerk/react'
import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import BookingTable from '../../features/admin/BookingTable'
import useMovieQuery from '../../features/movies/useMovieQuery'
import { getAdminBookings } from '../../features/seat-booking/bookingsApi'
import ErrorState from '../../shared/ui/ErrorState'
import LoadingState from '../../shared/ui/LoadingState'

function AdminBookingList({ showId }: { showId: string }) {
  const { getToken } = useAuth()
  const [page, setPage] = useState(1)
  const load = useCallback((signal: AbortSignal) => getAdminBookings(getToken, page, showId, signal), [getToken, page, showId])
  const { result, retry } = useMovieQuery(load)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="catalog-heading">List Bookings</h1>
        {showId && <Link to="/admin/bookings" className="catalog-text-link">View all bookings</Link>}
      </div>
      {showId && <p className="text-sm text-slate-300">Showing reservations for the selected screening.</p>}
      {result.status === 'loading' && <LoadingState />}
      {result.status === 'error' && <ErrorState message={result.message} retry={retry} />}
      {result.status === 'success' && (
        <>
          <BookingTable bookings={result.data.bookings} timeZone={result.data.timeZone} />
          {(page > 1 || result.data.total > result.data.pageSize) && (
            <nav aria-label="Booking pages" className="flex items-center gap-3">
              <button type="button" className="catalog-button catalog-button-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page}</span>
              <button type="button" className="catalog-button catalog-button-secondary" disabled={page * result.data.pageSize >= result.data.total} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}

export default function Bookings() {
  const [search] = useSearchParams()
  const showId = search.get('showId') ?? ''
  return <AdminBookingList key={showId} showId={showId} />
}
