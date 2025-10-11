# 🚀 데이터베이스 빠른 시작 가이드

## 1️⃣ Docker 컨테이너 시작

```bash
# 개발 환경 시작 (Redis + MongoDB)
docker-compose -f docker-compose.dev.yml up -d

# 컨테이너 상태 확인
docker ps
```

**예상 출력:**
```
CONTAINER ID   IMAGE            PORTS                      NAMES
xxxxx          mongo:7          0.0.0.0:27017->27017/tcp   novisit-mongodb-dev
xxxxx          redis:7-alpine   0.0.0.0:6379->6379/tcp     novisit-redis-dev
```

---

## 2️⃣ Redis 확인하기

### 연결 테스트
```bash
docker exec novisit-redis-dev redis-cli PING
# 출력: PONG
```

### Redis CLI 접속
```bash
docker exec -it novisit-redis-dev redis-cli
```

### 기본 명령어 (Redis CLI 안에서)
```bash
# 모든 키 조회
KEYS *

# 토큰 키만 조회
KEYS token:*

# 특정 키의 값 조회
GET token:user123:kakao:accessToken

# 키 개수
DBSIZE

# 종료
exit
```

### PowerShell에서 직접 실행
```powershell
# 모든 키 조회
docker exec novisit-redis-dev redis-cli KEYS "*"

# 특정 키 값 조회
docker exec novisit-redis-dev redis-cli GET "token:user123:kakao:accessToken"

# 키 개수
docker exec novisit-redis-dev redis-cli DBSIZE
```

---

## 3️⃣ MongoDB 확인하기

### 연결 테스트
```bash
docker exec novisit-mongodb-dev mongosh --eval "db.version()"
# 출력: 7.0.25
```

### MongoDB Shell 접속
```bash
docker exec -it novisit-mongodb-dev mongosh
```

### 기본 명령어 (MongoDB Shell 안에서)
```javascript
// 데이터베이스 목록
show dbs

// novisit 데이터베이스 선택
use novisit_dev

// 컬렉션 목록
show collections

// notices 컬렉션의 전체 데이터
db.notices.find()

// 보기 좋게 포맷팅
db.notices.find().pretty()

// 공지사항 개수
db.notices.countDocuments()

// 최신 5개 공지사항
db.notices.find().sort({ crawledAt: -1 }).limit(5)

// 특정 번호로 검색
db.notices.find({ number: "721861" })

// 제목으로 검색
db.notices.find({ title: /중어권/ })

// 종료
exit
```

### PowerShell에서 직접 실행
```powershell
# 공지사항 개수
docker exec novisit-mongodb-dev mongosh --eval "use novisit_dev; db.notices.countDocuments()"

# 최신 3개 조회
docker exec novisit-mongodb-dev mongosh --eval "use novisit_dev; db.notices.find().sort({ crawledAt: -1 }).limit(3)"

# 전체 조회
docker exec novisit-mongodb-dev mongosh --eval "use novisit_dev; db.notices.find()"
```

---

## 4️⃣ 크롤링 테스트 후 데이터 확인

### Step 1: 크롤링 테스트 실행
```bash
node server/src/test/scheduled-crawl-test.js
```

### Step 2: MongoDB에서 결과 확인
```bash
# MongoDB Shell 접속
docker exec -it novisit-mongodb-dev mongosh

# 데이터베이스 선택
use novisit_dev

# 공지사항 개수 확인
db.notices.countDocuments()

# 최신 10개 조회
db.notices.find().sort({ crawledAt: -1 }).limit(10).pretty()

# 특정 시간 이후 크롤링된 공지사항
db.notices.find({ 
  crawledAt: { $gte: new Date("2025-10-11") } 
}).pretty()
```

---

## 5️⃣ 유용한 명령어 모음

