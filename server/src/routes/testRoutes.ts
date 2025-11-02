import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { sendKakaoMessage } from '../services/notificationService';

const router = Router();

// BullMQ나 스케줄러와 같은 비동기 흐름을 거치지 않고, notificationService의 기능을 직접 테스트.
// 카카오 메시지 전송 기능을 직접 테스트하기 위한 엔드포인트
router.post('/kakao', authMiddleware, async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ message: 'User ID를 찾을수없습니다.' });
  }

  // 테스트용 메시지 템플릿
  const dummyTemplate = {
    object_type: 'text',
    text: '[테스트] 이것은 더미 데이터로 보내는 테스트 메시지입니다.',
    link: {
      web_url: 'https://developers.kakao.com',
      mobile_web_url: 'https://developers.kakao.com',
    },
  };

  try {
    await sendKakaoMessage(userId, dummyTemplate);
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
