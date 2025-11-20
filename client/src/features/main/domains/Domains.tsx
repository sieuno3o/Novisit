import { useState } from "react";
import { Section } from "../common/Section";
import { DomainCard } from "./DomainCard";
import CreateNoticeMain from "./CreateNoticeMain";
import s from "./domains.module.scss";
import { GraduationCap, Trophy, UserCircle2 } from "lucide-react";

export type Domain = {
  id: string;
  name: string;
  urls: string[];
  keywords: string[];
};

export default function Domains() {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  // 백엔드 fetchMain() 대신 직접 정의
  const domains: Domain[] = [
    {
      id: "gov-support",
      name: "정부 지원",
      urls: [],
      keywords: ["정부 지원"],
    },
    {
      id: "contest",
      name: "공모전",
      urls: [],
      keywords: ["공모전"],
    },
    {
      id: "job",
      name: "채용",
      urls: [],
      keywords: ["채용"],
    },
  ];

  const BASE = [
    { icon: <GraduationCap size={28} />, desc: "장학금, 창업지원, 소상공인 지원 등 정부 정책" },
    { icon: <Trophy size={28} />, desc: "디자인, 개발, 논문, 영상 등 각종 공모전" },
    { icon: <UserCircle2 size={28} />, desc: "대기업, 공기업, 스타트업 채용 공고" },
  ];

  // 베이스랑 도메인 3개에 1:1 매핑
  const items = BASE.map((base, i) => {
    const d = domains[i];
    if (!d) return null;

    const title = d.keywords?.[0] ?? d.name ?? "항목";
    return (
      <DomainCard
        key={d.id}
        icon={base.icon}
        title={title}
        desc={base.desc}
        onClick={() => setSelected({ id: d.id, name: title })}
      />
    );
  });

  return (
    <>
      <Section
        title={<span className="heading1" style={{ fontSize: 31, fontWeight: 600 }}>관심 분야를 선택하세요</span>}
        titleClassName="text-center"
      >
        <div className={s.grid}>{items}</div>
      </Section>

      {selected && (
        <CreateNoticeMain
          open={true}
          onClose={() => setSelected(null)}
          domains={domains}
          initialDomainId={selected.id}
          initialDomainName={selected.name}
          onCreated={() => setSelected(null)}
        />
      )}
    </>
  );
}
