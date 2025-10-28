# Novisit

부경대학교 공지사항 자동 크롤링 및 알림 서비스를 제공하는 풀스택 웹 애플리케이션입니다.

## 🚀 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **React Query** - Server state management
- **Zustand** - Client state management
- **SCSS** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Database
- **Redis** - Caching and session storage
- **BullMQ** - Job queue management
- **Playwright** - Web crawling automation
- **node-cron** - Job scheduling

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline

## ✨ Features

- 🔐 **OAuth 인증** - 카카오, Discord 소셜 로그인
- 🕷️ **자동 크롤링** - 부경대학교 공지사항 자동 수집
- ⏰ **스케줄링** - 매일 정해진 시간에 자동 크롤링 (9시, 14시)
- 💾 **데이터 관리** - MongoDB를 통한 공지사항 저장 및 검색
- 🔄 **작업 큐** - BullMQ를 통한 안정적인 작업 관리
- 📊 **실시간 모니터링** - 큐 상태 및 크롤링 현황 확인

## 📁 Project Structure

```
Novisit/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Layout.tsx
│   │   │   └── NavBar.tsx
│   │   ├── features/           # Feature modules
│   │   │   └── login/
│   │   ├── pages/              # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── MainPage.tsx
│   │   │   ├── MyPage.tsx
│   │   │   ├── NoticePage.tsx
│   │   │   └── SignupPage.tsx
│   │   ├── routes/             # Route configuration
│   │   │   └── RequireAuth.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── assets/             # Static assets
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── auth/               # OAuth providers
│   │   │   ├── discord.ts
│   │   │   ├── jwt.ts
│   │   │   └── kakao.ts
│   │   ├── crawl/              # Web crawling
│   │   │   └── webCrawler.ts
│   │   ├── schedule/           # Job scheduling
│   │   │   └── jobScheduler.ts
│   │   ├── config/             # Configuration
│   │   │   └── redis.ts        # BullMQ & Redis setup
│   │   ├── models/             # MongoDB models
│   │   │   ├── User.ts
│   │   │   └── Notice.ts
│   │   ├── repository/         # Data access layer
│   │   │   ├── mongodb/
│   │   │   │   ├── userRepository.ts
│   │   │   │   └── noticeRepository.ts
│   │   │   └── redis/
│   │   │       └── tokenRepository.ts
│   │   ├── routes/             # API routes
│   │   │   └── authRoutes.ts
│   │   ├── services/           # Business logic
│   │   │   ├── authService.ts
│   │   │   └── crawlingService.ts
│   │   ├── middleware/         # Express middleware
│   │   │   └── authMiddleware.ts
│   │   ├── types/              # TypeScript types
│   │   │   └── crawl.ts
│   │   └── index.ts            # Server entry point
│   ├── CRAWLING_GUIDE.md       # Crawling documentation
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml          # Production services
├── docker-compose.dev.yml      # Development services
├── Dockerfile                  # Application image
├── package.json                # Root package.json
└── README.md                   # This file
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (for database operations)
- Redis (for caching and job queue)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd novisit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment template
   cp server/env.example server/.env
   
   # Edit server/.env with your configuration
   ```

4. **Install Playwright browsers** (크롤링 기능 사용 시)
   ```bash
   cd server
   npm run install-playwright
   cd ..
   ```

5. **Start development services**
   ```bash
   # Option 1: Start only database services
   docker-compose -f docker-compose.dev.yml up -d
   
   # Option 2: Start all services (including app)
   docker-compose up -d
   
   # Start development servers (if not using Docker for app)
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

### Environment Variables

Copy the example environment file and configure your variables:

```bash
cp server/env.example server/.env
```

Update the `server/.env` file with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/novisit

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OAuth Configuration
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_REDIRECT_URI=http://localhost:5000/auth/kakao/callback
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:5000/auth/discord/callback

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
```

## 🐳 Docker

### Development
```bash
# Start only database services (MongoDB + Redis)
docker-compose -f docker-compose.dev.yml up -d

# Start all services (including application)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```


## 🚀 Deployment

### GitHub Actions CI/CD

