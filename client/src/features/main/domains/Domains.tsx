import { Section } from "../common/Section";
import { DomainCard } from "./DomainCard";
import s from "./domains.module.scss";
import type { Domain } from "../../../api/main";
import { GraduationCap, Trophy, UserCircle2 } from "lucide-react";

type Props = { domains: Domain[] };

export default function Domains({ domains }: Props) {

  const BASE = [
    {
      icon: <GraduationCap size={28} />,
      desc: "장학금, 창업지원, 소상공인 지원 등 정부 정책",
    },
    {
      icon: <Trophy size={28} />,
      desc: "디자인, 개발, 논문, 영상 등 각종 공모전",
    },
    {
      icon: <UserCircle2 size={28} />,
      desc: "대기업, 공기업, 스타트업 채용 공고",
    },
  ];

  // keywords와 urls을 세 개 도메인으로 분리
  //키워드가 ["a, b, c"] 이든 ["a","b","c"] 이든 모두 처리
  const expandedDomains = domains.flatMap((d) => {
  const kws = (d.keywords ?? [])
    .flatMap((k) => k.split(","))   // 콤마 분해
    .map((s) => s.trim())
    .filter(Boolean);

    const urls = d.urls ?? [];

    // 최대 길이 3으로 자르기
    return kws.map((kw, idx) => ({
    id: `${d.id}-${idx}`,
    name: kw,
    keywords: [kw],
    urls: [urls[idx] ?? urls[0]],   // url 없으면 첫 번째로 fallback
  }));
});


  // BASE 3개와 expandedDomains를 인덱스로 매핑
  const items = BASE.map((base, i) => {
    const d = expandedDomains[i];
    const title = d?.keywords?.[0] ?? "항목";
    const href = d?.urls?.[0];

    return (
      <DomainCard
        key={d?.id ?? i}
        icon={base.icon}
        title={title}
        desc={base.desc}
        onClick={() => {
          if (href) window.open(href, "_blank", "noopener");
        }}
      />
    );
  });

  return (
    <Section
      title={
        <span className="heading1" style={{ fontSize: 31, fontWeight: 600 }}>
          관심 분야를 선택하세요
        </span>
      }
      titleClassName="text-center"
    >
      <div className={s.grid}>{items}</div>
    </Section>
  );
}