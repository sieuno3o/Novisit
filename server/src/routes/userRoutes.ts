import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getUserInfo, updateUserName, deleteUser, updateFCMToken } from '../services/userService.js';

const router = Router();

// 사용자 정보 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId as string;
    const userInfo = await getUserInfo(userId);
    res.status(200).json(userInfo);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 사용자 이름 변경
router.patch('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId as string;
    const { name } = req.body;
    console.log('Received name for update:', name); // 한글 깨짐 확인을 위한 로그
    if (!name) {
      return res.status(400).json({ message: '이름을 입력해주세요.' });
    }
    const updatedUser = await updateUserName(userId, name);
    return res.status(200).json(updatedUser);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// FCM 토큰 추가
router.post('/fcm-token', authMiddleware, async (req, res) => {
  try {
    console.log('FCM 토큰 업데이트 API 진입'); // Log to confirm the route is reached
    const userId = req.userId as string;
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ message: 'fcmToken이 필요합니다.' });
    }
    await updateFCMToken(userId, fcmToken);
    return res.status(200).json({ message: 'FCM 토큰이 성공적으로 등록되었습니다.' });
  } catch (error: any) {
    console.error('FCM 토큰 업데이트 중 심각한 오류 발생:', error);
    return res.status(500).json({ message: error.message });
  }
});

// FCM 토큰 삭제
router.delete('/fcm-token', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId as string;
    await updateFCMToken(userId, null);
    return res.status(200).json({ message: 'FCM 토큰이 성공적으로 삭제되었습니다.' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// 회원 탈퇴
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId as string;
    await deleteUser(userId);
    res.status(200).json({ message: '회원 탈퇴가 완료되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
