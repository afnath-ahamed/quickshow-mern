import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import SeatClaim from '../models/SeatClaim.js'

export const seatReleaseRetryMs = 5 * 60_000

export async function releaseExpiredSeats(bookingId, closeExpiredCheckout) {
  const booking = await Booking.findOne({ _id: bookingId, status: 'held' }).lean()
  if (!booking) return null
  if (booking.expiresAt > new Date()) return booking.expiresAt

  // Resale already ignores expired claims. Preserve these records until Stripe's
  // status allows final cleanup so an on-time payment can survive delayed delivery.
  if (!await closeExpiredCheckout(booking)) return new Date(Date.now() + seatReleaseRetryMs)

  await mongoose.connection.transaction(async (session) => {
    const now = new Date()
    const result = await Booking.updateOne({
      _id: bookingId, status: 'held', expiresAt: { $lte: now },
    }, { status: 'expired' }, { session })
    if (result.modifiedCount) {
      await SeatClaim.deleteMany({ booking: bookingId, status: 'held', expiresAt: { $lte: now } }, { session })
    }
  })
  return null
}
