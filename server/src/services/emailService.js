import nodemailer from 'nodemailer'
import NotificationJob from '../models/NotificationJob.js'

export function createEmailSender(env = process.env) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TEST_RECIPIENT } = env
  const port = Number(SMTP_PORT || 587)
  const testMode = env.NODE_ENV !== 'production' || ['1', 'true'].includes(env.INNGEST_DEV)
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM ||
      (testMode && !EMAIL_TEST_RECIPIENT)) return null
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return null

  const transport = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 30_000,
  })
  return ({ to, ...message }) => transport.sendMail({
    ...message, from: EMAIL_FROM, to: EMAIL_TEST_RECIPIENT || to,
  })
}

export async function skipEmail(job) {
  await NotificationJob.updateOne({ _id: job._id, state: 'pending' }, { state: 'skipped' })
}

export async function sendEmail(job, message, sender) {
  if (!sender) throw new Error('Configure the notification SMTP sender.')
  const target = { _id: job._id, state: 'sending' }
  const claim = await NotificationJob.updateOne({ _id: job._id, state: 'pending' }, {
    state: 'sending', deliveryStartedAt: new Date(),
  })
  if (!claim.modifiedCount) return

  let result
  try {
    result = await sender(message)
  } catch (error) {
    const rejected = Number.isInteger(error.responseCode) && error.responseCode >= 400 && error.responseCode < 600
    if (rejected && error.responseCode >= 500) {
      await NotificationJob.updateOne(target, { state: 'failed' })
      return
    }
    if (rejected || ['CONN', 'AUTH', 'EHLO', 'STARTTLS'].includes(error.command)) {
      await NotificationJob.updateOne(target, { state: 'pending' })
      throw new Error('SMTP temporarily rejected the notification.')
    }
    // The connection may have dropped after the provider accepted the message.
    await NotificationJob.updateOne(target, { state: 'uncertain' })
    return
  }
  await NotificationJob.updateOne(target, { state: 'sent', messageId: result.messageId })
}
