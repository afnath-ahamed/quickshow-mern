import screenImage from '../../shared/assets/screenImage.svg'
import type { SeatAvailability } from './bookingsApi'

type Props = {
  rows: SeatAvailability['rows']; unavailable: string[]; selectedSeats: string[]
  onSelect: (seat: string) => void; pending: boolean
}

export default function SeatGrid({ rows, unavailable, selectedSeats, onSelect, pending }: Props) {
  const blocked = new Set(unavailable)
  return (
    <section aria-labelledby="seat-map-title" className="min-w-0 rounded-2xl border border-white/10 bg-[#161622] p-3 sm:p-6">
      <h2 id="seat-map-title" className="text-xl font-semibold">Seat map</h2>
      <div className="mx-auto my-5 max-w-xs text-center text-xs text-slate-300">
        <img className="mb-1 w-full" src={screenImage} alt="" />
        Screen
      </div>
      <div className="mx-auto grid max-w-xl gap-1.5">
        {rows.map((row) => (
          <div key={row.label} role="group" aria-label={'Row ' + row.label} className="grid grid-cols-[auto_repeat(9,minmax(0,1fr))] items-center gap-1 sm:gap-2">
            <span aria-hidden="true" className="w-4 text-center text-xs text-slate-300">{row.label}</span>
            {row.seats.map((seat, index) => {
              const unavailable = blocked.has(seat)
              const selected = selectedSeats.includes(seat)
              const style = unavailable ? 'border-white/10 bg-white/5 text-slate-500 line-through'
                : selected ? 'border-[#ff91a7] bg-[#f84565] text-[#190910]'
                : 'border-white/25 bg-[#222234] text-white hover:border-[#ff91a7]'
              return (
                <button key={seat} type="button" className={'min-h-8 rounded border text-xs font-semibold sm:min-h-10 ' + style}
                  aria-label={'Seat ' + seat + (unavailable ? ', unavailable' : '')}
                  aria-pressed={selected} disabled={pending || unavailable} onClick={() => onSelect(seat)}>
                  {index + 1}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <ul className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-slate-300">
        <li><span aria-hidden="true" className="mr-1.5 inline-block size-3 rounded-sm border border-white/25 bg-[#222234]" />Available</li>
        <li><span aria-hidden="true" className="mr-1.5 inline-block size-3 rounded-sm bg-[#f84565]" />Selected</li>
        <li><span aria-hidden="true" className="mr-1.5 inline-block size-3 rounded-sm border border-white/10 bg-white/5" />Unavailable</li>
      </ul>
    </section>
  )
}
