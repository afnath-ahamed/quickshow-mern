import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { after, before, test } from 'node:test'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { createApp } from '../src/app.js'
import { recoverExpiredHolds, runNotificationJob } from '../src/jobs/inngest.js'
import { syncClerkUsers } from '../src/jobs/syncClerkUsers.js'
import Booking from '../src/models/Booking.js'
import Movie from '../src/models/Movie.js'
import NotificationJob, { queueJob } from '../src/models/NotificationJob.js'
import SeatClaim from '../src/models/SeatClaim.js'
import Show from '../src/models/Show.js'
import User from '../src/models/User.js'
import { scheduleShows } from '../src/services/showService.js'

const owner = 'user_NotificationTest'
const showStartsAt = new Date(Date.now() + 12 * 60 * 60_000)
const messages = []
const secretBytes = Buffer.alloc(32, 8)
const secret = 'whsec_' + secretBytes.toString('base64')
const account = {
  firstName: 'Test', lastName: 'Customer', primaryEmailAddressId: 'email_primary',
  emailAddresses: [{ id: 'email_primary', emailAddress: 'verified@example.test', verification: { status: 'verified' } }],
}
const deps = {
  getUser: async () => account, frontendOrigin: 'http://localhost:5173',
  sender: async (message) => { messages.push(message); return { messageId: 'mail-' + messages.length } },
}
let repl
let server
let base
let show
let movie

before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(repl.getUri('notifications'))
  await Promise.all([NotificationJob, User, Show, Movie, Booking, SeatClaim].map((model) => model.init()))
  movie = await Movie.create({ title: 'Notification Test', tmdbId: '878787' })
  show = await Show.create({ movie: movie.id, startsAt: showStartsAt, priceMinor: 150000, currency: 'LKR' })
  const app = createApp({
    clerkWebhookSecret: secret,
    authenticate: (_req, _res, next) => next(),
    readAuth: (req) => ({ isAuthenticated: Boolean(req.get('authorization')), userId: owner }),
    getUser: deps.getUser,
  })
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  base = 'http://127.0.0.1:' + server.address().port
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
  await repl?.stop()
})

async function fixture(status, seat, startsAt = showStartsAt) {
  return Booking.create({
    userId: owner, customerName: 'Test Customer', requestId: 'test-' + seat,
    show: show.id, movieId: movie.tmdbId, title: movie.title, startsAt,
    status, expiresAt: new Date(Date.now() - 60_000), priceMinor: 150000, currency: 'LKR', seats: [seat],
  })
}

