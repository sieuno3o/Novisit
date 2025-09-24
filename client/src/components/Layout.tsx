import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout() {
  const { user, signout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    signout();
    navigate("/", { replace: true });
  };

  return (
    <div>
      <header
        style={{
          padding: 12,
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link to="/">Novisit</Link>

        <nav style={{ display: "inline-flex", gap: 12 }}>
          <NavLink to="/">홈</NavLink>
          <NavLink to="/notice">공지</NavLink>
          {user && <NavLink to="/mypage">마이페이지</NavLink>}
        </nav>

        <div style={{ marginLeft: "auto" }}>
          {user ? (
            <>
              <span style={{ marginRight: 8 }}>{user.name}님</span>
              <button onClick={onLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login">로그인</Link>
              <span style={{ margin: "0 6px" }}>|</span>
              <Link to="/signup">회원가입</Link>
            </>
          )}
        </div>
      </header>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
