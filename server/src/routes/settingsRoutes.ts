import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createUserSetting } from "../services/settingsService";
import { getUserSettings } from "../services/settingsService";

const router = Router();

// POST - 알림 설정 생성
router.post("/settings", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId as string;
    const setting = await createUserSetting(userId, req.body);
    res.status(200).json(setting);
  } catch (error: any) {
    console.error("알림 설정 생성 실패:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// GET /settings — 알림 설정 조회
router.get("/", authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const settings = await getUserSettings(userId);

    res.status(200).json({ settings });
  } catch (error: any) {
    console.error("알림 설정 조회 실패:", error.message);
    res.status(500).json({ message: error.message });
  }
});

export default router;
