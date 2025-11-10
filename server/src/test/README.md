# 크롤링 테스트 파일

부경대학교 공지사항 크롤링 기능을 테스트하기 위한 스크립트들입니다.

## 📁 파일 목록

### 1. `simple-crawler-test.js`
기본적인 Playwright 크롤러 동작을 확인하는 간단한 테스트입니다.

**실행 방법:**
```bash
node server/src/test/simple-crawler-test.js
```

**기능:**
- 브라우저 실행 테스트
- 페이지 접속 및 콘텐츠 추출 테스트
- httpbin.org를 사용한 기본 동작 확인

---

### 2. `scheduled-crawl-test.js` ⭐ 
**Redis + MongoDB 통합 테스트**

20초 후 부경대학교 공지사항을 크롤링하여 **Redis 큐**에 작업을 추가하고, **MongoDB**에 데이터를 저장하는 통합 테스트입니다.

**실행 방법:**
```bash
# 1. Docker로 Redis와 MongoDB 시작
docker-compose -f docker-compose.dev.yml up -d

# 2. 테스트 실행
node server/src/test/scheduled-crawl-test.js
```

**기능:**
- 📦 **MongoDB 연결**: 크롤링 데이터 저장
- 📦 **Redis 연결**: BullMQ 큐 관리
- ⏰ **BullMQ delay 옵션**: 즉시 큐에 추가, 20초 후 자동 실행 (Redis가 스케줄링 관리)
- 🕐 **5초마다 카운트다운** 표시
- 📊 **부경대 공지사항 크롤링**: WebCrawler 사용
- 💾 **증분 크롤링**: 마지막 번호 이후 새 공지만 저장
- 📋 **큐 상태 모니터링**: 지연/대기/실행중/완료/실패 상태 표시
- 🎯 **작업 결과 요약**: 저장된 공지사항 개수 출력

**출력 예시:**
```
════════════════════════════════════════════════════════════════════════════════
🔍 부경대학교 공지사항 크롤링 테스트 (Redis + MongoDB)
════════════════════════════════════════════════════════════════════════════════

📦 MongoDB 연결 중...
✅ MongoDB 연결 완료: mongodb://localhost:27017/novisit
📦 Redis 연결 확인 중...
✅ Redis 연결 완료

════════════════════════════════════════════════════════════════════════════════
⏰ 현재 시간: 2025. 10. 11. 오전 12:40:39
⏰ 실행 예정 시간: 2025. 10. 11. 오전 12:41:59
⏱️  대기 시간: 20초
════════════════════════════════════════════════════════════════════════════════

⏳ 20초간 대기 중... (Ctrl+C로 중단 가능)

🎯 Redis 큐에 크롤링 작업 추가 중... (20초 후 실행 예약)
✅ 작업이 큐에 추가됨 (Job ID: 1)
📌 상태: delayed → 20초 후 waiting → active → completed

⏳ BullMQ가 20초간 대기 중... (Ctrl+C로 중단 가능)

⏱️  남은 시간: 15초...
⏱️  남은 시간: 10초...
⏱️  남은 시간: 5초...
⏱️  작업 실행 중...

📊 큐 상태 모니터링 시작...

📊 [오전 12:40:45] 큐 상태 - 지연: 1, 대기: 0, 실행중: 0, 완료: 0, 실패: 0
📊 [오전 12:40:50] 큐 상태 - 지연: 1, 대기: 0, 실행중: 0, 완료: 0, 실패: 0
📊 [오전 12:40:55] 큐 상태 - 지연: 0, 대기: 0, 실행중: 1, 완료: 0, 실패: 0

🚀 작업 시작: pknu-crawl-test
⏰ 실행 시간: 2025. 10. 11. 오전 12:41:00

📌 마지막 저장 번호: 12345
[PKNU] 증분 크롤링 시작 (마지막 번호: 12345)
[PKNU] 페이지 1 크롤링 중...
[PKNU] 페이지 1: 5개 새 공지 발견

✅ 크롤링 완료: 5개 공지사항 발견

📋 새로운 공지사항 (상위 5개):
────────────────────────────────────────────────────────────────────────────────
1. [12350] 2025학년도 1학기 수강신청 안내
   🔗 https://www.pknu.ac.kr/main/...
2. [12349] 캠퍼스 정보 시스템 점검 안내
   🔗 https://www.pknu.ac.kr/main/...
...
────────────────────────────────────────────────────────────────────────────────

✅ [Worker] 작업 완료: pknu-crawl-test
📊 결과: 5개 저장됨

📊 [오전 12:41:05] 큐 상태 - 지연: 0, 대기: 0, 실행중: 0, 완료: 1, 실패: 0

════════════════════════════════════════════════════════════════════════════════
📊 테스트 결과 요약
════════════════════════════════════════════════════════════════════════════════
✅ 완료된 작업:
  - Job ID: 1
  - 작업명: pknu-crawl-test
  - 결과: 5개 공지사항 저장

🎉 테스트 완료!
════════════════════════════════════════════════════════════════════════════════
```

