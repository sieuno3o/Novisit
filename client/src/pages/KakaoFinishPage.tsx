import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { me } from "../api/auth";
import { useAuth } from "../auth";
import { tokenStore } from "../api/http";
// import axios from "axios"; // 교환식이 아니면 불필요

export default function KakaoFinishPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 0) 목적지(state): 해시/쿼리/백업 순서로 탐색
        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );
        const stateFromHash = hashParams.get("state");
        const stateFromQuery = sp.get("state");
        const stateBackup = sessionStorage.getItem("__oauth_state");
        const redirectTo =
          stateFromHash || stateFromQuery || stateBackup || "/";

        // 1) (권장 플로우) 해시(#)로 토큰 전달된 경우
        const atHash = hashParams.get("accessToken");
        const rtHash = hashParams.get("refreshToken");
        if (atHash && rtHash) {
          tokenStore.setAccess(atHash);
          tokenStore.setRefresh(rtHash);
          await refreshMe();

          // URL에서 해시 제거(토큰 노출 방지)
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
          sessionStorage.removeItem("__oauth_state");
          navigate(redirectTo, { replace: true });
          return;
        }

        // 2) (대안) 쿼리로 직접 온 경우도 지원
        const at = sp.get("accessToken");
        const rt = sp.get("refreshToken");
        if (at && rt) {
          tokenStore.setAccess(at);
          tokenStore.setRefresh(rt);
          await refreshMe();
          sessionStorage.removeItem("__oauth_state");
          navigate(redirectTo, { replace: true });
          return;
        }

        // 3) (대안) 서버 교환식 사용한다면 여기를 살리세요
        // const appCode = sp.get("app_code") || sp.get("code");
        // if (appCode) {
        //   const { data } = await axios.post(
        //     `${import.meta.env.VITE_API_BASE_URL}/auth/kakao/exchange`,
        //     { appCode }
        //   );
        //   if (data?.accessToken && data?.refreshToken) {
        //     tokenStore.setAccess(data.accessToken);
        //     tokenStore.setRefresh(data.refreshToken);
        //     await refreshMe();
        //     sessionStorage.removeItem("__oauth_state");
        //     navigate(redirectTo, { replace: true });
        //     return;
        //   }
        // }

        // 4) (쿠키 전략일 때) me()로 확인 후 이동
        await me();
        await refreshMe();
        sessionStorage.removeItem("__oauth_state");
        navigate(redirectTo, { replace: true });
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "카카오 로그인에 실패했습니다.";
        setError(msg);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div style={{ padding: 24 }}>{error}</div>;
  return <div style={{ padding: 24 }}>카카오 로그인 처리 중...</div>;
}
