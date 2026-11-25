import Booking from '../models/Booking.js'
import User from '../models/User.js'
import { sendEmail, skipEmail } from '../services/emailService.js'
import { cinemaTimeZone } from '../services/showService.js'
import { syncClerkUsers } from './syncClerkUsers.js'

export const reminderLeadMs = 8 * 60 * 60_000

export function formatScreening(startsAt) {
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long', timeStyle: 'short', timeZone: cinemaTimeZone,
  }).format(startsAt) + ' (Colombo time)'
}

export async function loadBookingEmail(job, { getUser }) {
  const booking = await Booking.findOne({ _id: job.reference, status: 'confirmed' }).lean()
  if (!booking) return null
  let user = await User.findOne({ clerkId: booking.userId }).lean()
  if (!user) {
    await syncClerkUsers(booking.userId, getUser)
    user = await User.findOne({ clerkId: booking.userId }).lean()
  }
  return user?.email && !user.deleted ? { booking, user } : null
}

export async function sendBookingConfirmation(job, deps) {
  const data = await loadBookingEmail(job, deps)
  if (!data) return skipEmail(job)
  const { booking, user } = data
  const format = new Intl.NumberFormat('en-LK', { style: 'currency', currency: booking.currency })
  const total = format.format(booking.priceMinor * booking.seats.length / 10 ** format.resolvedOptions().maximumFractionDigits)
  return sendEmail(job, {
    to: user.email,
    subject: 'QuickShow booking confirmed',
    text: [
      'Your QuickShow booking is confirmed.',
      booking.title, formatScreening(booking.startsAt),
      'Seats: ' + booking.seats.join(', '), 'Total: ' + total,
      new URL('/my-bookings', deps.frontendOrigin).href,
    ].join('\n'),
  }, deps.sender)
}
