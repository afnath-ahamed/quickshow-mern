import { Schema, model } from 'mongoose'

const favoriteSchema = new Schema({
  userId: { type: String, required: true },
  movieId: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

favoriteSchema.index({ userId: 1, movieId: 1 }, { unique: true })

export default model('Favorite', favoriteSchema)
