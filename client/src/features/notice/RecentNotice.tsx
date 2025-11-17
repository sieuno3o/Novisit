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

/** ----- 더미 데이터 (API 명세 예시 기반) ----- */
const DUMMY_SETTINGS: Setting[] = [
  {
    id: "691a756202c4aebe8114dd6d",
    name: "테스트1",
    domain_id: "1",
    url_list: [],
    filter_keywords: [],
    channel: ["kakao"],
    created_at: "2025. 11. 17.",
    messages: [
      {
        id: "691a78d102c4aebe8114ddea",
        contents: `안녕하세요, <국립부경대학교 인적자원개발 센터>입니다.

뉴스나 주변 이야기를 들어보면

취업 너무 어렵다는 말이 낯설지 않습니다.

학력과 스펙이 높아져도 일자리 문은 점점 좁아지고,

원하는 직장을 찾기까지의 과정은 길고 고단합니다.

특히 청년층은 물론 경력단절자,

중장년층까지 모두가 취업난의 현실 속에서

불안과 고민을 안고 있는데요

하지만 이러한 시기일수록

중요한 것은 준비된 자신입니다.

저희 국립부경대학교 인적자원개발센터에서는 올해도

<2026년 국립부경대학교 SW개발 채용예정자 과정>을 개설하여

수강생을 모집하고 있습니다.

2026년 취업 연계형 교육생 모집

1. AI 2. IoT 3. 빅데이터 JAVA

지원 자격은 30세 미만의 미취업자, 졸업예정자 비전공자라면 누구나 지원이 가능합니다.

2026년 국립부경대학교 SW개발 채용예정자 과정

1？？ 빅데이터 기반 AI 개발 전문가 - 20명

2？？ 윈도우 플랫폼기반 IoT시스템 개발자 - 25명

3？...`,
        sended_at: "2025-11-17T01:22:25.289Z",
        platform: ["kakao"],
        link: "https://www.pknu.ac.kr/main/163?action=view&no=722322",
        title: "◆◆ [국비지원]2026년 취업연계 교육생모집(소프트웨어 개발자)",
      },
      {
        id: "691a78d202c4aebe8114ddf2",
        contents: `안녕하세요, <국립부경대학교 인적자원개발 센터>입니다.

뉴스나 주변 이야기를 들어보면

취업 너무 어렵다는 말이 낯설지 않습니다.

학력과 스펙이 높아져도 일자리 문은 점점 좁아지고,

원하는 직장을 찾기까지의 과정은 길고 고단합니다.

특히 청년층은 물론 경력단절자,

중장년층까지 모두가 취업난의 현실 속에서

불안과 고민을 안고 있는데요

하지만 이러한 시기일수록

중요한 것은 준비된 자신입니다.

저희 국립부경대학교 인적자원개발센터에서는 올해도

<2026년 국립부경대학교 SW개발 채용예정자 과정>을 개설하여

수강생을 모집하고 있습니다.

2026년 취업 연계형 교육생 모집

1. AI 2. IoT 3. 빅데이터 JAVA

지원 자격은 30세 미만의 미취업자, 졸업예정자 비전공자라면 누구나 지원이 가능합니다.

2026년 국립부경대학교 SW개발 채용예정자 과정

1？？ 빅데이터 기반 AI 개발 전문가 - 20명

2？？ 윈도우 플랫폼기반 IoT시스템 개발자 - 25명

3？...`,
        sended_at: "2025-11-17T01:22:26.968Z",
        platform: ["kakao"],
        link: "https://www.pknu.ac.kr/main/163?action=view&no=722255",
        title: "◆◆ [국비지원]2026년 취업연계 교육생모집(소프트웨어 개발자) ◆◆",
      },
      {
        id: "691a78d502c4aebe8114ddfa",
        contents: `★ 프로그램 개요

1. 강의명 : AI를 활용한 취업 준비 특강

2. 일 시 : 2025. 11. 20.(목), 17:00 ~ 20:00 (3h)

3. 장 소 : 대연캠퍼스 동원장보고관 리더십홀

4. 대 상 : 본교 3~4학년 재적생 및 미취업 졸업생

5. 인 원 : 40명 (선착순/ 조기마감 될 수 있음)

6. 내 용 : 생성형 AI를 활용한 채용공고 분석 및 최신 채용 트렌드 분석과 취업 준비를 위한 효과적인 프롬프트 작성 기본 원칙 소개

7. 기 타 : 개인 노트북 지참 필수

★ 신청방법 및 안내사항

1. 신청기간 : 11. 5.(수) ~ 11. 17.(월) 14시까지

2. 신청방법 : 부경아이AI 비교과을 통한 온라인 신청

부경아이AI → 비교과 프로그램 → '프로그램명' 검색 → 수강신청

※ 문의: 대학일자리플러스센터 프로그램 담당자 (T. 051-629-6751, 6752)`,
        sended_at: "2025-11-17T01:22:29.545Z",
        platform: ["kakao"],
        link: "https://www.pknu.ac.kr/main/163?action=view&no=722241",
        title: "[대학일자리플러스센터] AI를 활용한 취업 준비 특강 안내",
      },
    ],
  },
];

const DUMMY_DOMAINS: Domain[] = [
  { id: "1", name: "테스트 도메인", urls: [], keywords: [] },
];

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
        // 실제 데이터가 없으면 더미로 대체
        if (flat.length === 0) {
          setAllItems(flattenAndSortMessages(DUMMY_SETTINGS));
          setDomains(domainList.length > 0 ? domainList : DUMMY_DOMAINS);
          setVisibleCount(
            Math.min(INITIAL_COUNT, DUMMY_SETTINGS[0].messages.length)
          );
        } else {
          setAllItems(flat);
          setDomains(domainList);
          setVisibleCount(Math.min(INITIAL_COUNT, flat.length));
        }
      } catch (e: any) {
        if (!alive) return;
        // 에러 배너 + 더미 데이터 표시
        setBanner({
          type: "error",
          text:
            e?.message ||
            "최근 알림을 불러오지 못했습니다. (더미 데이터 표시 중)",
        });
        setAllItems(flattenAndSortMessages(DUMMY_SETTINGS));
        setDomains(DUMMY_DOMAINS);
        setVisibleCount(
          Math.min(INITIAL_COUNT, DUMMY_SETTINGS[0].messages.length)
        );
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

          return (
            <div key={it.key} className="recent-notice-content flex-col">
              <div className="recent-top flex-between button1">
                <div className="recent-notice-header body2 flex-row">
                  <div className="recent-header-text">{it.title}</div>
                  {showNew && <div className="recent-new button1">NEW</div>}
                </div>
                <div className="recent-tag">{tagName}</div>
              </div>

              <div className="recent-notice-message body3">{it.contents}</div>

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
