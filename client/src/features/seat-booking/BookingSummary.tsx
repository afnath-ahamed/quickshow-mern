import { formatMinorCurrency } from '../../shared/lib/formatCurrency'

type Props = {
  selectedSeats: string[]; priceMinor: number; currency: string
  pending: boolean; onReserve: () => void
}

export default function BookingSummary({ selectedSeats, priceMinor, currency, pending, onReserve }: Props) {
  return (
    <aside aria-labelledby="summary-title" className="self-start rounded-2xl border border-white/10 bg-[#161622] p-5">
      <h2 className="text-xl font-semibold" id="summary-title">Reservation summary</h2>
      <dl className="my-4 space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-300">Seats</dt><dd className="text-right">{selectedSeats.join(', ') || 'None selected'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-300">Price per seat</dt><dd>{formatMinorCurrency(priceMinor, currency)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-white/10 pt-3 font-semibold">
          <dt>Total</dt><dd>{formatMinorCurrency(priceMinor * selectedSeats.length, currency)}</dd>
        </div>
      </dl>
      <button className="catalog-button catalog-button-primary w-full" type="button"
        disabled={!selectedSeats.length || pending} onClick={onReserve}>
        {pending ? 'Reserving…' : 'Reserve seats'}
      </button>
      <p className="mt-3 text-sm text-slate-300">Your seats are held for up to 10 minutes.</p>
    </aside>
  )
}
