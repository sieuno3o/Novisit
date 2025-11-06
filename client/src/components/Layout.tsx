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


//hw-푸터 로그인 상태에 따라 렌더링 기능 추가, 반응형
export default function Layout() {
  const { user, logout, loading } = useAuth();
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

      {!loading && user && (
        <div className="app-footer">
          <Footer />
        </div>
      )}
    </div>
  );
}