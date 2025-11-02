import { JobScheduler } from '../schedule/jobScheduler.js';
import { connection as bullmqConnection } from '../config/redis.js';

export class CrawlingService {
  private scheduler: JobScheduler | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // 크롤링 스케줄러 초기화 및 시작
  async initialize(): Promise<void> {
    try {
      console.log('🔄 크롤링 스케줄러 초기화 중...');
      
      // BullMQ 연결 확인
      await bullmqConnection.ping();
      console.log('✅ BullMQ Redis 연결 확인 완료');
      
      // 스케줄러 생성 및 시작
      this.scheduler = new JobScheduler();
      this.scheduler.start();
      
      console.log('✅ 크롤링 스케줄러가 성공적으로 시작되었습니다!');
      console.log('📅 정기 스케줄: 한국시간 9시, 12시, 15시, 18시에 자동 크롤링');
      
      // 큐 상태 모니터링 시작
      this.startMonitoring();
      
    } catch (error) {
      console.error('❌ 크롤링 스케줄러 초기화 실패:', error);
      throw error;
    }
  }

  // 큐 상태 모니터링 시작 (5분마다)
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      if (this.scheduler) {
        const status = await this.scheduler.getQueueStatus();
        if (status) {
          console.log(`📊 큐 상태 - 대기: ${status.waiting}, 실행중: ${status.active}, 완료: ${status.completed}, 실패: ${status.failed}`);
        }
      }
    }, 5 * 60 * 1000);
  }

  // 스케줄러 종료
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    await bullmqConnection.quit();
    console.log('✅ 크롤링 스케줄러 종료 완료');
  }
}

