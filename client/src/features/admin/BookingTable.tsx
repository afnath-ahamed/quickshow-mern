import { formatMinorCurrency } from '../../shared/lib/formatCurrency'
import { formatShowtime } from '../../shared/lib/formatShowtime'
import type { AdminBooking } from '../seat-booking/bookingsApi'

const statusLabels = { held: 'Active hold', confirmed: 'Confirmed', expired: 'Expired' }
const headers = ['Customer', 'Movie', 'Screening time', 'Seats', 'Total', 'Status']

export default function BookingTable({ bookings, timeZone }: { bookings: AdminBooking[]; timeZone: string }) {
  if (!bookings.length) return <p className="rounded-xl border border-white/10 bg-[#181824] p-5 text-slate-300">No reservations to show.</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="bg-[#211a2a]">
          <tr>{headers.map((label) => <th scope="col" className="px-4 py-3" key={label}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr className="border-t border-white/10" key={booking.id}>
              <td className="px-4 py-3">{booking.customerName}</td>
              <td className="px-4 py-3">{booking.title}</td>
              <td className="whitespace-nowrap px-4 py-3"><time dateTime={booking.startsAt}>{formatShowtime(new Date(booking.startsAt), timeZone, 'en')}</time></td>
              <td className="px-4 py-3">{booking.seats.join(', ')}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatMinorCurrency(booking.totalMinor, booking.currency)}</td>
              <td className="whitespace-nowrap px-4 py-3">{statusLabels[booking.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
