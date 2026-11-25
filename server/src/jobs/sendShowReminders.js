import { sendEmail, skipEmail } from '../services/emailService.js'
import { formatScreening, loadBookingEmail } from './sendBookingConfirmation.js'

export async function sendShowReminders(job, deps) {
  const data = await loadBookingEmail(job, deps)
  if (!data || data.booking.startsAt <= new Date()) return skipEmail(job)
  const { booking, user } = data
  return sendEmail(job, {
    to: user.email,
    subject: 'Your QuickShow screening is coming up',
    text: [
      booking.title, formatScreening(booking.startsAt),
      'Seats: ' + booking.seats.join(', '),
      new URL('/my-bookings', deps.frontendOrigin).href,
    ].join('\n'),
  }, deps.sender)
}
