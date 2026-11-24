import { CalendarDays, Clock3 } from 'lucide-react'
import { useState } from 'react'
import { formatMinorCurrency } from '../../shared/lib/formatCurrency'
import { formatShowtime } from '../../shared/lib/formatShowtime'
import type { Showtime } from './moviesApi'

export default function ShowtimePicker({ showtimes, timeZone }: { showtimes: Showtime[]; timeZone: string }) {
  const [date, setDate] = useState<string>()
  const [selectedId, setSelectedId] = useState<string>()
  const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', weekday: 'short', year: 'numeric', timeZone })
  const timeFormat = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone })
  const days = new Map<string, Showtime[]>()
  for (const show of showtimes) {
    const label = dateFormat.format(new Date(show.startsAt))
    const shows = days.get(label) ?? []
    shows.push(show)
    days.set(label, shows)
  }
  const activeDate = date && days.has(date) ? date : days.keys().next().value
  const activeShows = activeDate ? days.get(activeDate) ?? [] : []
  const selectedShow = activeShows.find((show) => show.id === selectedId)

  return (
    <section aria-labelledby="showtimes-heading" className="catalog-section showtimes-panel" id="showtimes" tabIndex={-1}>
      <h2 id="showtimes-heading" className="catalog-heading flex items-center gap-3">
        <CalendarDays aria-hidden="true" className="text-[#ff7790]" size={26} /> Choose a showtime
      </h2>
      <p className="mt-2 text-sm text-slate-300">Screenings · {timeZone.replaceAll('_', ' ').replace('/', ' / ')}</p>
      {activeDate ? (
        <>
          <div aria-label="Screening dates" className="mt-5 flex flex-wrap gap-2" role="group">
            {[...days.keys()].map((label) => (
              <button key={label} aria-pressed={activeDate === label} className="showtime-option" onClick={() => { setDate(label); setSelectedId(undefined) }} type="button">
                {label}
              </button>
            ))}
          </div>
          <div aria-label="Screening times" className="mt-4 flex flex-wrap gap-2" role="group">
            {activeShows.map((show) => (
              <button key={show.id} aria-pressed={selectedId === show.id} className="showtime-option" onClick={() => setSelectedId(show.id)} type="button">
                <Clock3 aria-hidden="true" size={15} /> {timeFormat.format(new Date(show.startsAt))}
              </button>
            ))}
          </div>
          <p className="mt-5 min-h-6 text-sm text-slate-200" role="status">
            {selectedShow ? 'Selected ' + formatShowtime(new Date(selectedShow.startsAt), timeZone, 'en') + ' · ' + formatMinorCurrency(selectedShow.priceMinor, selectedShow.currency) + '. Seat booking is coming in a later release.' : 'Select a time to preview your screening.'}
          </p>
        </>
      ) : <p className="mt-5">No showtimes are available.</p>}
    </section>
  )
}
