// src/pages/KakaoFinishPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";
import { tokenStore } from "../api/http";

function paramsFromHash() {
  const raw = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(raw);
}

export default function KakaoFinishPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { loginFromTokens } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 0) redirect 목적지 복구
        let redirectTo = "/";
        const saved = sessionStorage.getItem("__oauth_state");
        if (saved) {
          try {
            redirectTo = JSON.parse(saved)?.from || "/";
          } catch {
            redirectTo = "/";
          }
        }

        // 1) 해시(#)로 토큰 전달된 경우
        const hash = paramsFromHash();
        const atHash = hash.get("accessToken");
        const rtHash = hash.get("refreshToken");
        if (atHash && rtHash) {
          tokenStore.setAccess(atHash);
          tokenStore.setRefresh(rtHash);
          await loginFromTokens();

          // 토큰 노출 방지: 해시 제거
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
          sessionStorage.removeItem("__oauth_state");
          navigate(redirectTo, { replace: true });
          return;
        }

        // 2) 쿼리로 토큰 전달된 경우
        const at = sp.get("accessToken");
        const rt = sp.get("refreshToken");
        if (at && rt) {
          tokenStore.setAccess(at);
          tokenStore.setRefresh(rt);
          await loginFromTokens();

          // (옵션) 쿼리 정리
          const cleaned = new URL(window.location.href);
          cleaned.searchParams.delete("accessToken");
          cleaned.searchParams.delete("refreshToken");
          cleaned.searchParams.delete("state");
          window.history.replaceState(
            null,
            "",
            cleaned.pathname + cleaned.search
          );

          sessionStorage.removeItem("__oauth_state");
          navigate(redirectTo, { replace: true });
          return;
        }

        // 3) 여기까지 못 받았으면 실패
        throw new Error("로그인 토큰을 수신하지 못했습니다.");
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "카카오 로그인에 실패했습니다.";
        setError(msg);
      }
    })();
  }, []);

  if (error) return <div style={{ padding: 24 }}>{error}</div>;
  return <div style={{ padding: 24 }}>카카오 로그인 처리 중...</div>;
}
