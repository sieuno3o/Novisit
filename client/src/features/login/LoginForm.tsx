// client/src/features/login/LoginForm.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { beginKakaoLogin } from "../../api/auth"; // ← 카카오 로그인 시작 (리다이렉트)
import "./LoginForm.scss";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";

export default function LoginForm() {
  // const { signin } = useAuth(); // (선택) 테스트 로그인 유지 시 사용
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location?.state?.from?.pathname ?? "/";

  return (
    <div className="login-form flex-col-center">
      <div className="login-logo heading1">로그인</div>

      <div className="login-actions flex-col-center">
        {/* 카카오 로그인만 남김 */}
        <div className="kakao-login flex-row-center">
          <img
            className="kakao-img logo-img"
            src="/assets/img/kakaologo.png" // ✅ public 기준 절대경로
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

        {/* (선택) 테스트 로그인은 유지 */}
        <button
          className="login-form-btn test-login-button flex-center body2"
          type="button"
          onClick={() => {
            // signin("FAKE_TOKEN_123", { id: "1", name: "tester" });
            navigate(from, { replace: true });
          }}
        >
          테스트 로그인
        </button>
      </div>
    </div>
  );
}
