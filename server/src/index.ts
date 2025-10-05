import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { createClient } from 'redis'
import authRouter from './routes/authRoutes'
import cors from 'cors'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/novisit')
  .then(() => {
    console.log('✅ MongoDB connected successfully')
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error)
  })

// Redis connection
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redisClient.connect()
  .then(() => {
    console.log('✅ Redis connected successfully')
  })
  .catch((error) => {
    console.error('❌ Redis connection error:', error)
  })

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'Novisit API is running!' })
})

app.use('/auth', authRouter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisClient.isReady ? 'connected' : 'disconnected'
    }
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
})