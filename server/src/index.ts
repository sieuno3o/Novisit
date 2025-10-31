import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createClient } from "redis";
import authRouter from "./routes/authRoutes";
import testRouter from "./routes/testRoutes";
import mainRoutes from "./routes/mainRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import userRoutes from "./routes/userRoutes";
import cors from "cors";
import { CrawlingService } from './services/crawlingService.js'
import { registerCrawltestApi } from './test/crawltest'

// Load environment variables
dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/novisit")
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
  });

// Redis connection (for auth)
export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient
  .connect()
  .then(() => {
    console.log('✅ Redis (auth) connected successfully')
  })
  .catch((error) => {
    console.error("❌ Redis connection error:", error);
  });

// API routes
app.get("/api", (req, res) => {
  res.json({ message: "Novisit API is running!" });
});

app.use("/auth", authRouter);
app.use("/test", testRouter);
app.use(mainRoutes);
app.use("/settings", settingsRoutes);
app.use("/users", userRoutes);

// 수동 크롤 트리거 API 등록
registerCrawltestApi(app);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisClient.isReady ? 'connected' : 'disconnected'
    }
  })
})

// 크롤링 서비스 인스턴스
const crawlingService = new CrawlingService()

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  
  // 크롤링 스케줄러 초기화 (서버 시작 후)
  crawlingService.initialize()
})

// Graceful shutdown 처리
const shutdown = async () => {
  console.log('\n🛑 서버를 종료합니다...')
  
  try {
    await crawlingService.shutdown()
    await redisClient.disconnect()
    await mongoose.connection.close()
    console.log('✅ 모든 연결이 종료되었습니다.')
    process.exit(0)
  } catch (error) {
    console.error('❌ 종료 중 오류:', error)
    process.exit(1)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
