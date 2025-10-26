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


//test
// export default function App() {
//   return (
//     <Routes>
//       {/* 레이아웃 아래 기본 진입 페이지를 MyPage로 */}
//       <Route element={<Layout />}>
//         <Route index element={<MyPage />} />         
//         <Route path="notice" element={<NoticePage />} />
//         <Route path="mypage" element={<MyPage />} />  
//         {/* 필요하면 메인페이지도 경로로 남겨둠 */}
//         <Route path="main" element={<MainPage />} />
//       </Route>

//       <Route path="/login" element={<LoginPage />} />
//       <Route path="/signup" element={<SignupPage />} />
//     </Routes>
//   );
// }
