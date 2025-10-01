import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import "./LoginForm.scss";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";

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

  return (
    <div className="login-form flex-col-center">
      <div className="login-logo heading1">로그인</div>
      {/* <label>
        이메일
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>

      <label>
        비밀번호
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••"
          required
        />
      </label> */}
      {/* {error && <div style={{ color: "crimson" }}>{error}</div>} */}
      <div className="login-actions flex-col-center">
        <div className="kakao-login flex-row-center">
          <img
            className="kakao-img logo-img"
            src="../../../public/assets/img/kakaologo.png"
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
            src="../../../public/assets/img/discordlogo.png"
            alt="discord"
          />
          <button
            type="button"
            className="login-form-btn discord-login-button flex-center body2"
          >
            디스코드로 계속하기
          </button>
        </div>

        {/* 테스트 로그인 */}
        <button
          className="login-form-btn test-login-button flex-center body2"
          type="button"
          onClick={() => {
            signin("FAKE_TOKEN_123", { id: "1", name: "tester" });
            navigate(from, { replace: true });
          }}
        >
          테스트 로그인
        </button>
      </div>
    </div>
  );
}
