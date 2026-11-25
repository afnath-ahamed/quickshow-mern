import { Schema, model } from 'mongoose'

const notificationJobSchema = new Schema({
  _id: String,
  kind: { type: String, required: true },
  reference: { type: String, required: true },
  recipient: String,
  dueAt: { type: Date, required: true },
  state: { type: String, enum: ['pending', 'sending', 'sent', 'done', 'skipped', 'failed', 'uncertain'], default: 'pending' },
  dispatchedAt: Date,
  messageId: String,
  deliveryStartedAt: Date,
}, { timestamps: true })

notificationJobSchema.index({ state: 1, dueAt: 1, _id: 1 })

const NotificationJob = model('NotificationJob', notificationJobSchema)

export function queueJob({ id, kind, reference, recipient, dueAt = new Date() }, session) {
  return NotificationJob.updateOne({ _id: id }, {
    $setOnInsert: { kind, reference: String(reference), recipient, dueAt, state: 'pending', createdAt: new Date() },
  }, { upsert: true, timestamps: false, session })
}

export default NotificationJob
