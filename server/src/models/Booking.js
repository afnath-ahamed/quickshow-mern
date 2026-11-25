import { Schema, model } from 'mongoose'

const bookingSchema = new Schema({
  userId: { type: String, required: true },
  customerName: { type: String, required: true },
  requestId: { type: String, required: true },
  show: { type: Schema.Types.ObjectId, ref: 'Show', required: true },
  movieId: { type: String, required: true },
  title: { type: String, required: true },
  posterUrl: { type: String, default: '' },
  runtime: { type: Number, min: 1, validate: Number.isSafeInteger },
  startsAt: { type: Date, required: true },
  seats: { type: [String], required: true },
  priceMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
  status: { type: String, enum: ['held', 'confirmed', 'expired'], required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true })

bookingSchema.index({ userId: 1, requestId: 1 }, {
  unique: true, partialFilterExpression: { userId: { $type: 'string' }, requestId: { $type: 'string' } },
})
bookingSchema.index({ userId: 1, createdAt: -1, _id: -1 })
bookingSchema.index({ show: 1, status: 1, expiresAt: 1 })
bookingSchema.index({ status: 1, expiresAt: 1 })
bookingSchema.index({ createdAt: -1, _id: -1 })

export default model('Booking', bookingSchema)
