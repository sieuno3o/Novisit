import { Outlet, useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { useAuth } from "../auth";

export default function Layout() {
  const { signout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signout();
    navigate("/", { replace: true });
  };

  return (
    <div>
      <NavBar />
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
