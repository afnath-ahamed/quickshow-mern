import { Schema, model } from 'mongoose'

const paymentSchema = new Schema({
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  show: { type: Schema.Types.ObjectId, ref: 'Show', required: true },
  amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
  state: { type: String, enum: ['started', 'confirmed', 'refund_pending', 'refunded', 'refund_failed'], default: 'started' },
  sessionId: { type: String, unique: true, sparse: true },
  sessionClosed: { type: Boolean, default: false },
  paymentIntentId: { type: String, unique: true, sparse: true },
  paidAt: Date,
  refundId: String,
}, { timestamps: true })

paymentSchema.index({ state: 1, show: 1 })

export default model('Payment', paymentSchema)
