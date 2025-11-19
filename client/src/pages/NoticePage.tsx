import NoticeHeader from "../features/notice/NoticeHeader";
import NoticeSetting from "../features/notice/NoticeSetting";
import RecentNotice from "../features/notice/RecentNotice";
import "../../public/assets/style/_flex.scss";

const NoticePage = () => {
  return (
    <div className="page">
      <div className="flex-col">
        <div className="flex-left">
          <NoticeHeader />
        </div>
        <div className="flex-row-left" style={{ alignItems: "flex-start" }}>
          <NoticeSetting />
          <RecentNotice />
        </div>
      </div>
    </div>
  );
};

export default NoticePage;
