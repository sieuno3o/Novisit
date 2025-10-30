import express from 'express';

// BullMQ 큐와 워커를 초기화하기 위해 기존 설정을 재사용
// 이 import 만으로도 Worker 가 등록되어 작업을 처리할 준비가 됩니다.
import { scheduledJobsQueue } from './config/redis.js';

// index.ts에서 초기화한 앱/DB/스케줄링 흐름에 붙이는 단일 파일 API 등록자
// 사용법: import './crawltest' 후, registerCrawltestApi(app)
export function registerCrawltestApi(app: express.Application) {
  app.post('/crawltest', async (req, res) => {
  try {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mn = String(now.getMinutes()).padStart(2, '0');
    const dateStr = `${yy}${mm}${dd}-${hh}${mn}`;

    const jobName = `pknu-crawl-manual-${dateStr}`;

    // 기존 스케줄러에서 사용하던 형식을 최대한 재사용
    const job = await scheduledJobsQueue.add(
      jobName,
      {
        jobType: 'crawl-pknu-notices' as const,
        url: 'https://www.pknu.ac.kr/main/163',
        scheduledTime: new Date(),
        timezone: 'Asia/Seoul',
        message: req.body?.message || '수동 트리거: 부경대학교 공지사항 크롤링'
      },
      {
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    res.status(200).json({
      ok: true,
      queued: true,
      jobId: job.id,
      jobName,
      enqueuedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ crawltest enqueue error:', error);
    res.status(500).json({ ok: false, error: error.message || 'enqueue_failed' });
  }
  });
}


