import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth";
import "./NavBar.scss";
// import "assets/style/_flex.scss";
// import "assets/style/_typography.scss";

export default function NavBar() {
  const { user, signout } = useAuth();

  const onLogout = () => {
    signout();
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar__logo">
        Novisit
      </Link>

      <nav className="navbar__menu">
        <NavLink to="/">홈</NavLink>
        <NavLink to="/notice">공지</NavLink>
        {user && <NavLink to="/mypage">마이페이지</NavLink>}
      </nav>

      <div className="navbar__auth">
        {user ? (
          <>
            <span className="navbar__user">{user.name}님</span>
            <button onClick={onLogout}>로그아웃</button>
          </>
        ) : (
          <>
            <Link to="/login">로그인</Link>
            <span className="divider">|</span>
            <Link to="/signup">회원가입</Link>
          </>
        )}
      </div>
    </header>
  );
}
