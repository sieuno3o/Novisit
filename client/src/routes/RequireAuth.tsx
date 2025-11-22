import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div />;

  if (!user) {
    return (
      <AlertThenRedirect
        to="/login?kakao_prompt=login"
        state={{ from: location }}
        message="로그인이 필요한 페이지입니다."
      />
    );
  }

  return <Outlet />;
}

function AlertThenRedirect({
  to,
  state,
  message,
}: {
  to: string;
  state?: any;
  message?: string;
}) {
  const [ready, setReady] = useState(false);
  const alertedRef = useRef(false);

  useEffect(() => {
    if (!alertedRef.current) {
      alertedRef.current = true;
      if (message) window.alert(message);
      setReady(true);
    }
  }, [message]);

  if (!ready) return null;
  return <Navigate to={to} replace state={state} />;
}
