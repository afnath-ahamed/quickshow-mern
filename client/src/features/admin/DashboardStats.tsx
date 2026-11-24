import { CalendarDays, CircleDollarSign, Ticket, Users } from 'lucide-react'
import { formatMinorCurrency } from '../../shared/lib/formatCurrency'
import type { DashboardData } from './adminApi'

export default function DashboardStats({ data }: { data: DashboardData }) {
  const stats = [
    { label: 'Active shows', value: data.activeShows, icon: CalendarDays },
    { label: 'Total users', value: data.users ?? 'Unavailable', icon: Users },
    { label: 'Active holds', value: data.bookingCounts.holds, icon: Ticket },
    { label: 'Confirmed bookings', value: data.bookingCounts.confirmed, icon: Ticket },
    { label: 'Confirmed revenue', value: data.revenue.length
      ? data.revenue.map(({ amountMinor, currency }) => formatMinorCurrency(amountMinor, currency)).join(' · ')
      : formatMinorCurrency(0, data.currency), icon: CircleDollarSign },
  ]

  return (
    <dl className="grid grid-cols-1 gap-3 min-[370px]:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <div className="rounded-xl border border-white/10 bg-[#181824] p-4" key={label}>
          <Icon aria-hidden="true" size={21} className="mb-3 text-[#ff7790]" />
          <dt className="text-sm text-slate-300">{label}</dt>
          <dd className="mt-1 text-xl font-semibold text-white">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
