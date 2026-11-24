import Favorite from '../models/Favorite.js'

export async function listFavorites(userId) {
  const favorites = await Favorite.find({ userId }, { movieId: 1, _id: 0 })
    .sort({ createdAt: -1, _id: -1 })
    .lean()
  return favorites.map(({ movieId }) => movieId)
}

export async function saveFavorite(userId, movieId) {
  try {
    await Favorite.updateOne({ userId, movieId }, { $setOnInsert: { userId, movieId } }, {
      upsert: true,
      runValidators: true,
    })
  } catch (error) {
    if (error.code !== 11000) throw error
  }
}

export async function removeFavorite(userId, movieId) {
  await Favorite.deleteOne({ userId, movieId })
}
