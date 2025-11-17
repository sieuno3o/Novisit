import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createClient } from "redis";
import authRouter from "./routes/authRoutes.js";

import mainRoutes from "./routes/mainRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cors from "cors";
import { CrawlingService } from './services/crawlingService.js'
import { initDiscordBot } from "./services/discordService";
import { registerCrawltestApi } from './test/crawltest.js'
import { initializeDomains } from "./repository/mongodb/domainRepository.js";
import { initialDomains } from "./data/initialDomains.js";
import discordMessageTestRouter from "./test/discordMessageTest.js";

// Load environment variables
dotenv.config();


const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_BASE_URL || process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/novisit")
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    // 초기 도메인 데이터 생성 (도메인이 없을 경우에만)
    try {
      await initializeDomains(initialDomains);
    } catch (error) {
      console.error("❌ 초기 도메인 데이터 생성 중 오류:", error);
      // 초기화 실패해도 서버는 계속 실행되도록 함
    }
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

app.use(mainRoutes);
app.use("/settings", settingsRoutes);
app.use("/users", userRoutes);
app.use("/test", discordMessageTestRouter);

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

// 디스코드 봇 실행
initDiscordBot()
  .then(() => console.log("🤖 Discord Bot initialized successfully"))
  .catch((err) => console.error("❌ Discord Bot initialization failed:", err));

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
