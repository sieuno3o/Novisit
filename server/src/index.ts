import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { createClient } from 'redis'
import authRouter from './routes/authRoutes.js'
import { JobScheduler } from './schedule/jobScheduler.js'
import { connection as bullmqConnection } from './config/redis.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

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

// Redis connection (for auth)
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redisClient.connect()
  .then(() => {
    console.log('✅ Redis (auth) connected successfully')
  })
  .catch((error) => {
    console.error('❌ Redis connection error:', error)
  })

// BullMQ Redis connection check
bullmqConnection.ping()
  .then(() => {
    console.log('✅ Redis (BullMQ) connected successfully')
  })
  .catch((error) => {
    console.error('❌ BullMQ Redis connection error:', error)
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

// 크롤링 스케줄러 초기화
async function initializeScheduler() {
  try {
    console.log('🔄 크롤링 스케줄러 초기화 중...')
    
    // BullMQ 연결 확인
    await bullmqConnection.ping()
    console.log('✅ BullMQ Redis 연결 확인 완료')
    
    const scheduler = new JobScheduler()
    
    // 부경대학교 공지사항 크롤링 스케줄링 (9, 12, 15, 18시)
    scheduler.start()
    
    console.log('✅ 크롤링 스케줄러가 성공적으로 시작되었습니다!')
    console.log('📅 정기 스케줄: 한국시간 9시, 12시, 15시, 18시에 자동 크롤링')
    
    // 큐 상태 모니터링 (5분마다)
    setInterval(async () => {
      const status = await scheduler.getQueueStatus()
      if (status) {
        console.log(`📊 큐 상태 - 대기: ${status.waiting}, 실행중: ${status.active}, 완료: ${status.completed}, 실패: ${status.failed}`)
      }
    }, 5 * 60 * 1000)
    
  } catch (error) {
    console.error('❌ 크롤링 스케줄러 초기화 실패:', error)
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  
  // 스케줄러 초기화 (서버 시작 후)
  initializeScheduler()
})

// Graceful shutdown 처리
process.on('SIGINT', async () => {
  console.log('\n🛑 서버를 종료합니다...')
  
  try {
    await redisClient.disconnect()
    await bullmqConnection.disconnect()
    await mongoose.connection.close()
    console.log('✅ 모든 연결이 종료되었습니다.')
    process.exit(0)
  } catch (error) {
    console.error('❌ 종료 중 오류:', error)
    process.exit(1)
  }
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 서버를 종료합니다...')
  
  try {
    await redisClient.disconnect()
    await bullmqConnection.disconnect()
    await mongoose.connection.close()
    console.log('✅ 모든 연결이 종료되었습니다.')
    process.exit(0)
  } catch (error) {
    console.error('❌ 종료 중 오류:', error)
    process.exit(1)
  }
})
