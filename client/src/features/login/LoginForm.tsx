import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { signin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location?.state?.from?.pathname ?? "/";

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !pw) {
      setError("이메일과 비밀번호를 입력하세요.");
      return;
    }

    const fakeToken = "FAKE_TOKEN_123";
    const fakeUser = { id: "1", name: email.split("@")[0] || "user" };

    signin(fakeToken, fakeUser);
    navigate(from, { replace: true });
  };

  // ⬇️ div → form 으로 바꾸고 onSubmit 연결
  return (
    <form className="login-form flex-col-center" onSubmit={onSubmit}>
      <div className="login-logo heading1">로그인</div>

      <div className="login-actions flex-col-center">{/* ✅ 이 div 나중에 닫기 */}
        <div className="kakao-login flex-row-center">
          <img
            className="kakao-img logo-img"
            src="/assets/img/kakaologo.png"
            alt="KakaoLogo"
          />
          <button
            type="button"
            className="login-form-btn kakao-login-button flex-center body2"
          >
            카카오로 계속하기
          </button>
        </div>

        <div className="discord-login flex-row-center">
          <img
            className="discord-img logo-img"
            src="/assets/img/discordlogo.png"
            alt="discord"
          />
          <button
            type="button"
            className="login-form-btn discord-login-button flex-center body2"
          >
            디스코드로 계속하기
          </button>
        </div>

        {error && <div style={{ color: "crimson" }}>{error}</div>}

        {/* 제출 버튼은 form 안에서 type="submit" 유지 */}
        <button type="submit">로그인</button>

        {/* 테스트 로그인은 버튼 클릭만 */}
        <button
          type="button"
          onClick={() => {
            signin("FAKE_TOKEN_123", { id: "1", name: "tester" });
            navigate(from, { replace: true });
          }}
        >
          테스트 로그인
        </button>
      </div>{/* ✅ login-actions div 닫기 */}

    </form> // ✅ form 닫기
  );
}
