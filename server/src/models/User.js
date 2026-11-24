import { Schema, model } from 'mongoose'

const userSchema = new Schema({ clerkId: String }, { timestamps: true })

export default model('User', userSchema)
