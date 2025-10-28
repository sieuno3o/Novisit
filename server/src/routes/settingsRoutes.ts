import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createUserSetting } from "../services/settingsService";
import { getUserSettings } from "../services/settingsService";
import { updateUserSetting } from "../services/settingsService";
import { deleteUserSetting } from "../services/settingsService";

const router = Router();

// POST - 알림 설정 생성
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId as string;
    const settings = await createUserSetting(userId, req.body);
    res.status(200).json({ settings });
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

// PUT /settings/:id - 알림 설정 수정
router.put("/:id", authMiddleware, async (req: any, res) => {
  try {
    const settingId = req.params.id;
    const updateData = req.body;

    const updatedSetting = await updateUserSetting(settingId, updateData);
    if (!updatedSetting) {
      return res.status(404).json({ message: "해당 알림 설정을 찾을 수 없습니다." });
    }

    return res.status(200).json({
      message: "알림 설정이 수정되었습니다.",
      updatedSetting,
    });
  } catch (error: any) {
    console.error("알림 설정 수정 실패:", error.message);
    return res.status(500).json({ message: error.message });
  }
});

// DELETE /settings/:id - 알림 설정 삭제
router.delete("/:id", authMiddleware, async (req: any, res) => {
  try {
    const settingId = req.params.id;

    const result = await deleteUserSetting(settingId);
    if (!result) {
      return res.status(404).json({ message: "해당 알림 설정을 찾을 수 없습니다." });
    }

    return res.status(200).json({ message: "알림 설정이 삭제되었습니다." });
  } catch (error: any) {
    console.error("알림 설정 삭제 실패:", error.message);
    return res.status(500).json({ message: error.message });
  }
});

export default router;
