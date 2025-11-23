import { useEffect, useState } from "react";
import Hero from "../features/main/hero/Hero";
import Domains from "../features/main/domains/Domains";
import Start from "../features/main/Start";
import { useAuth } from "../auth";
import { fetchMain, type Domain } from "../api/main";

export default function MainPage() {
  const { user, loading } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [error, setError] = useState<string | null>(null); // 추가: 에러 메시지

  useEffect(() => {
    let alive = true;

    if (!user) {        // 로그아웃/비로그인이면 목록 비움
      setDomains([]);
      return () => { alive = false; };
    }

    (async () => {
      try {
        const list = await fetchMain();   
        if (!alive) return;
        setDomains(list);
        setError(null);                    
      } catch (e: any) {
        if (!alive) return;
        setError(e.message ?? "도메인 조회 중 오류가 발생했습니다.");  
        setDomains([]); // 또는 setDomains(MOCK); 로 목데이터 사용 가능
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

   if (loading) {
    return null; 
  }

  if (!user) {
    return (
      <Hero>
        <Start onClick={() => (window.location.href = "/login?kakao_prompt=login")} />
      </Hero>
    );
  }

  return (
    <div className="page">
      <Hero />

      {/*Domains 컴포넌트에 실제 도메인 배열 전달 */}
      <Domains
        domains={domains}
        error={error}           // 선택: 에러 메시지가 필요하면 prop으로 전달
      />
    </div>
  );
}