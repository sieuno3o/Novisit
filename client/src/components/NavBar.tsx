import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import "./NavBar.scss";
import "../../public/assets/style/_typography.scss";
import "../../public/assets/style/_flex.scss";
import "../../public/assets/style/_colors.scss";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="navbar flex-between">
      <div className="flex-center">
        <Link to="/" className="navbar__logo logo-text heading1">
          Novisit
        </Link>
      </div>

      <div className="navbar__menu body3 flex-center">
        <NavLink to="/" className="nav-btn">
          홈
        </NavLink>
        <NavLink to="/notice" className="nav-btn">
          알림
        </NavLink>
        {user && (
          <NavLink to="/mypage" className="nav-btn">
            마이
          </NavLink>
        )}
      </div>

      <div className="navbar__auth flex-center">
        {user ? (
          <>
            <span className="navbar__user">{user.name}님</span>
            <button className="logout-btn body3" onClick={onLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="login-btn body3">
              시작하기
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}
