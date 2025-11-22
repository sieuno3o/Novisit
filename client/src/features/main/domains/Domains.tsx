import { useState } from "react";
import { Section } from "../common/Section";
import { DomainCard } from "./DomainCard";
import CreateNoticeMain from "./CreateNoticeMain";
import s from "./domains.module.scss";
import * as Icons from "lucide-react";

import type { Domain } from "../../../api/main";

type Props = {
  domains: Domain[];          // MainPage에서 내려줄 도메인 목록
  error?: string | null;    
};

export default function Domains({ domains, error }: Props) {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

const items = domains.map((d) => {
  // 서버에서 내려주는 문자열 기반으로 lucide 아이콘 검색
  const Icon = (Icons as any)[d.icon] ?? Icons.Globe;

    return (
      <DomainCard
        key={d.id}
        icon={<Icon size={28} />} 
        title={d.name}       // 서버 name 사용
        desc={d.desc}        // 서버 desc 사용
        onClick={() => setSelected({ id: d.id, name: d.name })}
      />
    );
  });

  return (
    <>
      <Section
        title={
          <span className="heading1" style={{ fontSize: 31, fontWeight: 600 }}>
            관심 분야를 선택하세요
          </span>
        }
        titleClassName="text-center"
      >
        {/* 에러/빈 데이터 처리 */}
        {error && (
          <p className={s.error}>{error}</p>
        )}
        {!error && items.length === 0 && (
          <p className={s.empty}>현재 제공 가능한 도메인이 없습니다.</p>
        )}

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