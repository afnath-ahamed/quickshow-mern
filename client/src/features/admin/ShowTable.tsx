import { Link } from 'react-router'
import { formatMinorCurrency } from '../../shared/lib/formatCurrency'
import { formatShowtime } from '../../shared/lib/formatShowtime'
import type { Screening } from './adminApi'

export default function ShowTable({ shows, timeZone, empty }: { shows: Screening[]; timeZone: string; empty: string }) {
  if (!shows.length) return <p className="rounded-xl border border-white/10 bg-[#181824] p-5 text-slate-300">{empty}</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead className="bg-[#211a2a]">
          <tr>
            <th scope="col" className="px-4 py-3">Movie</th>
            <th scope="col" className="px-4 py-3">Screening time</th>
            <th scope="col" className="px-4 py-3">Ticket price</th>
            <th scope="col" className="px-4 py-3">Bookings</th>
            <th scope="col" className="px-4 py-3">Confirmed earnings</th>
          </tr>
        </thead>
        <tbody>
          {shows.map((show) => (
            <tr className="border-t border-white/10" key={show.id}>
              <td className="px-4 py-3"><Link to={'/movies/' + show.movieId} className="hover:underline">{show.title}</Link></td>
              <td className="whitespace-nowrap px-4 py-3">
                <time dateTime={show.startsAt}>{formatShowtime(new Date(show.startsAt), timeZone, 'en')}</time>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{formatMinorCurrency(show.priceMinor, show.currency)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Link to={'/admin/bookings?showId=' + show.id} className="hover:underline">
                  {show.bookingCounts?.holds ?? 0} held · {show.bookingCounts?.confirmed ?? 0} confirmed
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {show.revenue?.length
                  ? show.revenue.map(({ amountMinor, currency }) => formatMinorCurrency(amountMinor, currency)).join(' · ')
                  : formatMinorCurrency(0, show.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
