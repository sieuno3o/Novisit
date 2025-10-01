import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

export default function RequireAuth() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    // 로그인 실패시 /login 으로, 돌아갈 위치 state에 저장
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
