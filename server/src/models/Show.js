import { Schema, model } from 'mongoose'

const showSchema = new Schema({ startsAt: Date }, { timestamps: true })

export default model('Show', showSchema)
