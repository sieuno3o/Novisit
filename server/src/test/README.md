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

### 2. `scheduled-crawl-test.js`
20초 후 부경대학교 공지사항 페이지를 크롤링하는 스케줄링 테스트입니다.

**실행 방법:**
```bash
node server/src/test/scheduled-crawl-test.js
```

**기능:**
- ⏰ 20초 후 자동 실행 (setTimeout 사용)
- 🕐 5초마다 카운트다운 표시
- 📊 부경대 공지사항 크롤링
- 📋 최신 공지사항 5개 출력
- ✅ Redis 불필요 (순수 Node.js 타이머 사용)

**출력 예시:**
```
════════════════════════════════════════════════════════════════════════════════
🔍 부경대학교 공지사항 크롤링 테스트
════════════════════════════════════════════════════════════════════════════════
⏰ 현재 시간: 2025. 10. 11. 오전 12:40:39
⏰ 실행 예정 시간: 2025. 10. 11. 오전 12:41:59
⏱️  대기 시간: 20초
════════════════════════════════════════════════════════════════════════════════

⏳ 20초간 대기 중... (Ctrl+C로 중단 가능)

⏱️  남은 시간: 15초...
⏱️  남은 시간: 10초...
...
```

---

## 🛠️ 요구사항

### 필수 패키지
- `playwright`: 웹 크롤링을 위한 브라우저 자동화 라이브러리

### 설치 방법
```bash
# 프로젝트 루트에서
npm install

# Playwright 브라우저 설치
npx playwright install chromium
```

---

## 📝 참고사항

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

### Playwright 브라우저가 없다는 오류
```bash
npx playwright install chromium
```

### Redis 연결 오류 (scheduled-crawl-test.js는 해당 없음)
```bash
# Docker Compose로 Redis 시작
docker-compose up -d redis
```

### 포트 충돌
- Playwright는 랜덤 포트를 사용하므로 포트 충돌 없음

---

## 📞 문의

크롤링 관련 문제가 있으면 `server/CRAWLING_GUIDE.md`를 참고하세요.

