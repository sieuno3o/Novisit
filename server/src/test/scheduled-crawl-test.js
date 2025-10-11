// 20초 후 부경대 크롤링 테스트 (Redis 불필요)
import { chromium } from 'playwright';

// 크롤링 함수
async function crawlPKNU() {
  console.log('\n🚀 부경대 크롤링 시작...');
  console.log(`⏰ 실행 시간: ${new Date().toLocaleString('ko-KR')}\n`);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    const url = 'https://www.pknu.ac.kr/main/163';
    
    console.log(`📄 페이지 접속 중: ${url}`);
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('⏳ 공지사항 테이블 로딩 대기 중...');
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    
    // 공지사항 추출
    const notices = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      const notices = [];
      
      rows.forEach((row) => {
        const numberCell = row.querySelector('td.bdlNum.noti');
        const number = numberCell?.textContent?.trim() || '';
        
        const titleCell = row.querySelector('td.bdlTitle a');
        const title = titleCell?.textContent?.trim() || '';
        const link = titleCell?.getAttribute('href') || '';
        
        if (number && title) {
          notices.push({
            number: number,
            title: title,
            link: link.startsWith('http') ? link : `https://www.pknu.ac.kr${link}`
          });
        }
      });
      
      return notices;
    });
    
    await context.close();
    await browser.close();
    
    console.log(`\n✅ 크롤링 완료: ${notices.length}개 공지사항 발견`);
    console.log('\n📋 최근 공지사항 (상위 5개):');
    console.log('─'.repeat(80));
    notices.slice(0, 5).forEach((notice, idx) => {
      console.log(`${idx + 1}. [${notice.number}] ${notice.title}`);
      console.log(`   🔗 ${notice.link}`);
    });
    console.log('─'.repeat(80));
    
    return { success: true, notices };
    
  } catch (error) {
    await browser.close();
    console.error('\n❌ 크롤링 실패:', error.message);
    throw error;
  }
}

// 메인 함수
async function main() {
  try {
    // 20초 후 실행되도록 설정
    const delayMs = 20 * 1000; // 20초 = 20,000ms
    const scheduledTime = new Date(Date.now() + delayMs);
    
    console.log('═'.repeat(80));
    console.log('🔍 부경대학교 공지사항 크롤링 테스트');
    console.log('═'.repeat(80));
    console.log(`⏰ 현재 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`⏰ 실행 예정 시간: ${scheduledTime.toLocaleString('ko-KR')}`);
    console.log(`⏱️  대기 시간: 20초`);
    console.log('═'.repeat(80));
    console.log('\n⏳ 20초간 대기 중... (Ctrl+C로 중단 가능)\n');
    
    // 카운트다운 표시 (5초마다)
    let remainingSeconds = 20;
    const countdownInterval = setInterval(() => {
      remainingSeconds -= 5;
      
      if (remainingSeconds > 0) {
        console.log(`⏱️  남은 시간: ${remainingSeconds}초...`);
      }
      
      if (remainingSeconds <= 0) {
        clearInterval(countdownInterval);
      }
    }, 5000); // 5초마다 업데이트
    
    // 20초 후 크롤링 실행
    setTimeout(async () => {
      clearInterval(countdownInterval);
      
      try {
        const result = await crawlPKNU();
        console.log('\n🎉 테스트 성공!');
        console.log('═'.repeat(80));
        process.exit(0);
      } catch (error) {
        console.error('\n❌ 테스트 실패:', error.message);
        process.exit(1);
      }
    }, delayMs);
    
  } catch (error) {
    console.error('❌ 초기화 실패:', error.message);
    process.exit(1);
  }
}

// 프로세스 종료 시그널 처리
process.on('SIGINT', () => {
  console.log('\n\n⚠️  사용자에 의해 중단됨');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  프로세스 종료 요청');
  process.exit(0);
});

// 실행
main();

