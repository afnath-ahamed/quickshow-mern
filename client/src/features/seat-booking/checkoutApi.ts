import { bookingRequest, type GetToken } from './bookingsApi'

type CheckoutStart = { status: 'open'; url: string } | { status: 'processing' }
export type CheckoutStatus = 'held' | 'expired' | 'confirmed' | 'refund_pending' | 'refunded' | 'refund_failed'

function path(bookingId: string) {
  return '/api/checkout/' + encodeURIComponent(bookingId)
}

export function startCheckout(getToken: GetToken, bookingId: string) {
  return bookingRequest<CheckoutStart>(path(bookingId), { method: 'POST' }, getToken)
}

export function getCheckoutStatus(getToken: GetToken, bookingId: string, signal: AbortSignal) {
  return bookingRequest<{ status: CheckoutStatus }>(path(bookingId), { method: 'GET', signal }, getToken)
}
