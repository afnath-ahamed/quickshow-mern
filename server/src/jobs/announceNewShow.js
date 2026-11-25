import mongoose from 'mongoose'
import NotificationJob, { queueJob } from '../models/NotificationJob.js'
import Show from '../models/Show.js'
import User from '../models/User.js'
import { sendEmail, skipEmail } from '../services/emailService.js'
import { formatScreening } from './sendBookingConfirmation.js'

export async function announceNewShow(job, deps) {
  if (job.recipient) {
    const [user, shows] = await Promise.all([
      User.findOne({ clerkId: job.recipient, deleted: false, showAnnouncements: true }).lean(),
      Show.find({ announcementBatch: job.reference, startsAt: { $gt: new Date() } })
        .sort('startsAt').populate('movie', 'title tmdbId').lean(),
    ])
    const movie = shows[0]?.movie
    if (!user?.email || !movie) return skipEmail(job)
    return sendEmail(job, {
      to: user.email,
      subject: 'New QuickShow screenings for ' + movie.title,
      text: [
        movie.title, ...shows.map(({ startsAt }) => formatScreening(startsAt)),
        new URL('/movies/' + movie.tmdbId, deps.frontendOrigin).href,
        'Manage show announcements in My Bookings.',
      ].join('\n'),
    }, deps.sender)
  }

  let after
  for (;;) {
    const users = await User.find({
      showAnnouncements: true, deleted: false, email: { $type: 'string' },
      ...(after && { _id: { $gt: after } }),
    }).select('clerkId').sort('_id').limit(100).lean()
    if (!users.length) break
    await mongoose.connection.transaction(async (session) => {
      for (const { clerkId } of users) {
        await queueJob({
          id: 'announce:' + job.reference + ':' + clerkId,
          kind: 'announce', reference: job.reference, recipient: clerkId,
        }, session)
      }
    })
    after = users.at(-1)._id
  }
  await NotificationJob.updateOne({ _id: job._id, state: 'pending' }, { state: 'done' })
}
