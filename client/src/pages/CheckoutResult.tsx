import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getCheckoutStatus, type CheckoutStatus } from '../features/seat-booking/checkoutApi'
import ErrorState from '../shared/ui/ErrorState'
import LoadingState from '../shared/ui/LoadingState'

const messages = {
  held: { title: 'Confirming payment', detail: 'Your booking will update when Stripe confirms the payment.' },
  confirmed: { title: 'Booking confirmed', detail: 'Payment received. Your seats are confirmed.' },
  expired: { title: 'Seat hold expired', detail: 'The seats were released. If Stripe received a late payment, the refund status will appear here.' },
  refund_pending: { title: 'Refund in progress', detail: 'QuickShow could not confirm the seats. Your payment is being refunded.' },
  refunded: { title: 'Payment refunded', detail: 'QuickShow could not confirm the seats, and Stripe refunded the payment.' },
  refund_failed: { title: 'Refund needs review', detail: 'Stripe could not complete the refund automatically. Your seats were released.' },
} satisfies Record<CheckoutStatus, { title: string; detail: string }>

function CheckoutStatusPanel({ bookingId, cancelled }: { bookingId: string; cancelled: boolean }) {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<CheckoutStatus>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const cutoff = Date.now() + 30_000
    let timer: number | undefined
    async function check() {
      try {
        const result = await getCheckoutStatus(getToken, bookingId, controller.signal)
        if (controller.signal.aborted) return
        setStatus(result.status)
        if (!cancelled && Date.now() < cutoff &&
            ['held', 'expired', 'refund_pending'].includes(result.status)) {
          timer = window.setTimeout(() => void check(), 2000)
        } else {
          setPolling(false)
        }
      } catch (failure) {
        if (controller.signal.aborted) return
        setError(failure instanceof Error ? failure.message : 'Could not check the payment.')
        setPolling(false)
      }
    }
    void check()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [getToken, bookingId, cancelled, attempt])

  function retry() {
    setError('')
    setPolling(true)
    setAttempt((previous) => previous + 1)
  }

  if (error) return <ErrorState message={error} retry={retry} />
  if (!status) return <LoadingState />
  const message = cancelled && status === 'held'
    ? { title: 'Checkout cancelled', detail: 'Your hold is still active. Return to My Bookings to retry before it expires.' }
    : messages[status]

  return (
    <>
      <div role="status">
        <h1 className="catalog-page-title">{message.title}</h1>
        <p className="mt-4 max-w-xl text-slate-300">{message.detail}</p>
      </div>
      {!polling && !cancelled && ['held', 'expired', 'refund_pending'].includes(status) && (
        <button className="catalog-button catalog-button-secondary mt-4" type="button" onClick={retry}>Refresh payment status</button>
      )}
    </>
  )
}

export default function CheckoutResult() {
  const [query] = useSearchParams()
  const { sessionId } = useAuth()
  const bookingId = query.get('bookingId')
  const cancelled = query.get('cancelled') === '1'
  return (
    <main className="catalog-container catalog-page">
      {bookingId ? <CheckoutStatusPanel key={sessionId + ':' + bookingId + ':' + cancelled} bookingId={bookingId} cancelled={cancelled} />
        : <h1 className="catalog-page-title">Booking not found</h1>}
      <Link to="/my-bookings" className="catalog-button catalog-button-primary mt-6">My Bookings</Link>
    </main>
  )
}
