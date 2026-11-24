import { request } from '../../shared/api/httpClient'

type GetToken = () => Promise<string | null>
export type SeatAvailability = {
  show: { id: string; movieId: string; title: string; posterUrl: string; startsAt: string; priceMinor: number; currency: string }
  rows: { label: string; seats: string[] }[]
  unavailable: string[]
  maxSeats: number
  timeZone: string
}

export type Booking = {
  id: string; showId: string; movieId: string; title: string; posterUrl: string; startsAt: string
  runtime?: number
  seats: string[]; totalMinor: number; currency: string; status: 'held' | 'expired' | 'confirmed'; expiresAt: string
}

export type AdminBooking = Booking & { customerName: string; userId: string }
type BookingsPage<T> = { bookings: T[]; total: number; pageSize: number; timeZone: string }

export class BookingApiError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

async function bookingRequest<T>(path: string, options: RequestInit, getToken?: GetToken): Promise<T> {
  const headers = new Headers(options.headers)
  if (getToken) {
    const token = await getToken()
    if (!token) throw new BookingApiError('Sign in to continue.')
    headers.set('Authorization', 'Bearer ' + token)
  }
  let response
  try {
    response = await request(path, { ...options, headers })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new BookingApiError('Could not reach QuickShow. Try again.')
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { message?: string; code?: string } | null
    throw new BookingApiError(detail?.message || 'Could not complete the request. Try again.', detail?.code)
  }
  return response.json() as Promise<T>
}

export function getSeats(showId: string, signal?: AbortSignal) {
  return bookingRequest<SeatAvailability>('/api/shows/' + encodeURIComponent(showId) + '/seats', { signal, cache: 'no-store' })
}

export function reserveSeats(getToken: GetToken, input: { showId: string; seats: string[]; requestId: string }) {
  return bookingRequest<{ booking: Booking }>('/api/bookings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }, getToken)
}

export function getBookings(getToken: GetToken, page: number, signal: AbortSignal) {
  return bookingRequest<BookingsPage<Booking>>('/api/bookings/me?page=' + page, { signal }, getToken)
}

export function getAdminBookings(getToken: GetToken, page: number, showId: string, signal: AbortSignal) {
  const query = new URLSearchParams({ page: String(page) })
  if (showId) query.set('showId', showId)
  return bookingRequest<BookingsPage<AdminBooking>>('/api/admin/bookings?' + query, { signal }, getToken)
}
