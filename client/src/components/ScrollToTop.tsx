import { useState, useEffect, useCallback } from "react";
import { FiArrowUp } from "react-icons/fi";
import "./ScrollToTop.scss";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  // 스크롤 위치 체크
  const checkScroll = useCallback(() => {
    const scrollTop = Math.max(
      window.pageYOffset || 0,
      document.documentElement?.scrollTop || 0,
      document.body?.scrollTop || 0
    );
    setVisible(scrollTop > 100);
  }, []);

  useEffect(() => {
    checkScroll();

    window.addEventListener("scroll", checkScroll, { passive: true });
    document.addEventListener("scroll", checkScroll, { passive: true });

    const interval = setInterval(checkScroll, 200);

    return () => {
      window.removeEventListener("scroll", checkScroll);
      document.removeEventListener("scroll", checkScroll);
      clearInterval(interval);
    };
  }, [checkScroll]);

  const scrollToTop = () => {
    // 모든 가능한 방법으로 스크롤
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);

    // smooth 버전도 시도
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-to-top visible"
      onClick={scrollToTop}
      aria-label="맨 위로 이동"
    >
      <FiArrowUp size={24} />
    </button>
  );
}
