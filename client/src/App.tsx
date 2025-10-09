import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth";
import RequireAuth from "./routes/RequireAuth";
import MainPage from "./pages/MainPage";
import LoginPage from "./pages/LoginPage";
import NoticePage from "./pages/NoticePage";
import MyPage from "./pages/MyPage";
import KakaoFinishPage from "./pages/KakaoFinishPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth/kakao" element={<KakaoFinishPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/mypage" element={<MyPage />} />
      </Route>
    </Routes>
  );
}
