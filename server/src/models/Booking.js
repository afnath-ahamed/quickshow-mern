import { Schema, model } from 'mongoose'

const bookingSchema = new Schema({ status: String }, { timestamps: true })

export default model('Booking', bookingSchema)
