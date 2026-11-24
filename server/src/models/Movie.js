import { Schema, model } from 'mongoose'

const castMemberSchema = new Schema({
  name: { type: String, required: true },
  imageUrl: String,
}, { _id: false })

const movieSchema = new Schema({
  tmdbId: { type: String, required: true, unique: true, sparse: true },
  title: { type: String, required: true },
  overview: { type: String, default: '' },
  posterUrl: { type: String, default: '' },
  backdropUrl: { type: String, default: '' },
  genres: { type: [String], default: [] },
  releaseDate: { type: String, default: '' },
  originalLanguage: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  runtime: { type: Number, default: 0 },
  cast: { type: [castMemberSchema], default: [] },
  trailerId: { type: String, default: null },
}, { timestamps: true })

export default model('Movie', movieSchema)
