import { BookingError, createBooking, getSeatAvailability, listBookings } from '../services/bookingService.js'

export async function seatAvailability(request, response) {
  response.set('Cache-Control', 'no-store')
  return response.json(await getSeatAvailability(request.params.showId))
}

export async function reserveSeats(request, response) {
  const { booking, created } = await createBooking(response.locals.currentUser, request.body)
  return response.status(created ? 201 : 200).json({ booking })
}

function readPage(value) {
  const page = Number(value ?? 1)
  if (!Number.isInteger(page) || page < 1 || page > 10_000) {
    throw new BookingError('Choose a valid bookings page.', 400, 'INVALID_PAGE')
  }
  return page
}

export async function listMyBookings(request, response) {
  return response.json(await listBookings({
    userId: response.locals.currentUser.userId, page: readPage(request.query.page),
  }))
}

export async function listAdminBookings(request, response) {
  const { showId } = request.query
  if (showId !== undefined && typeof showId !== 'string') {
    throw new BookingError('Screening not found.', 404, 'SHOW_NOT_FOUND')
  }
  return response.json(await listBookings({ page: readPage(request.query.page), showId }))
}
