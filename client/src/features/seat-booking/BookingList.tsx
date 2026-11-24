import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { MovieArtwork } from '../movies/MovieCard'
import { formatMinorCurrency } from '../../shared/lib/formatCurrency'
import { formatShowtime } from '../../shared/lib/formatShowtime'
import type { Booking } from './bookingsApi'

const statusLabels = { held: 'Active hold', confirmed: 'Confirmed', expired: 'Expired' }

export default function BookingList({ bookings, timeZone }: { bookings: Booking[]; timeZone: string }) {
  const [now, setNow] = useState(Date.now)
  const hasHolds = bookings.some(({ status, expiresAt }) => status === 'held' && Date.parse(expiresAt) > now)
  useEffect(() => {
    if (!hasHolds) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [hasHolds])

  if (!bookings.length) return <p className="text-slate-300">You have no reservations yet.</p>

  return (
    <ul className="grid gap-4">
      {bookings.map((booking) => {
        const seconds = Math.max(0, Math.ceil((Date.parse(booking.expiresAt) - now) / 1000))
        const status = booking.status === 'held' && seconds === 0 ? 'expired' : booking.status
        const remaining = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
        return (
          <li key={booking.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 rounded-xl border border-white/10 bg-[#161622] p-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
            <MovieArtwork src={booking.posterUrl} className="aspect-[2/3] self-start rounded-lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold"><Link to={'/movies/' + booking.movieId} className="hover:underline">{booking.title}</Link></h2>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">{statusLabels[status]}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{formatShowtime(new Date(booking.startsAt), timeZone, 'en')} · Colombo time</p>
              <p className="mt-2 text-sm"><span className="text-slate-300">Seats</span> {booking.seats.join(', ')}</p>
              <p className="mt-2 font-semibold">{formatMinorCurrency(booking.totalMinor, booking.currency)}</p>
              {status === 'held' && <p className="mt-2 text-sm text-slate-300">Hold expires in <strong className="tabular-nums">{remaining}</strong></p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
