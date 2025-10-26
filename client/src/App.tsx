import { Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import NoticePage from "./pages/NoticePage";
import MyPage from "./pages/MyPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Layout from "./components/Layout";
import StartPage from "./pages//StartPage";

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
