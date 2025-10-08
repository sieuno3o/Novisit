import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { sendKakaoMessage } from '../services/notificationService';

const router = Router();

//body에 포함된 메시지 템플릿을 사용하여 동적인 알림을 전송.
// 동적인 카카오 메시지 전송을 위한 엔드포인트
router.post('/send', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const { templateObject } = req.body; // 요청 body에서 메시지 템플릿을 직접 받음

  if (!userId) {
    return res.status(400).json({ message: 'User ID 찾을수없습니다.' });
  }

  if (!templateObject) {
    return res.status(400).json({ message: 'templateObject가 request body에 필요합니다.' });
  }

  try {
    await sendKakaoMessage(userId, templateObject);
    res.status(200).json({ message: '카카오 메시지를 성공적으로 보냈습니다.' });
  } catch (error: any) {
    console.error('카카오 메시지 전송 실패:', error.response?.data || error.message);
    res.status(500).json({
      message: '카카오 메시지 전송에 실패했습니다.',
      error: error.response?.data || error.message,
    });
  }
});

export default router;