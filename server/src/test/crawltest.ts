import express from 'express';
import { scheduledJobsQueue } from '../config/redis.js';

export function registerCrawltestApi(app: express.Application) {
  // 즉시 수동 크롤 트리거 엔드포인트 (POST /crawltest)
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

      // 기존 스케줄러에서 사용하던 형식 재사용
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
