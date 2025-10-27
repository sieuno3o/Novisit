import "./NoticeHeader.scss";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";

const NoticeHeader = () => {
  return (
    <div className="notice-header-container">
      <div className="notice-title heading1">알림 설정 관리</div>
      <div className="notice-body body2">설정된 알림을 확인하고 관리하세요</div>
    </div>
  );
};

export default NoticeHeader;
