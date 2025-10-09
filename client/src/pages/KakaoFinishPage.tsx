import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeKakao } from "../api/auth";
import { useAuth } from "../auth";

export default function KakaoFinishPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const appCode = sp.get("app_code");
    const state = sp.get("state") || "/";
    if (!appCode) {
      setError("로그인 완료 코드(app_code)가 없습니다.");
      return;
    }
    (async () => {
      try {
        await exchangeKakao(appCode);
        await refreshMe();
        navigate(state, { replace: true });
      } catch (e: any) {
        setError(e?.response?.data?.message || "카카오 로그인에 실패했습니다.");
      }
    })();
  }, []);

  if (error) return <div style={{ padding: 24 }}>{error}</div>;
  return <div style={{ padding: 24 }}>카카오 로그인 처리 중...</div>;
}
