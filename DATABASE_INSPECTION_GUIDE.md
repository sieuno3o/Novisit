# 🔍 데이터베이스 확인 가이드 (Docker 환경)

Docker 환경에서 Redis와 MongoDB에 직접 접속하여 저장된 데이터를 확인하는 방법입니다.

---

## 📋 목차
1. [Docker 컨테이너 시작](#1-docker-컨테이너-시작)
2. [Redis 데이터 확인](#2-redis-데이터-확인)
3. [MongoDB 데이터 확인](#3-mongodb-데이터-확인)
4. [GUI 도구 사용](#4-gui-도구-사용)

---

## 1. Docker 컨테이너 시작

### 개발 환경
```bash
# Redis와 MongoDB만 시작
docker-compose -f docker-compose.dev.yml up -d

# 또는 전체 서비스 시작
docker-compose up -d
```

### 실행 중인 컨테이너 확인
```bash
docker ps
```

**예상 출력:**
```
CONTAINER ID   IMAGE              PORTS                      NAMES
xxxxxxxxxxxx   redis:7-alpine     0.0.0.0:6379->6379/tcp    novisit-redis
xxxxxxxxxxxx   mongo:7            0.0.0.0:27017->27017/tcp  novisit-mongodb
```

---

## 2. Redis 데이터 확인

### 방법 1: Docker exec로 Redis CLI 접속

```bash
# Redis 컨테이너 접속
docker exec -it novisit-redis redis-cli
```

### Redis 기본 명령어

```bash
# 1. 모든 키 조회
KEYS *

# 2. 특정 패턴의 키 조회
KEYS token:*              # 모든 토큰 키
KEYS token:*:kakao:*      # 카카오 토큰만
KEYS token:*:discord:*    # 디스코드 토큰만

# 3. 특정 키의 값 조회
GET token:12345:kakao:accessToken

# 4. 키 개수 확인
DBSIZE

# 5. 키 타입 확인
TYPE token:12345:kakao:accessToken

# 6. 키 TTL(만료 시간) 확인
TTL token:12345:kakao:accessToken

# 7. 모든 데이터 삭제 (주의!)
FLUSHALL

# 8. Redis CLI 종료
exit
```

### 방법 2: PowerShell에서 직접 명령 실행

```powershell
# 단일 명령 실행
docker exec novisit-redis redis-cli KEYS "*"
docker exec novisit-redis redis-cli GET "token:12345:kakao:accessToken"
docker exec novisit-redis redis-cli DBSIZE
```

### 저장되는 데이터 구조 (Redis)

프로젝트에서 Redis는 주로 **인증 토큰 저장**에 사용됩니다:

```
키 형식: token:{userId}:{provider}:accessToken
예시: token:user123:kakao:accessToken
값: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

키 형식: token:{userId}:{provider}:refreshToken
예시: token:user123:kakao:refreshToken
값: def50200abc...
```

**실제 확인 예시:**
```bash
redis-cli> KEYS token:*
1) "token:67890:discord:accessToken"
2) "token:12345:kakao:accessToken"
3) "token:12345:kakao:refreshToken"

redis-cli> GET token:12345:kakao:accessToken
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI..."
```

---

## 3. MongoDB 데이터 확인

### 방법 1: Docker exec로 MongoDB Shell 접속

```bash
# MongoDB 컨테이너 접속 (mongosh 사용)
docker exec -it novisit-mongodb mongosh
```

### MongoDB 기본 명령어

```javascript
// 1. 데이터베이스 목록 조회
show dbs

// 2. 특정 데이터베이스 선택
use novisit

// 3. 컬렉션 목록 조회
show collections

// 4. notices 컬렉션의 모든 데이터 조회
db.notices.find()

// 5. 보기 좋게 포맷팅
db.notices.find().pretty()

// 6. 최신 5개 공지사항 조회 (크롤링 시간 기준)
db.notices.find().sort({ crawledAt: -1 }).limit(5)

// 7. 특정 조건으로 검색
db.notices.find({ source: "PKNU" })
db.notices.find({ number: "721861" })
db.notices.find({ title: /중어권/ })  // 제목에 '중어권' 포함

// 8. 공지사항 개수 확인
db.notices.countDocuments()

// 9. 특정 필드만 조회
db.notices.find({}, { title: 1, number: 1, _id: 0 })

// 10. 가장 최신 공지사항 1개
db.notices.find().sort({ number: -1 }).limit(1).pretty()

// 11. 특정 날짜 이후 크롤링된 공지사항
db.notices.find({ 
  crawledAt: { $gte: new Date("2025-10-10") } 
})

// 12. users 컬렉션 조회 (사용자 정보)
db.users.find().pretty()

// 13. 인덱스 확인
db.notices.getIndexes()

// 14. MongoDB Shell 종료
exit
```

### 방법 2: PowerShell에서 직접 명령 실행

```powershell
# 단일 명령 실행
docker exec novisit-mongodb mongosh --eval "use novisit; db.notices.countDocuments()"
docker exec novisit-mongodb mongosh --eval "use novisit; db.notices.find().limit(5)"
```

### 저장되는 데이터 구조 (MongoDB)

#### 1. **notices 컬렉션** (공지사항)
```json
{
  "_id": ObjectId("67890abcdef..."),
  "number": "721861",
  "title": "2026-1학기 중어권 파견 교환학생 추가모집 선발안내",
  "link": "https://www.pknu.ac.kr?action=view&no=721861",
  "source": "PKNU",
  "postedAt": "2025-10-10",
  "crawledAt": ISODate("2025-10-11T00:43:39.123Z")
}
```

#### 2. **users 컬렉션** (사용자 정보)
```json
{
  "_id": ObjectId("12345abcdef..."),
  "email": "user@example.com",
  "username": "홍길동",
  "provider": "kakao",
  "providerId": "1234567890",
  "createdAt": ISODate("2025-10-01T12:00:00.000Z")
}
```

**실제 확인 예시:**
```javascript
novisit> db.notices.find().limit(2).pretty()
[
  {
    _id: ObjectId("671234567890abcdef123456"),
    number: '721861',
    title: '2026-1학기 중어권 파견 교환학생 추가모집 선발안내',
    link: 'https://www.pknu.ac.kr?action=view&no=721861',
    source: 'PKNU',
    postedAt: '2025-10-10',
    crawledAt: ISODate('2025-10-11T00:43:39.456Z')
  },
  {
    _id: ObjectId("671234567890abcdef123457"),
    number: '721773',
    title: '「부경커리어멘토단 선배와 함께하는 멘토링 캠프:대기업편」 참여자 모집 안내',
    link: 'https://www.pknu.ac.kr?action=view&no=721773',
    source: 'PKNU',
    postedAt: '2025-10-09',
    crawledAt: ISODate('2025-10-11T00:43:39.789Z')
  }
]
```

---

## 4. GUI 도구 사용

### Redis GUI 도구

#### 1. **Redis Insight** (추천)
- 다운로드: https://redis.io/insight/
- 연결 정보:
  - Host: `localhost`
  - Port: `6379`

#### 2. **RedisInsight Desktop**
```bash
# Windows
winget install Redis.RedisInsight

# 또는 Docker로 실행
docker run -d --name redisinsight -p 8001:8001 redislabs/redisinsight:latest
# 접속: http://localhost:8001
```

#### 3. **Another Redis Desktop Manager**
- GitHub: https://github.com/qishibo/AnotherRedisDesktopManager

### MongoDB GUI 도구

#### 1. **MongoDB Compass** (공식, 추천)
- 다운로드: https://www.mongodb.com/products/compass
- 연결 URI: `mongodb://localhost:27017/novisit`

#### 2. **Studio 3T**
- 다운로드: https://studio3t.com/
- 무료 버전 사용 가능

#### 3. **NoSQLBooster**
- 다운로드: https://nosqlbooster.com/

---

## 5. 크롤링 후 데이터 확인 워크플로우

### 시나리오: 크롤링 테스트 후 데이터 확인

```bash
# 1. 크롤링 테스트 실행
node server/src/test/scheduled-crawl-test.js

# 2. MongoDB에서 저장된 공지사항 확인
docker exec -it novisit-mongodb mongosh

# MongoDB Shell에서:
use novisit
db.notices.countDocuments()                           # 전체 개수
db.notices.find().sort({ crawledAt: -1 }).limit(10)  # 최근 10개
exit

# 3. Redis에서 저장된 토큰 확인 (사용자 로그인 후)
docker exec -it novisit-redis redis-cli

# Redis CLI에서:
KEYS *                                                # 모든 키
KEYS token:*                                          # 토큰만
exit
```

---

## 6. 유용한 스크립트

### 데이터베이스 초기화 (개발 환경)

```bash
# MongoDB 모든 데이터 삭제
docker exec novisit-mongodb mongosh --eval "use novisit; db.dropDatabase()"

# Redis 모든 데이터 삭제
docker exec novisit-redis redis-cli FLUSHALL

# 컨테이너 재시작
docker-compose restart
```

### 데이터 백업

```bash
# MongoDB 백업
docker exec novisit-mongodb mongodump --out /tmp/backup
docker cp novisit-mongodb:/tmp/backup ./mongodb-backup

# Redis 백업
docker exec novisit-redis redis-cli SAVE
docker cp novisit-mongodb:/data/dump.rdb ./redis-backup.rdb
```

### 실시간 모니터링

```bash
# Redis 실시간 명령어 모니터링
docker exec novisit-redis redis-cli MONITOR

# MongoDB 현재 작업 확인
docker exec novisit-mongodb mongosh --eval "use novisit; db.currentOp()"
```

---

## 7. 문제 해결

### 컨테이너가 실행 중이 아닌 경우
```bash
docker-compose ps
docker-compose up -d
```

### 포트가 이미 사용 중인 경우
```bash
# 포트 사용 확인 (Windows)
netstat -ano | findstr :6379
netstat -ano | findstr :27017

# 포트를 사용하는 프로세스 종료 (PID 확인 후)
taskkill /PID <PID> /F
```

### 권한 오류
```bash
# 관리자 권한으로 PowerShell 실행 후 재시도
```

---

## 📞 추가 정보

- **Redis 포트**: 6379
- **MongoDB 포트**: 27017
- **데이터베이스 이름**: `novisit` (또는 `novisit_dev`)
- **주요 컬렉션**: `notices`, `users`, `domains`
- **Redis 키 패턴**: `token:{userId}:{provider}:{tokenType}`

---

## 💡 팁

1. **MongoDB Compass**를 사용하면 GUI로 쉽게 데이터를 볼 수 있습니다.
2. **Redis Insight**를 사용하면 Redis 데이터를 시각적으로 확인할 수 있습니다.
3. 개발 중에는 `KEYS *` 대신 `SCAN` 명령어를 사용하는 것이 좋습니다 (성능).
4. MongoDB에서 `.pretty()`를 붙이면 보기 좋게 포맷팅됩니다.
5. 크롤링 테스트 후에는 `crawledAt` 필드로 정렬하면 최신 데이터를 쉽게 찾을 수 있습니다.

---

**작성일**: 2025-10-11  
**프로젝트**: Novisit - 부경대 공지사항 알림 서비스

