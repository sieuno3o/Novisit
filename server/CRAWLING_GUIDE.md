# 크롤링 및 스케줄링 시스템 가이드

## 📋 개요

Novisit는 BullMQ와 Playwright를 활용하여 부경대학교 공지사항을 자동으로 크롤링하고 MongoDB에 저장하는 시스템입니다.

## 🏗️ 구조

```
server/src/
├── crawl/
│   └── webCrawler.ts          # Playwright 기반 웹 크롤러
├── schedule/
│   └── jobScheduler.ts        # node-cron 기반 스케줄러
├── config/
│   └── redis.ts               # BullMQ 설정 및 Worker
├── models/
│   └── Notice.ts              # MongoDB Notice 모델
├── repository/
│   └── mongodb/
│       └── noticeRepository.ts # 공지사항 저장/조회 리포지토리
└── types/
    └── crawl.ts               # 크롤링 관련 타입 정의
```

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
cd Novisit/server
npm install
```

주요 패키지:
- `playwright` - 웹 크롤링 브라우저 자동화
- `node-cron` - 작업 스케줄링
- `ioredis` - BullMQ용 Redis 클라이언트
- `bullmq` - Redis 기반 작업 큐

### 2. Playwright 브라우저 설치

```bash
npm run install-playwright
```

### 3. 환경 변수 설정

`.env` 파일에 다음 환경 변수 추가 (선택사항):

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
MONGODB_URI=mongodb://localhost:27017/novisit
```

### 4. 서버 실행

**개발 환경:**
```bash
npm run dev
```

**프로덕션 환경:**
```bash
npm run build
npm start
```

## 🐳 Docker 환경에서 실행

### 전체 스택 실행

```bash
cd Novisit
docker-compose up -d
```

Docker Compose는 다음 서비스를 시작합니다:
- Redis (BullMQ 큐)
- MongoDB (공지사항 저장)
- Application (크롤링 스케줄러 포함)

## ⏰ 스케줄링 설정

### 기본 스케줄

서버 시작 시 자동으로 다음 일정으로 크롤링이 실행됩니다:
- **매일 오전 9시** (한국시간)
- **매일 오후 2시** (한국시간)

### 수동 크롤링 실행

코드에서 수동으로 크롤링 작업을 추가할 수 있습니다:

```typescript
import { JobScheduler } from './schedule/jobScheduler.js';

const scheduler = new JobScheduler();

// 즉시 크롤링 실행
await scheduler.addPKNUNoticeCrawlingJob('manual-crawl-test');
```

## 📊 크롤링 데이터

### MongoDB 스키마

크롤링된 공지사항은 다음 구조로 저장됩니다:

```typescript
{
  number: string,        // 공지사항 번호
  title: string,         // 공지사항 제목
  link: string,          // 공지사항 링크
  source: string,        // 출처 (기본값: 'PKNU')
  crawledAt: Date,       // 크롤링 시간
  createdAt: Date,       // 생성 시간
  updatedAt: Date        // 업데이트 시간
}
```

### 데이터 조회

MongoDB에서 직접 조회하거나, `noticeRepository.ts`에서 제공하는 함수를 사용할 수 있습니다:

```typescript
import { getLatestNotices, getNoticesByDateRange, searchNotices } from './repository/mongodb/noticeRepository.js';

// 최신 공지사항 조회
const notices = await getLatestNotices(20, 'PKNU');

// 날짜 범위로 조회
const notices = await getNoticesByDateRange(
  new Date('2025-01-01'),
  new Date('2025-12-31'),
  'PKNU'
);

// 키워드 검색
const notices = await searchNotices('장학금', 'PKNU', 50);
```

**MongoDB 직접 조회**:
```bash
docker exec -it novisit-mongodb mongosh
use novisit
db.notices.find().sort({crawledAt: -1}).limit(20)
```

## 🔍 큐 상태 모니터링

서버 로그에서 5분마다 큐 상태를 확인할 수 있습니다:

```
📊 큐 상태 - 대기: 0, 실행중: 1, 완료: 5, 실패: 0
```

## 🛠️ 설정 및 커스터마이징

### 크롤링 스케줄 변경

`server/src/schedule/jobScheduler.ts`의 `schedulePKNUNoticeCrawling()` 메서드를 수정:

```typescript
schedulePKNUNoticeCrawling(): void {
  // 매일 오전 6시 추가
  this.scheduleCrawlingJob(
    6,
    'https://www.pknu.ac.kr/main/163',
    {},
    'pknu-morning-notice-crawl'
  );
  
  // 기존 9시, 14시 유지...
}
```

### 다른 페이지 크롤링 추가

`webCrawler.ts`에 새로운 메서드 추가:

```typescript
async crawlCustomPage(url: string): Promise<any> {
  // 커스텀 크롤링 로직
}
```

## 🐛 문제 해결

### Playwright 실행 오류

Docker 환경에서 Playwright가 실행되지 않으면:
1. `shm_size: '2gb'`가 docker-compose.yml에 설정되어 있는지 확인
2. Dockerfile에서 필요한 시스템 라이브러리가 설치되었는지 확인

### Redis 연결 오류

환경 변수가 올바르게 설정되었는지 확인:
```env
REDIS_HOST=redis  # Docker 환경에서
REDIS_PORT=6379
```

### MongoDB 저장 오류

중복 키 에러가 발생하면 `Notice` 모델의 인덱스 확인:
```typescript
NoticeSchema.index({ number: 1, source: 1 }, { unique: true });
```

## 📝 시스템 특징

1. **헤드리스 모드**: 크롤링은 백그라운드에서 실행되어 리소스 사용을 최소화합니다.
2. **중복 방지**: 공지사항 번호를 기준으로 중복된 공지는 자동으로 업데이트됩니다.
3. **작업 관리**: BullMQ는 완료된 작업 10개, 실패한 작업 5개만 보관하여 메모리를 효율적으로 관리합니다.
4. **안전한 종료**: 서버 종료 시 모든 연결이 안전하게 종료됩니다 (Graceful Shutdown).
5. **재시도 로직**: 크롤링 실패 시 자동으로 재시도합니다.

## 🔗 관련 파일

- 크롤러: `server/src/crawl/webCrawler.ts`
- 스케줄러: `server/src/schedule/jobScheduler.ts`
- Redis 설정: `server/src/config/redis.ts`
- 공지사항 모델: `server/src/models/Notice.ts`
- 리포지토리: `server/src/repository/mongodb/noticeRepository.ts`

