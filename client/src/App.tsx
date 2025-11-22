import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth";
import RequireAuth from "./routes/RequireAuth";
import Layout from "./components/Layout";
import MainPage from "./pages/MainPage";
import LoginPage from "./pages/LoginPage";
import KakaoFinishPage from "./pages/KakaoFinishPage";
import NoticePage from "./pages/NoticePage";
import MyPage from "./pages/MyPage";
import { ToastProvider } from "./components/Toast";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<MainPage />} />
              <Route path="/oauth/kakao" element={<KakaoFinishPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/notice" element={<NoticePage />} />
                <Route path="/mypage" element={<MyPage />} />
                <Route path="/my" element={<Navigate to="/mypage" replace />} />   {/*마이페이지 연동 시 필요*/}
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
