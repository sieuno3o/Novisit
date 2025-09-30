import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth";
import "./NavBar.scss";
import "../../public/assets/style/_typography.scss";
import "../../public/assets/style/_flex.scss";
import "../../public/assets/style/_colors.scss";

export default function NavBar() {
  const { user, signout } = useAuth();

  const onLogout = () => {
    signout();
  };

  return (
    <header className="navbar flex-between">
      <div>
        <Link to="/" className="navbar__logo logo-text heading1">
          Novisit
        </Link>
      </div>

      <div className="navbar__menu body2 flex-center">
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

      <div className="navbar__auth body2 flex-center">
        {user ? (
          <>
            <span className="navbar__user">{user.name}님</span>
            <button className="nav-btn" onClick={onLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="login">
              로그인
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}
