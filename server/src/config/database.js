import mongoose from 'mongoose'

export function connectDatabase(uri) {
  return mongoose.connect(uri)
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === mongoose.STATES.connected
}
