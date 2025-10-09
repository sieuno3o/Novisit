import { useLocation, useNavigate } from "react-router-dom";
import { beginKakaoLogin } from "../../api/auth";
import "./LoginForm.scss";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location?.state?.from?.pathname ?? "/";

  return (
    <div className="login-form flex-col-center">
      <div className="login-logo heading1">로그인</div>
      <div className="login-actions flex-col-center">
        <div className="kakao-login flex-row-center">
          <img
            className="kakao-img logo-img"
            src="/assets/img/kakaologo.png"
            alt="KakaoLogo"
          />
          <button
            type="button"
            className="login-form-btn kakao-login-button flex-center body2"
            onClick={() => beginKakaoLogin(from)}
          >
            카카오로 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}
