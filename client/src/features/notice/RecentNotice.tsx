// import React from "react";
import "./RecentNotice.scss";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";
import { IoMdTime } from "react-icons/io";

const RecentNotice = () => {
  return (
    <div className="recent-notice flex-col">
      <div className="recent-notice-title heading3">최근 알림</div>
      <div className="recent-notice-content flex-col">
        <div className="recent-top flex-between button1">
          <div className="recent-notice-header body2 flex-row">
            <div className="recent-header-text">
              2024학년도 2학기 국가장학금 신청 안내
            </div>
            <div className="recent-new button1">NEW</div>
          </div>
          <div className="recent-tag">장학금</div>
        </div>
        <div className="recent-notice-message body3">
          2024학년도 2학기 국가장학금(유형Ⅰ,Ⅱ) 신청을 다음과 같이 안내드립니다.
        </div>
        <div className="recent-contour"></div>
        <div className="recent-bottom button2 flex-between">
          <div className="recent-detail flex-row">
            <div className="time-icon">
              <IoMdTime />
            </div>
            2024. 01. 15.
            <div className="recent-source">한국장학재단</div>
          </div>
          <div className="recent-more body3">자세히 보기</div>
        </div>
      </div>
    </div>
  );
};

export default RecentNotice;