---

## 🛠️ 요구사항

### 필수 패키지
- `playwright`: 웹 크롤링을 위한 브라우저 자동화 라이브러리
- `mongoose`: MongoDB ODM
- `bullmq`: Redis 기반 작업 큐
- `ioredis`: Redis 클라이언트

### 필수 인프라
- **Docker Desktop**: Redis와 MongoDB 실행을 위해 필요
- **Redis**: BullMQ 큐 저장소
- **MongoDB**: 크롤링 데이터 저장소

### 설치 및 실행 방법
```bash
# 1. 프로젝트 루트에서 의존성 설치
npm install

# 2. Playwright 브라우저 설치
npx playwright install chromium

# 3. Docker로 Redis와 MongoDB 시작
docker-compose -f docker-compose.dev.yml up -d

# 4. Docker 상태 확인
docker ps

# 5. 테스트 실행
node server/src/test/scheduled-crawl-test.js
```

---

## 📝 참고사항

### BullMQ delay 옵션의 작동 방식
`scheduled-crawl-test.js`는 **BullMQ의 delay 옵션**을 사용하여 스케줄링합니다:

```javascript
await testQueue.add('job-name', data, { delay: 20000 }); // 20초 후 실행
```

**작동 흐름:**
1. **즉시 큐에 추가**: 작업이 Redis에 `delayed` 상태로 저장됨
2. **Redis가 타이머 관리**: 20초 후 자동으로 `waiting` 상태로 전환
3. **Worker가 처리**: `waiting` 상태의 작업을 Worker가 자동으로 처리

**장점:**
- ✅ Redis가 스케줄링을 관리 (애플리케이션 재시작 시에도 유지)
- ✅ 분산 환경에서도 안정적으로 작동
- ✅ 여러 Worker가 있어도 중복 실행 방지

**JavaScript setTimeout과의 차이:**
- ❌ `setTimeout`: 애플리케이션 메모리에만 존재, 재시작 시 소실
- ✅ `BullMQ delay`: Redis에 영구 저장, 재시작해도 유지

### 파일 확장자가 `.js`인 이유
- `server/package.json`이 `"type": "module"`로 설정되어 있어 기본적으로 ES 모듈로 처리됨
- ES 모듈 형식(`import` 문법)을 사용
- CommonJS로 변환하려면 파일 확장자를 `.cjs`로 변경하고 `import` → `require` 문법으로 변경 필요

### 크롤링 대상 URL
- 부경대학교 공지사항: `https://www.pknu.ac.kr/main/163`

### 추출되는 데이터
- `number`: 공지사항 번호
- `title`: 공지사항 제목
- `link`: 공지사항 상세 페이지 링크

---

## 🚀 프로덕션 스케줄링

실제 프로덕션 환경에서는 `scheduled-crawl-test.js` 대신 다음을 사용합니다:

1. **정기 스케줄링**: `server/src/schedule/jobScheduler.ts`
   - node-cron 사용
   - 매일 9시, 12시, 15시, 18시 자동 크롤링

2. **큐 기반 작업**: BullMQ + Redis
   - 작업 큐 관리
   - 실패 시 재시도
   - 작업 상태 모니터링

---

## 🐛 문제 해결

### 1. Playwright 브라우저가 없다는 오류
```bash
npx playwright install chromium
```

### 2. Redis 연결 오류
```bash
# Docker Desktop이 실행 중인지 확인
docker ps

# Redis가 없다면 시작
docker-compose -f docker-compose.dev.yml up -d redis-dev

# Redis 로그 확인
docker logs novisit-redis-dev
```

### 3. MongoDB 연결 오류
```bash
# MongoDB가 없다면 시작
docker-compose -f docker-compose.dev.yml up -d mongodb-dev

# MongoDB 로그 확인
docker logs novisit-mongodb-dev

# MongoDB에 접속 테스트
docker exec -it novisit-mongodb-dev mongosh novisit
```

### 4. 작업이 큐에서 처리되지 않음
- **원인**: Worker가 실행되지 않음
- **해결**: 테스트 코드에 Worker가 포함되어 있으므로 자동으로 처리됨
- **확인**: 큐 상태 모니터링에서 `active` 카운트 확인

### 5. 중복 데이터 저장 오류
- **정상 동작**: MongoDB의 unique index가 중복을 자동으로 방지
- **메시지**: `[저장] 새 공지: 0개 | 중복: 5개`

### 6. 포트 충돌
- **Redis**: 6379 포트 사용
- **MongoDB**: 27017 포트 사용
- **해결**: 다른 Redis/MongoDB 인스턴스 종료

### 7. Docker 볼륨 데이터 초기화
```bash
# 볼륨까지 완전히 삭제하려면
docker-compose -f docker-compose.dev.yml down -v

# 다시 시작
docker-compose -f docker-compose.dev.yml up -d
```

---

## 📞 문의

크롤링 관련 문제가 있으면 `server/CRAWLING_GUIDE.md`를 참고하세요.

