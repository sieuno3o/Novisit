import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth";
import RequireAuth from "./routes/RequireAuth";
import Layout from "./components/Layout";
import MainPage from "./pages/MainPage";
import LoginPage from "./pages/LoginPage";
import KakaoFinishPage from "./pages/KakaoFinishPage";
import NoticePage from "./pages/NoticePage";
import MyPage from "./pages/MyPage";

// export default function App() {
//   return (
//     <AuthProvider>
//       <BrowserRouter>
//         <Routes>
//           <Route path="/login" element={<LoginPage />} />
//           <Route element={<Layout />}>
//             <Route path="/" element={<MainPage />} />
//             <Route path="/oauth/kakao" element={<KakaoFinishPage />} />
//             <Route element={<RequireAuth />}>
//               <Route path="/notice" element={<NoticePage />} />
//               <Route path="/mypage" element={<MyPage />} />
//             </Route>
//           </Route>
//         </Routes>
//       </BrowserRouter>
//     </AuthProvider>
//   );
// }


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

//test2-메인,시작
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 로그인 없이 접근 가능한 페이지 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/kakao" element={<KakaoFinishPage />} />

          {/* 공통 레이아웃 */}
          <Route element={<Layout />}>
            {/* / : 로그인 여부에 따라 Start or Main 렌더 */}
            <Route path="/" element={<MainPage />} />

            {/* 로그인 필요 페이지는 RequireAuth로 감싸기 */}
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