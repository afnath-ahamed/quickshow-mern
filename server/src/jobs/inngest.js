import { Inngest } from 'inngest'
import Booking from '../models/Booking.js'
import NotificationJob, { queueJob } from '../models/NotificationJob.js'
import { announceNewShow } from './announceNewShow.js'
import { releaseExpiredSeats } from './releaseExpiredSeats.js'
import { sendBookingConfirmation } from './sendBookingConfirmation.js'
import { sendShowReminders } from './sendShowReminders.js'
import { syncClerkUsers } from './syncClerkUsers.js'

const eventName = (kind) => 'quickshow/jobs.' + kind
const dispatchInterval = 5 * 60_000

export const inngest = new Inngest({ id: 'quickshow' })

export async function recoverExpiredHolds(now) {
  const bookings = await Booking.aggregate([
    { $match: { status: 'held', expiresAt: { $lte: now } } },
    { $sort: { expiresAt: 1 } },
    { $project: { jobId: { $concat: ['release:', { $toString: '$_id' }] } } },
    { $lookup: { from: NotificationJob.collection.name, localField: 'jobId', foreignField: '_id', as: 'job' } },
    { $match: { 'job.0': { $exists: false } } },
    { $limit: 100 },
  ])
  for (const { _id, jobId } of bookings) {
    await queueJob({ id: jobId, kind: 'release', reference: _id, dueAt: now })
  }
}

export async function runNotificationJob(kind, id, deps) {
  if (typeof id !== 'string' || id.length > 256) return
  const job = await NotificationJob.findOne({ _id: id, kind, state: 'pending', dueAt: { $lte: new Date() } }).lean()
  if (!job) return
  if (kind === 'confirmation') return sendBookingConfirmation(job, deps)
  if (kind === 'reminder') return sendShowReminders(job, deps)
  if (kind === 'announce') return announceNewShow(job, deps)
  if (kind === 'clerk') await syncClerkUsers(job.reference, deps.getUser)
  const next = kind === 'release' ? await releaseExpiredSeats(job.reference, deps.closeExpiredCheckout) : null
  await NotificationJob.updateOne({ _id: id, state: 'pending' }, next ? {
    $set: { dueAt: next }, $unset: { dispatchedAt: 1 },
  } : { state: 'done' })
}

export function createNotificationFunctions(client, deps) {
  const handlers = ['clerk', 'release', 'confirmation', 'reminder', 'announce'].map((kind) => client.createFunction({
    id: kind,
    triggers: { event: eventName(kind) },
    concurrency: [
      { limit: 8 },
      { limit: 1, key: 'event.data.scope' },
    ],
  }, ({ event, step }) => step.run('process-queued-job', () => runNotificationJob(kind, event.data?.id, deps))))

  const dispatch = client.createFunction({
    id: 'dispatch-notifications',
    triggers: { cron: '* * * * *' },
    concurrency: { limit: 1 },
  }, async ({ step }) => {
    const due = await step.run('find-due-jobs', async () => {
      const now = new Date()
      const previous = new Date(+now - dispatchInterval)
      await recoverExpiredHolds(now)
      await NotificationJob.updateMany({ state: 'sending', deliveryStartedAt: { $lte: previous } }, { state: 'uncertain' })
      const jobs = await NotificationJob.find({
        state: 'pending', dueAt: { $lte: now },
        $or: [{ dispatchedAt: { $exists: false } }, { dispatchedAt: { $lte: previous } }],
      }).sort({ dueAt: 1, _id: 1 }).limit(100).lean()
      return { time: now.toISOString(), jobs: jobs.map(({ _id, kind, reference, recipient }) => ({
        id: _id, kind, scope: recipient || reference,
      })) }
    })
    if (!due.jobs.length) return
    const tick = Math.floor(Date.parse(due.time) / 60_000)
    await step.sendEvent('dispatch', due.jobs.map(({ id, kind, scope }) => ({
      id: id + ':' + tick, name: eventName(kind), data: { id, scope },
    })))
    await step.run('record-dispatch', () => NotificationJob.updateMany({
      _id: { $in: due.jobs.map(({ id }) => id) }, state: 'pending',
    }, { dispatchedAt: new Date(due.time) }))
  })

  const backfill = client.createFunction({
    id: 'backfill-clerk-users',
    triggers: { event: 'quickshow/clerk.backfill' },
    concurrency: { limit: 1 },
  }, async ({ event, step }) => {
    let total
    for (let offset = 0; total === undefined || offset < total; offset += 100) {
      total = await step.run('queue-users-' + offset, async () => {
        const page = await deps.listUsers({ limit: 100, offset, orderBy: '+created_at' })
        for (const { id } of page.data) {
          await queueJob({ id: 'clerk-backfill:' + event.id + ':' + id, kind: 'clerk', reference: id })
        }
        return page.totalCount
      })
    }
  })

  return [...handlers, dispatch, backfill]
}
