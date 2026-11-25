import User from '../models/User.js'

export async function syncClerkUsers(clerkId, getUser) {
  let account
  try {
    account = await getUser(clerkId)
  } catch (error) {
    if (error.status !== 404) throw new Error('Clerk user lookup failed.')
  }

  if (!account) {
    await User.updateOne({ clerkId }, {
      $set: { deleted: true, showAnnouncements: false },
      $unset: { displayName: 1, email: 1 },
    }, { upsert: true })
    return
  }

  const primary = account.emailAddresses?.find(({ id }) => id === account.primaryEmailAddressId)
  const fields = { displayName: [account.firstName, account.lastName].filter(Boolean).join(' ') || account.username || '', deleted: false }
  const update = primary?.verification?.status === 'verified'
    ? { $set: { ...fields, email: primary.emailAddress } }
    : { $set: fields, $unset: { email: 1 } }
  await User.updateOne({ clerkId }, update, { upsert: true })
}
