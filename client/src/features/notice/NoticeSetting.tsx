// src/features/notice/NoticeSetting.tsx
import React from "react";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";
import "./NoticeSetting.scss";
import { FiEdit } from "react-icons/fi";
import { IoMdTime } from "react-icons/io";

type Channel = "kakao" | "discord" | "email" | "sms";

interface Tag {
  label: string;
}

interface NoticeItem {
  id: string;
  title: string;
  tags: Tag[];
  channel: Channel;
  channelLabel: string;
  date: string;
  link?: string;
}

interface NoticeCardProps {
  item: NoticeItem;
  onEdit?: (id: string) => void;
}

// Card component
const NoticeCard: React.FC<NoticeCardProps> = ({ item, onEdit }) => {
  return (
    <div className="notice-card">
      <div className="notice-card-header flex-between">
        <div className="notice-card-title body1">{item.title}</div>
        <div>
          <button
            type="button"
            className="notice-card-edit flex-center"
            aria-label={`${item.title} 편집`}
            onClick={() => onEdit?.(item.id)}
          >
            <div className="icon-wrapper">
              <FiEdit size={16} />
            </div>
          </button>
        </div>
      </div>

      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="notice-card-link"
        >
          {item.link}
        </a>
      )}

      <div className="notice-card-tags">
        {item.tags.map((t, i) => (
          <span className="tag" key={i}>
            {t.label}
          </span>
        ))}
      </div>
      <div className="notice-contour"></div>
      <div className="notice-card-channel body3">
        알림 채널:{" "}
        <span className={`channel ${item.channel}`}>{item.channelLabel}</span>
      </div>

      <div className="notice-card-date button2 flex-row">
        <div className="time-icon">
          <IoMdTime />
        </div>
        {item.date}
      </div>
    </div>
  );
};

// Main component
const NoticeSetting: React.FC = () => {
  const items: NoticeItem[] = [
    {
      id: "scholarship",
      title: "장학금",
      tags: [
        { label: "국가장학금" },
        { label: "교내장학금" },
        { label: "학자금대출" },
      ],
      channel: "kakao",
      channelLabel: "카카오톡",
      date: "2025. 9. 15.",
    },
    {
      id: "contest",
      title: "공모전",
      tags: [{ label: "디자인" }, { label: "IT" }, { label: "대학생" }],
      channel: "discord",
      channelLabel: "디스코드",
      date: "2025. 9. 20.",
    },
  ];

  const handleEdit = (id: string) => {
    console.log("edit:", id);
  };

  return (
    <div className="notice-setting-container">
      <div className="notice-title heading3">알림 설정 목록</div>
      {items.map((it) => (
        <NoticeCard key={it.id} item={it} onEdit={handleEdit} />
      ))}
    </div>
  );
};

export default NoticeSetting;
