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

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "grid", gap: 10, maxWidth: 360 }}
    >
      <h2>로그인</h2>

      <label>
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
      </label>

      {error && <div style={{ color: "crimson" }}>{error}</div>}

      <button type="submit">로그인</button>

      {/* 테스트 로그인 */}
      <button
        type="button"
        onClick={() => {
          signin("FAKE_TOKEN_123", { id: "1", name: "tester" });
          navigate(from, { replace: true });
        }}
      >
        테스트 로그인
      </button>
    </form>
  );
}
