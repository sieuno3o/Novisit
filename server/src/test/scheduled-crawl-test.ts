// 20초 후 부경대 크롤링 테스트 (Redis + MongoDB)
import mongoose from 'mongoose';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { WebCrawler } from '../crawl/webCrawler';
import { saveNotices, getLatestNoticeNumber } from '../repository/mongodb/noticeRepository';

// Redis 연결
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // BullMQ 권장 설정
});

// MongoDB 연결
async function connectMongoDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/novisit';
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB 연결 완료:', mongoUri);
}

// Redis 큐 생성
const testQueue = new Queue('test-crawl-jobs', { connection: redisConnection });

// 크롤링 작업 프로세서
const crawlProcessor = async (job) => {
  console.log(`\n🚀 작업 시작: ${job.name}`);
  console.log(`⏰ 실행 시간: ${new Date().toLocaleString('ko-KR')}\n`);
  
  const crawler = new WebCrawler();
  
  try {
    // 1. 마지막 크롤링 번호 조회
    const lastKnownNumber = await getLatestNoticeNumber('PKNU');
    console.log(`📌 마지막 저장 번호: ${lastKnownNumber || '없음'}`);
    
    // 2. 증분 크롤링 실행
    const result = await crawler.crawlPKNUNotices(lastKnownNumber);
    
    // 3. MongoDB에 저장
    if (result.notices && result.notices.length > 0) {
      await saveNotices(result.notices, 'PKNU');
      
      console.log(`\n✅ 크롤링 완료: ${result.notices.length}개 공지사항 발견`);
      console.log('\n📋 새로운 공지사항 (상위 5개):');
      console.log('─'.repeat(80));
      result.notices.slice(0, 5).forEach((notice, idx) => {
        console.log(`${idx + 1}. [${notice.number}] ${notice.title}`);
        console.log(`   🔗 ${notice.link}`);
      });
      console.log('─'.repeat(80));
    } else {
      console.log('\n✅ 크롤링 완료: 새로운 공지사항 없음');
    }
    
    await crawler.close();
    
    return {
      success: true,
      totalNotices: result.notices.length,
      executedAt: new Date(),
    };
    
  } catch (error) {
    await crawler.close();
    console.error('\n❌ 크롤링 실패:', error.message);
    throw error;
  }
};

// Worker 생성
const testWorker = new Worker('test-crawl-jobs', crawlProcessor, { 
  connection: redisConnection 
});

// Worker 이벤트 핸들러
testWorker.on('completed', (job, result) => {
  console.log(`\n✅ [Worker] 작업 완료: ${job.name}`);
  console.log(`📊 결과: ${result.totalNotices}개 저장됨`);
});

testWorker.on('failed', (job, error) => {
  console.error(`\n❌ [Worker] 작업 실패: ${job?.name}`);
  console.error(`오류: ${error.message}`);
});