test('Clerk webhook signature, replay, latest user data and announcement preference ownership', async () => {
  const raw = JSON.stringify({ type: 'user.created', data: { id: owner, email_addresses: [] } })
  const id = 'msg_notification_test'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = 'v1,' + createHmac('sha256', secretBytes).update([id, timestamp, raw].join('.')).digest('base64')
  const headers = { 'content-type': 'application/json', 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': signature }
  assert.equal((await fetch(base + '/api/webhooks/clerk', {
    method: 'POST', headers, body: raw + ' ',
  })).status, 400)
  for (let attempt = 0; attempt < 2; attempt++) assert.equal((await fetch(base + '/api/webhooks/clerk', {
    method: 'POST', headers, body: raw,
  })).status, 200)
  const key = 'clerk:' + id
  assert.equal(await NotificationJob.countDocuments({ _id: key }), 1)
  await runNotificationJob('clerk', key, deps)
  const route = base + '/api/users/me/email-preferences'
  assert.equal((await fetch(route)).status, 401)
  assert.deepEqual(await (await fetch(route, { headers: { authorization: 'signed-in' } })).json(), { showAnnouncements: false })
  assert.equal((await fetch(route, {
    method: 'PUT', headers: { authorization: 'signed-in', 'content-type': 'application/json' },
    body: JSON.stringify({ showAnnouncements: true, userId: 'user_AnotherAccount' }),
  })).status, 200)
  assert.equal(await User.countDocuments({ clerkId: 'user_AnotherAccount' }), 0)
  assert.equal((await User.findOne({ clerkId: owner })).email, 'verified@example.test')
  await syncClerkUsers(owner, async () => { throw Object.assign(new Error('missing'), { status: 404 }) })
  const removed = await User.findOne({ clerkId: owner })
  assert.equal(removed.email, undefined)
  assert.equal(removed.deleted, true)
  assert.equal(removed.showAnnouncements, false)
  // Replayed events use Clerk's current account state, not historical event data.
  await syncClerkUsers(owner, async () => { throw Object.assign(new Error('missing'), { status: 404 }) })
  assert.equal(await User.countDocuments({ clerkId: owner, deleted: true }), 1)
  await syncClerkUsers(owner, deps.getUser)
})

test('expired hold cleanup keeps booking history, defers unresolved payments, and leaves reassigned seats alone', async () => {
  const expired = await fixture('held', 'A1')
  const reassigned = await fixture('confirmed', 'A2')
  await SeatClaim.create([
    { show: show.id, booking: expired.id, seat: 'A1', status: 'held', expiresAt: expired.expiresAt },
    { show: show.id, booking: reassigned.id, seat: 'A2', status: 'confirmed', expiresAt: expired.expiresAt },
  ])
  await recoverExpiredHolds(new Date())
  const id = 'release:' + expired.id
  await runNotificationJob('release', id, { ...deps, closeExpiredCheckout: async () => false })
  assert.equal((await Booking.findById(expired.id)).status, 'held')
  assert.equal(await SeatClaim.countDocuments({ booking: expired.id }), 1)
  await NotificationJob.updateOne({ _id: id }, { dueAt: new Date() })
  await runNotificationJob('release', id, { ...deps, closeExpiredCheckout: async () => true })
  assert.equal((await Booking.findById(expired.id)).status, 'expired')
  assert.equal(await SeatClaim.countDocuments({ booking: expired.id }), 0)
  assert.equal(await SeatClaim.countDocuments({ booking: reassigned.id, status: 'confirmed' }), 1)
})

test('confirmation claims one delivery, retries SMTP rejection, and reminders skip past shows', async () => {
  const b = await fixture('confirmed', 'B1')
  await queueJob({ id: 'confirmation-b', kind: 'confirmation', reference: b.id })
  let attempt = 0
  const sender = async (message) => {
    if (++attempt === 1) throw Object.assign(new Error('retry'), { responseCode: 450 })
    return deps.sender(message)
  }
  await assert.rejects(runNotificationJob('confirmation', 'confirmation-b', { ...deps, sender }), /temporarily rejected/)
  await Promise.all(Array.from({ length: 3 }, () => runNotificationJob('confirmation', 'confirmation-b', { ...deps, sender })))
  assert.equal(messages.length, 1)
  assert.match(messages[0].text, /Notification Test[\s\S]*Seats: B1/)
  assert.match(messages[0].text, /Colombo time/)
  assert.equal((await NotificationJob.findById('confirmation-b')).state, 'sent')

  await queueJob({ id: 'reminder-b', kind: 'reminder', reference: b.id, dueAt: new Date(Date.now() + 60_000) })
  await runNotificationJob('reminder', 'reminder-b', deps)
  assert.equal(messages.length, 1)
  await NotificationJob.updateOne({ _id: 'reminder-b' }, { dueAt: new Date() })
  await runNotificationJob('reminder', 'reminder-b', deps)
  assert.match(messages.at(-1).subject, /screening is coming up/)
  const past = await fixture('confirmed', 'B2', new Date(Date.now() - 60_000))
  await queueJob({ id: 'reminder-past', kind: 'reminder', reference: past.id })
  await runNotificationJob('reminder', 'reminder-past', deps)
  assert.equal((await NotificationJob.findById('reminder-past')).state, 'skipped')
  assert.equal(messages.length, 2)
})

test('duplicate show batches queue one announcement and send only to current opt-ins', async () => {
  await User.updateOne({ clerkId: owner }, { showAnnouncements: true })
  await User.create({ clerkId: 'user_NotSubscribed', email: 'other@example.test' })
  const input = {
    movieId: movie.tmdbId, priceMinor: 150000,
    dates: [new Date(+showStartsAt + 3_600_000), new Date(+showStartsAt + 7_200_000)],
  }
  const fetchMovie = () => assert.fail('Movie already exists')
  const [first, second] = await Promise.all([scheduleShows(input, 'LKR', fetchMovie), scheduleShows(input, 'LKR', fetchMovie)])
  assert.deepEqual(first, second)
  const queued = await NotificationJob.find({ kind: 'announce' }).lean()
  assert.equal(queued.length, 1)
  await runNotificationJob('announce', queued[0]._id, deps)
  const deliveries = await NotificationJob.find({ kind: 'announce', recipient: { $exists: true } }).lean()
  assert.equal(deliveries.length, 1)
  await runNotificationJob('announce', deliveries[0]._id, deps)
  await runNotificationJob('announce', deliveries[0]._id, deps)
  assert.equal(messages.filter((mail) => mail.subject.startsWith('New QuickShow')).length, 1)
  assert.equal(messages.at(-1).to, 'verified@example.test')
  assert.equal(messages.at(-1).text.split('Colombo time').length - 1, 2)
})
