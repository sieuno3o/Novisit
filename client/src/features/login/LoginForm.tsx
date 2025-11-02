// src/pages/LoginPage.tsx
import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { beginKakaoLogin } from "../../api/auth";

export default function LoginPage() {
  const location = useLocation();
  const from = useMemo(() => {
    const state = location.state as { from?: Location } | null;
    if (state?.from) {
      const { pathname, search, hash } = state.from as unknown as Location;
      return `${pathname ?? "/"}${search ?? ""}${hash ?? ""}`;
    }
    return "/";
  }, [location.state]);

  const firedRef = useRef(false);

  useEffect(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      beginKakaoLogin(from);
    }
  }, [from]);

  return (
    <div
      className="flex-col-center"
      style={{ minHeight: 240 }}
      aria-busy="true"
    >
      카카오 로그인 페이지로 이동 중…
    </div>
  );
}