// 메인 함수
async function main() {
  try {
    console.log('═'.repeat(80));
    console.log('🔍 부경대학교 공지사항 크롤링 테스트 (Redis + MongoDB)');
    console.log('═'.repeat(80));
    
    // MongoDB 연결
    console.log('\n📦 MongoDB 연결 중...');
    await connectMongoDB();
    
    // Redis 연결 확인
    console.log('📦 Redis 연결 확인 중...');
    await redisConnection.ping();
    console.log('✅ Redis 연결 완료');
    
    // 20초 후 실행되도록 설정
    const delayMs = 20 * 1000; // 20초 = 20,000ms
    const scheduledTime = new Date(Date.now() + delayMs);
    
    console.log('\n' + '═'.repeat(80));
    console.log(`⏰ 현재 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`⏰ 실행 예정 시간: ${scheduledTime.toLocaleString('ko-KR')}`);
    console.log(`⏱️  대기 시간: 20초`);
    console.log('═'.repeat(80));
    
    // BullMQ의 delay 옵션으로 20초 후 실행되도록 큐에 작업 추가
    console.log('\n🎯 Redis 큐에 크롤링 작업 추가 중... (20초 후 실행 예약)');
    
    const job = await testQueue.add(
      'pknu-crawl-test',
      {
        jobType: 'crawl-pknu-notices',
        url: 'https://www.pknu.ac.kr/main/163',
        scheduledTime: scheduledTime,
        message: '부경대학교 공지사항 크롤링 테스트'
      },
      {
        delay: delayMs,               // BullMQ의 delay 옵션: 20초 후 실행
        removeOnComplete: false,      // 완료 후에도 유지 (테스트 확인용)
        removeOnFail: false,          // 실패 후에도 유지 (테스트 확인용)
      }
    );
    
    console.log(`✅ 작업이 큐에 추가됨 (Job ID: ${job.id})`);
    console.log(`📌 상태: delayed → 20초 후 waiting → active → completed`);
    console.log('\n⏳ BullMQ가 20초간 대기 중... (Ctrl+C로 중단 가능)\n');
    
    // 카운트다운 표시 (5초마다)
    let remainingSeconds = 20;
    const countdownInterval = setInterval(() => {
      remainingSeconds -= 5;
      
      if (remainingSeconds > 0) {
        console.log(`⏱️  남은 시간: ${remainingSeconds}초...`);
      } else {
        clearInterval(countdownInterval);
        console.log(`⏱️  작업 실행 중...\n`);
      }
    }, 5000); // 5초마다 업데이트
    
    console.log('\n📊 큐 상태 모니터링 시작...\n');
    
    // 큐 상태 모니터링 (5초마다)
    const monitorInterval = setInterval(async () => {
      const delayed = await testQueue.getDelayedCount();
      const waiting = await testQueue.getWaitingCount();
      const active = await testQueue.getActiveCount();
      const completed = await testQueue.getCompletedCount();
      const failed = await testQueue.getFailedCount();
      
      console.log(`📊 [${new Date().toLocaleTimeString('ko-KR')}] 큐 상태 - 지연: ${delayed}, 대기: ${waiting}, 실행중: ${active}, 완료: ${completed}, 실패: ${failed}`);
      
      // 작업이 완료되거나 실패하면 종료
      if (completed > 0 || failed > 0) {
        clearInterval(monitorInterval);
        clearInterval(countdownInterval);
        
        // 잠시 대기 후 결과 출력
        setTimeout(async () => {
          await printQueueSummary();
          await cleanup();
        }, 2000);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ 초기화 실패:', error.message);
    await cleanup();
  }
}

// 큐 결과 요약 출력
async function printQueueSummary() {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 테스트 결과 요약');
  console.log('═'.repeat(80));
  
  const completed = await testQueue.getCompleted();
  const failed = await testQueue.getFailed();
  
  if (completed.length > 0) {
    console.log('✅ 완료된 작업:');
    for (const job of completed) {
      console.log(`  - Job ID: ${job.id}`);
      console.log(`  - 작업명: ${job.name}`);
      console.log(`  - 결과: ${job.returnvalue?.totalNotices || 0}개 공지사항 저장`);
    }
  }
  
  if (failed.length > 0) {
    console.log('\n❌ 실패한 작업:');
    for (const job of failed) {
      console.log(`  - Job ID: ${job.id}`);
      console.log(`  - 작업명: ${job.name}`);
      console.log(`  - 오류: ${job.failedReason}`);
    }
  }
  
  console.log('\n🎉 테스트 완료!');
  console.log('═'.repeat(80));
}

// 정리 작업
async function cleanup() {
  console.log('\n🧹 정리 작업 중...');
  
  try {
    await testWorker.close();
    await testQueue.close();
    await redisConnection.quit();
    await mongoose.connection.close();
    
    console.log('✅ 모든 연결 종료됨');
    process.exit(0);
  } catch (error) {
    console.error('❌ 정리 실패:', error.message);
    process.exit(1);
  }
}

// 프로세스 종료 시그널 처리
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  사용자에 의해 중단됨');
  await cleanup();
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  프로세스 종료 요청');
  await cleanup();
});

// 실행
main();

