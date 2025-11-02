import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getUserInfo, updateUserName, deleteUser } from '../services/userService';

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
