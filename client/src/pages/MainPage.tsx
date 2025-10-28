import Hero from "../features/main/hero/Hero";
import Domains from "../features/main/domains/Domains";
import { useAuth } from "../auth";
import Start from "../features/main/Start";

export default function MainPage() {
  const { user, loading } = useAuth();
  if (loading) return null;

    if (!user) {
    return (
      <Hero>
        <Start onClick={() => (window.location.href = "/login")} />
      </Hero>
    );
  }

  // 로그인 → 메인 그대로
  return (
    <>
      <Hero />
      <Domains />
    </>
  );
}