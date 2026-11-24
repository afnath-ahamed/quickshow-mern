import { Schema, model } from 'mongoose'

const movieSchema = new Schema({ title: String }, { timestamps: true })

export default model('Movie', movieSchema)
