import { Outlet, useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { useAuth } from "../auth";
import Footer from "./Footer";

// export default function Layout() {
//   const { logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate("/", { replace: true });
//   };

//   return (
//     <div>
//       <NavBar />
//       <Outlet />
//     </div>
//   );
// }


//hw-푸터 로그인 상태에 따라 렌더링 기능 추가
export default function Layout() {
  const { user, logout, loading } = useAuth(); // user와 loading 추가(푸터)
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="app-layout">
      <NavBar />
      <main className="app-main">
        <Outlet />
      </main>

      {/* 로그인 상태일 때만 푸터 렌더링 */}
      {!loading && user && <Footer />}
    </div>
  );
}