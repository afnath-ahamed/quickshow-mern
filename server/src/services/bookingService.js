import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import SeatClaim from '../models/SeatClaim.js'
import Show from '../models/Show.js'
import { cinemaTimeZone } from './showService.js'

const holdDuration = 10 * 60_000
const maxSeats = 5
const seatRows = [...'ABCDEFGHIJ'].map((row) => ({
  label: row, seats: Array.from({ length: 9 }, (_, index) => row + (index + 1)),
}))
const validSeats = new Set(seatRows.flatMap(({ seats }) => seats))
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class BookingError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

function assertShowId(showId) {
  if (!mongoose.isObjectIdOrHexString(showId)) {
    throw new BookingError('Screening not found.', 404, 'SHOW_NOT_FOUND')
  }
}

async function findShow(showId, session) {
  assertShowId(showId)
  const show = await Show.findById(showId).session(session ?? null)
    .populate('movie', 'tmdbId title posterUrl').lean()
  if (!show?.movie?.tmdbId) throw new BookingError('Screening not found.', 404, 'SHOW_NOT_FOUND')
  return show
}

function assertUpcoming(show, now) {
  if (show.startsAt <= now) throw new BookingError('This screening has already started.', 410, 'SHOW_STARTED')
}

const activeClaims = (now) => [{ status: 'confirmed' }, { status: 'held', expiresAt: { $gt: now } }]

export async function getSeatAvailability(showId) {
  const show = await findShow(showId)
  const now = new Date()
  assertUpcoming(show, now)
  const claims = await SeatClaim.find({ show: show._id, $or: activeClaims(now) }).select('seat -_id').lean()
  return {
    show: {
      id: String(show._id), movieId: show.movie.tmdbId, title: show.movie.title,
      posterUrl: show.movie.posterUrl, startsAt: show.startsAt, priceMinor: show.priceMinor, currency: show.currency,
    },
    rows: seatRows, unavailable: claims.map(({ seat }) => seat), maxSeats, timeZone: cinemaTimeZone,
  }
}

function serializeBooking(booking, now, includeCustomer = false) {
  const status = booking.status === 'held' && booking.expiresAt <= now ? 'expired' : booking.status
  return {
    id: String(booking._id), showId: String(booking.show),
    movieId: booking.movieId, title: booking.title, posterUrl: booking.posterUrl,
    startsAt: booking.startsAt, seats: booking.seats, totalMinor: booking.priceMinor * booking.seats.length,
    currency: booking.currency, status, expiresAt: booking.expiresAt,
    ...(includeCustomer && { customerName: booking.customerName, userId: booking.userId }),
  }
}

function validateRequest(input) {
  const { showId, requestId, seats } = input ?? {}
  assertShowId(showId)
  if (typeof requestId !== 'string' || !uuid.test(requestId)) {
    throw new BookingError('Send a valid reservation request ID.', 400, 'INVALID_REQUEST_ID')
  }
  if (!Array.isArray(seats) || seats.length < 1 || seats.length > maxSeats ||
      !seats.every((seat) => validSeats.has(seat)) || new Set(seats).size !== seats.length) {
    throw new BookingError('Select one to five different seats from this seat map.', 400, 'INVALID_SEATS')
  }
  return { showId: showId.toLowerCase(), requestId: requestId.toLowerCase(), seats: [...seats].sort() }
}

function existingReservation(booking, showId, seats, now) {
  if (String(booking.show) !== showId || booking.seats.join() !== seats.join()) {
    throw new BookingError('This request ID belongs to different seats or a different screening.', 409, 'REQUEST_ID_REUSED')
  }
  return { booking: serializeBooking(booking, now), created: false }
}

export async function createBooking(user, input) {
  const { showId, requestId, seats } = validateRequest(input)
  const owner = { userId: user.userId, requestId }
  try {
    return await mongoose.connection.transaction(async (session) => {
      const previous = await Booking.findOne(owner).session(session).lean()
      if (previous) return existingReservation(previous, showId, seats, new Date())
      const show = await findShow(showId, session)
      const now = new Date()
      assertUpcoming(show, now)
      const expiresAt = new Date(Math.min(now.getTime() + holdDuration, show.startsAt.getTime()))
      const [booking] = await Booking.create([{
        ...owner, customerName: user.displayName || 'Customer', show: show._id,
        movieId: show.movie.tmdbId, title: show.movie.title, posterUrl: show.movie.posterUrl,
        startsAt: show.startsAt, seats, priceMinor: show.priceMinor, currency: show.currency, status: 'held', expiresAt,
      }], { session })

      // A non-expired claim cannot match this update. The unique index then rejects the upsert.
      // The transaction rolls back the booking and all preceding seat claims on any conflict.
      for (const seat of seats) {
        await SeatClaim.updateOne(
          { show: show._id, seat, status: 'held', expiresAt: { $lte: now } },
          { $set: { booking: booking._id, status: 'held', expiresAt } },
          { upsert: true, session },
        )
      }
      return { booking: serializeBooking(booking, now), created: true }
    })
  } catch (error) {
    if (error.code !== 11000) throw error
    const previous = await Booking.findOne(owner).lean()
    if (previous) return existingReservation(previous, showId, seats, new Date())
    throw new BookingError('Some selected seats are no longer available. Review the updated seat map.', 409, 'SEATS_UNAVAILABLE')
  }
}

export async function listBookings({ userId, page, showId }) {
  const pageSize = 20
  const filter = userId ? { userId } : { userId: { $type: 'string' } }
  if (showId) {
    assertShowId(showId)
    filter.show = showId
  }
  const [records, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Booking.countDocuments(filter),
  ])
  const now = new Date()
  return { bookings: records.map((booking) => serializeBooking(booking, now, !userId)), total, pageSize, timeZone: cinemaTimeZone }
}

export async function getBookingCounts(showIds) {
  const filter = { $or: activeClaims(new Date()) }
  if (showIds) filter.show = { $in: showIds.map((id) => new mongoose.Types.ObjectId(id)) }
  const rows = await Booking.aggregate([
    { $match: filter },
    { $group: { _id: showIds ? '$show' : null,
      holds: { $sum: { $cond: [{ $eq: ['$status', 'held'] }, 1, 0] } },
      confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
    } },
  ])
  if (showIds) return new Map(rows.map(({ _id, holds, confirmed }) => [String(_id), { holds, confirmed }]))
  return { holds: rows[0]?.holds ?? 0, confirmed: rows[0]?.confirmed ?? 0 }
}
