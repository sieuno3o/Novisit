import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth";
import RequireAuth from "./routes/RequireAuth";
import Layout from "./components/Layout";
import MainPage from "./pages/MainPage";
import LoginPage from "./pages/LoginPage";
import KakaoFinishPage from "./pages/KakaoFinishPage";
import NoticePage from "./pages/NoticePage";
import MyPage from "./pages/MyPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<MainPage />} />
            <Route path="/oauth/kakao" element={<KakaoFinishPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/notice" element={<NoticePage />} />
              <Route path="/mypage" element={<MyPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
