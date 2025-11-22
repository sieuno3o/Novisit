// src/features/notice/RecentNotice.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./RecentNotice.scss";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";
import { IoMdTime } from "react-icons/io";
import {
  fetchSettings,
  type Setting,
  type Message,
} from "../../api/settingsAPI";
import { fetchMain, type Domain } from "../../api/main";

/** ----- 렌더용 아이템 타입 ----- */
type RecentItem = {
  key: string;
  domainId: string;
  title: string;
  contents: string;
  link?: string;
  sended_at: string;
};

const INITIAL_COUNT = 10;
const PAGE_SIZE = 5;
const NEW_DAYS = 3;

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

const formatKstDate = (s?: string): string => {
  if (!s) return "-";
  const dt1 = new Date(s);
  if (!Number.isNaN(dt1.getTime())) {
    const y = dt1.getFullYear();
    const m = pad2(dt1.getMonth() + 1);
    const d = pad2(dt1.getDate());
    return `${y}. ${m}. ${d}.`;
  }
  const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mm = pad2(Number(m[2]));
    const dd = pad2(Number(m[3]));
    return `${y}. ${mm}. ${dd}.`;
  }
  return s;
};

const timeOf = (s?: string): number => {
  if (!s) return -Infinity;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : -Infinity;
};

const isNewBy = (s?: string, days = NEW_DAYS): boolean => {
  const t = timeOf(s);
  if (!Number.isFinite(t)) return false;
  const diffMs = Date.now() - t;
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
};

const flattenAndSortMessages = (settings: Setting[]): RecentItem[] => {
  const items: RecentItem[] = [];
  for (const s of settings) {
    const sid = String((s as any).id ?? s._id ?? "");
    const domainId = s.domain_id;
    (s.messages ?? []).forEach((m: Message) => {
      items.push({
        key: `${sid}_${m.id}`,
        domainId,
        title: m.title ?? "(제목 없음)",
        contents: m.contents ?? "",
        link: m.link,
        sended_at: m.sended_at ?? "",
      });
    });
  }
  items.sort((a, b) => timeOf(b.sended_at) - timeOf(a.sended_at));
  return items;
};

const RecentNotice: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [banner, setBanner] = useState<{ type: "error"; text: string } | null>(
    null
  );

  const [domains, setDomains] = useState<Domain[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const domainMap = useMemo(
    () =>
      domains.reduce<Record<string, string>>((acc, d) => {
        acc[d.id] = d.name;
        return acc;
      }, {}),
    [domains]
  );

  const [allItems, setAllItems] = useState<RecentItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  // 초기 로드: settings + domains
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setBanner(null);

        const [settings, domainList] = await Promise.all([
          fetchSettings(),
          fetchMain(),
        ]);
        if (!alive) return;

        const flat = flattenAndSortMessages(settings);
        setAllItems(flat);
        setDomains(domainList);
        setVisibleCount(Math.min(INITIAL_COUNT, flat.length));
      } catch (e: any) {
        if (!alive) return;
        setBanner({
          type: "error",
          text: e?.message || "최근 알림을 불러오지 못했습니다.",
        });
        setAllItems([]);
        setDomains([]);
        setVisibleCount(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 무한 스크롤: 센티널 관찰
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (loading) return;
    if (visibleCount >= allItems.length) return; // 모두 표시 완료

    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        setPaging(true);
        const timer = setTimeout(() => {
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, allItems.length)
          );
          setPaging(false);
        }, 300);
        return () => clearTimeout(timer);
      },
      { rootMargin: "120px 0px 120px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loading, visibleCount, allItems.length]);

  const itemsToShow = useMemo(
    () => allItems.slice(0, visibleCount),
    [allItems, visibleCount]
  );
  const isEmpty = !loading && allItems.length === 0;

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="recent-notice flex-col">
      <div className="recent-notice-title heading3">최근 알림</div>

      {banner && (
        <div
          className="notice-banner notice-banner--error"
          role="alert"
          style={{ marginBottom: 12 }}
        >
          {banner.text}
        </div>
      )}

      {loading && (
        <div className="body3" style={{ padding: "12px 4px" }}>
          불러오는 중…
        </div>
      )}

      {isEmpty && (
        <div className="body3" style={{ padding: "12px 4px" }}>
          최근 알림이 없습니다.
        </div>
      )}

      {!loading &&
        !isEmpty &&
        itemsToShow.map((it) => {
          const tagName = domainMap[it.domainId] ?? "알림";
          const dateText = formatKstDate(it.sended_at);
          const showNew = isNewBy(it.sended_at, NEW_DAYS);
          const isExpanded = expandedItems.has(it.key);

          return (
            <div key={it.key} className="recent-notice-content flex-col">
              <div className="recent-top flex-between button1">
                <div className="recent-notice-header body2 flex-row">
                  <div className="recent-header-text">{it.title}</div>
                  {showNew && <div className="recent-new button1">NEW</div>}
                </div>
                <div className="recent-tag">{tagName}</div>
              </div>

              <div
                className={`recent-notice-message body3 ${
                  isExpanded ? "expanded" : "collapsed"
                }`}
                onClick={() => toggleExpand(it.key)}
                style={{ cursor: "pointer" }}
              >
                {it.contents}
              </div>

              <div className="recent-contour"></div>

              <div className="recent-bottom button2 flex-between">
                <div className="recent-detail flex-row">
                  <div className="time-icon">
                    <IoMdTime />
                  </div>
                  {dateText}
                </div>

                <div className="recent-more body3">
                  {it.link ? (
                    <a
                      href={it.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gobtn"
                    >
                      바로가기
                    </a>
                  ) : (
                    <span style={{ opacity: 0.6 }}>링크 없음</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

      {/* 센티널 + 페이징 로딩 표시 */}
      {!loading && !isEmpty && visibleCount < allItems.length && (
        <div className="flex-col" style={{ alignItems: "center" }}>
          <div
            ref={sentinelRef}
            style={{ height: 1, width: 1, overflow: "hidden" }}
          />
          {paging && (
            <div className="body3" style={{ padding: "12px 4px" }}>
              더 불러오는 중…
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecentNotice;
