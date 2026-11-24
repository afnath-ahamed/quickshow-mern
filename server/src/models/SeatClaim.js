import { Schema, model } from 'mongoose'

const seatClaimSchema = new Schema({
  show: { type: Schema.Types.ObjectId, ref: 'Show', required: true },
  seat: { type: String, required: true },
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  status: { type: String, enum: ['held', 'confirmed'], required: true },
  expiresAt: { type: Date, required: true },
})

seatClaimSchema.index({ show: 1, seat: 1 }, { unique: true })

export default model('SeatClaim', seatClaimSchema)
