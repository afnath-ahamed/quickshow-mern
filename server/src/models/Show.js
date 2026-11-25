import { Schema, model } from 'mongoose'

const showSchema = new Schema({
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  startsAt: { type: Date, required: true },
  priceMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
  announcementBatch: String,
}, { timestamps: true })

showSchema.index({ movie: 1, startsAt: 1 }, {
  unique: true,
  partialFilterExpression: { movie: { $type: 'objectId' }, startsAt: { $type: 'date' } },
})
showSchema.index({ startsAt: 1 })
showSchema.index({ announcementBatch: 1, startsAt: 1 }, { sparse: true })

export default model('Show', showSchema)
