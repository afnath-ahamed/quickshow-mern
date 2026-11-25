import { Schema, model } from 'mongoose'

const userSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  displayName: String,
  email: String,
  deleted: { type: Boolean, default: false },
  showAnnouncements: { type: Boolean, default: false },
}, { timestamps: true })

userSchema.index({ showAnnouncements: 1, _id: 1 })

export default model('User', userSchema)
