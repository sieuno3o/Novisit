import { Router } from "express";
import { getDomains } from "../services/mainService";

const router = Router();

// 제공되는 도메인 목록 조회
router.get("/main", async (req, res) => {
  try {
    const domains = await getDomains();
    res.status(200).json({ domains }); // 명세: domains : domain 객체 배열
  } catch (error: any) {
    console.error("❌ /main 도메인 조회 실패:", error.message);
    res.status(500).json({
      message: "도메인 조회 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

export default router;