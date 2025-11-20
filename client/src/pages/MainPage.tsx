import { useEffect, useState } from "react";
import Hero from "../features/main/hero/Hero";
import Domains from "../features/main/domains/Domains";
import Start from "../features/main/Start";
import { useAuth } from "../auth";
import { fetchMain, type Domain } from "../api/main";

export default function MainPage() {
  const { user, loading } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const MOCK: Domain[] = [
  { id: "1", name: "Example", urls: ["https://a", "https://b", "https://c"], keywords: ["지원","공모전","채용"] },
];

  useEffect(() => {
    let alive = true;

    if (!user) {        // 로그아웃/비로그인이면 목록 비움
      setDomains([]);
      return () => { alive = false; };
    }

    (async () => {
      try {
        const list = await fetchMain();      // 서버에서 도메인 목록
        if (!alive) return;
        setDomains(Array.isArray(list) ? list : []);
      } catch {
        if (!alive) return;
        setDomains([]);   // 실패 시 빈 배열
      }
    })();

    return () => { alive = false; };
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <Hero>
        <Start onClick={() => (window.location.href = "/login")} />
      </Hero>
    );
  }

  return (
    <div className="page">
      <Hero />
      <Domains /> {/* 목데이터 모드면 props 없이 */}
    </div>
  );
}
