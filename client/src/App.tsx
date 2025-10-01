import { Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import NoticePage from "./pages/NoticePage";
import MyPage from "./pages/MyPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Layout from "./components/Layout";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/mypage" element={<MyPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
    </Routes>
  );
}
