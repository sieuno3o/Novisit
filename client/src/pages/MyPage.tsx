import Profile from "../features/my/ProfileCard";
import ChannelCard from "../features/my/ChannelCard";
import "../features/my/my.scss";

export default function MyPage() {
  return (
    <div className="my-container">
      <h1 className="my-title">내 정보</h1>


      <Profile title="기본 정보">
        <div className="info-row">
          <span className="icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </span>
          <div className="info-label">이름</div>
          <div className="info-value">홍길동</div>
        </div>

        <div className="info-row">
          <span className="icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.6" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" fill="none"/>
            </svg>
          </span>
          <div className="info-label">이메일</div>
          <div className="info-value">hong@example.com</div>
        </div>
      </Profile>

     
      <Profile title="알림 채널 연동">
        <ChannelCard
          brand="kakao"
          name="카카오톡"
          status="연동됨"
          toggleable
          defaultOn
        />
        <ChannelCard
          brand="discord"
          name="디스코드"
          status="연동되지 않음"
          actionText="연동하기"
        />
      </Profile>
    </div>
  );
}