The project includes GitHub Actions workflows for:
- **CI Pipeline** (`.github/workflows/ci.yml`): Code quality checks, linting, type checking, and building
- **CD Pipeline** (`.github/workflows/cd.yml`): Automated deployment to AWS EC2

#### Required Secrets
Configure the following secrets in your GitHub repository settings:

```bash
# EC2 Connection
EC2_HOST=your-ec2-public-ip-or-domain
EC2_USERNAME=ubuntu  # or your EC2 username
EC2_SSH_KEY=your-private-ssh-key
EC2_PORT=22  # optional, defaults to 22

# Database Configuration
MONGODB_URI=mongodb://your-mongodb-connection-string
REDIS_URL=redis://your-redis-connection-string
```

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Build Docker image**
   ```bash
   docker build -t novisit .
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

## 📝 Available Scripts

### Root Level
- `npm run dev` - Start development servers (client + server)
- `npm run build` - Build both client and server
- `npm run docker:build` - Build Docker images
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker logs

### Client
- `npm run client:dev` - Start Vite development server
- `npm run client:build` - Build for production
- `npm run client:preview` - Preview production build

### Server
- `npm run server:dev` - Start server with hot reload (tsx watch)
- `npm run server:build` - Build TypeScript to JavaScript
- `npm run server:start` - Start production server (node dist/index.js)
- `npm run server:install-playwright` - Install Playwright browsers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔧 Configuration

### MongoDB
- Default database: `novisit`
- Collections:
  - `users` - 사용자 정보 및 OAuth 연동
  - `notices` - 크롤링된 공지사항
- Connection: `mongodb://localhost:27017/novisit`
- Indexes:
  - `users`: `email` (unique)
  - `notices`: `number + source` (unique, 중복 방지)

### Redis
- Default port: `6379`
- Used for:
  - OAuth 토큰 저장
  - BullMQ 작업 큐 (크롤링 스케줄링)
  - 세션 관리
- Connection: `redis://localhost:6379`

### 크롤링 스케줄

자동 크롤링은 다음 시간에 실행됩니다 (한국시간 기준):
- 매일 오전 9시, 12시, 오후 3시, 6시

스케줄 변경: `server/src/schedule/jobScheduler.ts` 참조

## 📊 Monitoring

- **Health check**: `/health` - 서비스 상태 확인
- **큐 상태**: 서버 로그에서 5분마다 자동 출력
  ```
  📊 큐 상태 - 대기: 0, 실행중: 1, 완료: 5, 실패: 0
  ```

## 🕷️ Crawling System

### 크롤링 대상
- 부경대학교 공지사항 (https://www.pknu.ac.kr/main/163)

### 기술 스택
- **Playwright**: 헤드리스 브라우저 기반 크롤링
- **BullMQ**: 작업 큐 관리 및 재시도 로직
- **node-cron**: 시간 기반 스케줄링

### 데이터 저장
크롤링된 공지사항은 MongoDB에 저장되며, 다음 정보를 포함합니다:
- 공지사항 번호
- 제목
- 링크
- 크롤링 시간

중복 공지사항은 자동으로 업데이트되며, 새로운 공지사항만 추가됩니다.

자세한 내용은 [server/CRAWLING_GUIDE.md](server/CRAWLING_GUIDE.md)를 참조하세요.

## 📡 API Endpoints

### 인증 (Auth)
- `POST /auth/kakao` - 카카오 로그인
- `POST /auth/discord` - Discord 로그인
- `GET /auth/kakao/callback` - 카카오 OAuth 콜백
- `GET /auth/discord/callback` - Discord OAuth 콜백

### 시스템
- `GET /health` - 서비스 상태 확인
- `GET /api` - API 정보

## 🆘 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5000, 6379, and 27017 are available
2. **Docker issues**: Make sure Docker is running and you have sufficient permissions
3. **Database connection**: Verify MongoDB and Redis are running and accessible
4. **Environment variables**: Check that all required environment variables are set

### Getting Help

- Check the logs: `docker-compose logs -f`
- Verify services: `docker-compose ps`
- Test connectivity: `curl http://localhost:5000/health`