### Redis 명령어
```bash
# 모든 키 삭제 (주의!)
docker exec novisit-redis-dev redis-cli FLUSHALL

# 특정 패턴 키 조회
docker exec novisit-redis-dev redis-cli KEYS "token:*:kakao:*"

# 키 타입 확인
docker exec novisit-redis-dev redis-cli TYPE "token:123:kakao:accessToken"

# TTL 확인
docker exec novisit-redis-dev redis-cli TTL "token:123:kakao:accessToken"
```

### MongoDB 명령어
```bash
# 데이터베이스 초기화
docker exec novisit-mongodb-dev mongosh --eval "use novisit_dev; db.dropDatabase()"

# 특정 컬렉션만 삭제
docker exec novisit-mongodb-dev mongosh --eval "use novisit_dev; db.notices.drop()"

# 인덱스 확인
docker exec novisit-mongodb-dev mongosh --eval "use novisit_dev; db.notices.getIndexes()"

# 컬렉션 통계
docker exec novisit-mongodb-dev mongosh --eval "use novisit_dev; db.notices.stats()"
```

---

## 6️⃣ GUI 도구로 확인하기

### Redis GUI - Redis Insight
1. 다운로드: https://redis.io/insight/
2. 연결 정보:
   - **Host**: `localhost`
   - **Port**: `6379`

### MongoDB GUI - MongoDB Compass
1. 다운로드: https://www.mongodb.com/products/compass
2. 연결 URI: `mongodb://localhost:27017/novisit_dev`

---

## 7️⃣ 컨테이너 관리

```bash
# 컨테이너 중지
docker-compose -f docker-compose.dev.yml down

# 컨테이너 재시작
docker-compose -f docker-compose.dev.yml restart

# 로그 확인
docker logs novisit-redis-dev
docker logs novisit-mongodb-dev

# 실시간 로그 보기
docker logs -f novisit-mongodb-dev
```

---

## 8️⃣ 데이터 구조 예시

### Redis 데이터 구조
```
키: token:user123:kakao:accessToken
값: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

키: token:user123:kakao:refreshToken
값: def50200abc...
```

### MongoDB 데이터 구조
```json
{
  "_id": ObjectId("671234567890abcdef123456"),
  "number": "721861",
  "title": "2026-1학기 중어권 파견 교환학생 추가모집 선발안내",
  "link": "https://www.pknu.ac.kr?action=view&no=721861",
  "source": "PKNU",
  "postedAt": "2025-10-10",
  "crawledAt": ISODate("2025-10-11T00:43:39.456Z")
}
```

---

## 💡 자주 사용하는 워크플로우

### 개발 시작할 때
```bash
# 1. Docker 컨테이너 시작
docker-compose -f docker-compose.dev.yml up -d

# 2. 연결 확인
docker exec novisit-redis-dev redis-cli PING
docker exec novisit-mongodb-dev mongosh --eval "db.version()"

# 3. 크롤링 테스트
node server/src/test/scheduled-crawl-test.js
```

### 데이터 확인할 때
```bash
# MongoDB 최신 공지사항 확인
docker exec novisit-mongodb-dev mongosh --eval "use novisit_dev; db.notices.find().sort({crawledAt:-1}).limit(5)"

# Redis 저장된 키 확인
docker exec novisit-redis-dev redis-cli KEYS "*"
```

### 개발 끝날 때
```bash
# 컨테이너 중지
docker-compose -f docker-compose.dev.yml down
```

---

## 📞 문제 해결

### 포트가 이미 사용 중인 경우
```bash
# Windows에서 포트 사용 확인
netstat -ano | findstr :6379
netstat -ano | findstr :27017

# 해당 프로세스 종료
taskkill /PID <PID번호> /F
```

### 컨테이너가 시작되지 않는 경우
```bash
# 로그 확인
docker logs novisit-redis-dev
docker logs novisit-mongodb-dev

# 컨테이너 재생성
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d --force-recreate
```

---

**더 자세한 내용은 `DATABASE_INSPECTION_GUIDE.md`를 참고하세요!**

