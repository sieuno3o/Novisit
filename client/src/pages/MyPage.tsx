import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Profile from "../features/my/ProfileCard";
import ChannelCard from "../features/my/ChannelCard";
import "../features/my/my.scss";
import {
  enablePushForCurrentUser,
  disablePushForCurrentUser,
} from "../firebase/fcmClient";
import { useToast } from "../components/Toast";

import { useAuth } from "../auth";
import { setKakaoEnabled, unlinkDiscord } from "../api/my";

export default function MyPage() {
  const { user, loading, refreshMe } = useAuth();
  const [params] = useSearchParams();
  const toast = useToast();

  // 마운트 시 1회만 내 정보 동기화
  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } catch { }
    })();
  }, []);

  // 디스코드 콜백 결과 처리
  useEffect(() => {
    (async () => {
      const result = params.get("discord");
      if (!result) return;

      // 서버에서 연동 처리 후 돌아오므로 최신 상태 재조회
      await refreshMe();

      // 간단 알림
      const messageMap: Record<string, string> = {
        connected: "디스코드 연동 완료!",
        already_linked: "이미 다른 계정에 연동된 디스코드 계정입니다.",
        invalid_code: "유효하지 않은 인가 코드입니다. 다시 시도해주세요.",
        expired: "연동 세션이 만료되었습니다. 다시 시도해주세요.",
        error_state: "상태(state) 검증에 실패했습니다.",
        error: "디스코드 연동에 실패했습니다.",
      };
      alert(messageMap[result] ?? "연동 처리 결과를 확인할 수 없습니다.");

      // 주소 깨끗하게 정리 (쿼리 제거)
      window.history.replaceState({}, "", window.location.pathname);
    })();
  }, [params, refreshMe]);

  if (loading) return null;

  // 문자열("on")/불리언(true) 모두 지원하는 안전 매핑
  const asOn = (v: unknown) => v === "on" || v === true;

  const name = user?.name ?? "—";
  const email = user?.email ?? "—";
  const kakaoOn = asOn((user as any)?.kakao ?? (user as any)?.isKakaoLinked);
  const discordOn = asOn((user as any)?.discord ?? (user as any)?.isDiscordLinked);

  // 카카오 토글
  async function onToggleKakao(next: boolean) {
    try {
      await setKakaoEnabled(next);
    } finally {
      await refreshMe();
    }
  }

  // 디스코드 OFF
  async function onToggleDiscord(next: boolean) {
    if (next === false) {
      try {
        await unlinkDiscord();
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          "디스코드 연동 해제에 실패했습니다.";
        alert(msg);
        throw e;
      } finally {
        await refreshMe();
      }
    }
  }

  return (
    <div className="my-container">
      <h1 className="my-title">내 정보</h1>

      {/* 기본 정보 */}
      <Profile title="기본 정보">
        <div className="info-row">
          <span className="icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <div className="info-label">이름</div>
          <div className="info-value">{name}</div>
        </div>

        <div className="info-row">
          <span className="icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.6" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" fill="none" />
            </svg>
          </span>
          <div className="info-label">이메일</div>
          <div className="info-value">{email}</div>
        </div>
      </Profile>

      {/* 알림 채널 연동 */}
      <Profile title="알림 채널 연동">
        <ChannelCard
          brand="kakao"
          name="카카오톡"
          toggleable
          defaultOn={kakaoOn}
          onText="연동됨"
          offText="연동되지 않음"
          onToggle={onToggleKakao}
        />

        <ChannelCard
          brand="discord"
          name="디스코드"
          defaultOn={discordOn}
          actionText={discordOn ? undefined : "연동하기"}
          onText="연동됨"
          offText="연동되지 않음"
          onToggle={onToggleDiscord} // ON→OFF 때만 사용됨
        />

        <ChannelCard
          brand="push"
          name="푸시 알림"
          defaultOn={false}
          toggleable={true}
          onToggle={async (next) => {
          if (next) {
            await enablePushForCurrentUser();
          } else {
            await disablePushForCurrentUser();
          }
        }}
        />
      </Profile>
    </div>
  );
}
