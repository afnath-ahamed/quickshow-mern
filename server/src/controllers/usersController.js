import mongoose from 'mongoose'
import { queueJob } from '../models/NotificationJob.js'
import User from '../models/User.js'

export function getCurrentUser(_request, response) {
  return response.json(response.locals.currentUser)
}

export async function getEmailPreferences(_request, response) {
  const user = await User.findOne({ clerkId: response.locals.currentUser.userId }).lean()
  return response.json({ showAnnouncements: user?.showAnnouncements === true && !user.deleted })
}

export async function updateEmailPreferences(request, response) {
  const showAnnouncements = request.body?.showAnnouncements
  if (typeof showAnnouncements !== 'boolean') {
    return response.status(400).json({ message: 'Choose whether to receive show announcements.' })
  }
  const clerkId = response.locals.currentUser.userId
  await mongoose.connection.transaction(async (session) => {
    await User.updateOne({ clerkId }, { showAnnouncements }, { upsert: true, session })
    if (showAnnouncements) await queueJob({
      id: 'clerk-preferences:' + new mongoose.Types.ObjectId(), kind: 'clerk', reference: clerkId,
    }, session)
  })
  return response.json({ showAnnouncements })
}
