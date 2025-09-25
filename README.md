# Novisit

A full-stack web application built with React, Node.js, Express, BullMQ, Redis, and MongoDB.

## 🚀 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **React Query** - Server state management
- **Zustand** - Client state management

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Database
- **Redis** - Caching and session storage
- **BullMQ** - Job queue management

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline

## 📁 Project Structure

```
novisit/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main App component
│   │   ├── main.tsx       # Application entry point
│   │   ├── index.css      # Global styles
│   │   └── vite-env.d.ts  # Vite type definitions
│   ├── index.html         # HTML template
│   ├── package.json       # Frontend dependencies
│   ├── tsconfig.json      # TypeScript config
│   ├── tsconfig.node.json # Node TypeScript config
│   └── vite.config.ts     # Vite configuration
├── server/                # Node.js backend
│   ├── src/
│   │   └── index.ts       # Server entry point
│   ├── env.example        # Environment variables template
│   ├── package.json       # Backend dependencies
│   └── tsconfig.json      # TypeScript config
├── .github/
│   └── workflows/
│       └── build.yml      # GitHub Actions CI/CD
├── docker-compose.yml     # Production Docker services
├── docker-compose.dev.yml # Development Docker services
├── Dockerfile            # Multi-stage Docker image
├── Dockerfile.playwright # Playwright Docker image
├── package.json          # Root package.json (workspaces)
└── README.md             # Project documentation
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

4. **Start development services**
   ```bash
   # Option 1: Start only database services
   docker-compose -f docker-compose.dev.yml up -d
   
   # Option 2: Start all services (including app)
   docker-compose up -d
   
   # Start development servers (if not using Docker for app)
   npm run dev
   ```

5. **Access the application**
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
- Collections: `users`, `sessions`, `jobs` (to be created by application)
- Connection: `mongodb://localhost:27017/novisit`
- Note: Collections and indexes will be created by the application code

### Redis
- Default port: `6379`
- Used for caching and session storage
- BullMQ job queue backend
- Connection: `redis://localhost:6379`

## 📊 Monitoring

- Health check endpoint: `/health`

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