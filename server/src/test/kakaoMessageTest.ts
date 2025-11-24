import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { sendKakaoMessage } from '../services/notificationService.js';

const router = Router();

// BullMQ나 스케줄러와 같은 비동기 흐름을 거치지 않고, notificationService의 기능을 직접 테스트.
// 카카오 메시지 전송 기능을 직접 테스트하기 위한 엔드포인트
router.post('/kakao', async (req, res) => {
  const { userId } = req.body; // userId를 req.body에서 직접 받음

  if (!userId) {
    return res.status(400).json({ message: 'User ID가 요청 본문에 없습니다.' });
  }

  // 테스트용 Feed 메시지 데이터
  const testTitle = '[테스트] 부경대학교 새 공지사항';
  const testDescription = '새로운 공지사항이 등록되었습니다. 자세한 내용은 링크를 확인하세요.';
  const testImageUrl = 'https://www.pknu.ac.kr/upload/raonkeditordata/2025/11/07/20251107_085933875_56906.jpg'; // 부경대 로고 또는 기본 이미지 URL
  const testLinkUrl = 'https://www.pknu.ac.kr/main/163?action=view&no=722252';

  try {
    await sendKakaoMessage(userId, testTitle, testDescription, testImageUrl, testLinkUrl);
    return res.status(200).json({ message: '카카오 메시지를 성공적으로 보냈습니다.' });
  } catch (error: any) {
    console.error('카카오 메시지 전송 실패:', error.response?.data || error.message);
    return res.status(500).json({
      message: '카카오 메시지 전송에 실패했습니다.',
      error: error.response?.data || error.message,
    });
  }
});
export default router;
