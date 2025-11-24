import { useEffect, useState } from "react";
import { Section } from "../common/Section";
import { DomainCard } from "./DomainCard";
import CreateNoticeMain from "./CreateNoticeMain";
import s from "./domains.module.scss";
import * as Icons from "lucide-react";

import type { Domain } from "../../../api/main";
import { fetchSettings } from "../../../api/settingsAPI"; //  알림 설정 목록 조회

type Props = {
  domains: Domain[]; // MainPage에서 내려줄 도메인 목록
  error?: string | null;
};

export default function Domains({ domains, error }: Props) {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    null
  );

  // 이미 알림 설정이 있는 도메인의 id 집합 (항상 string으로 관리)
  const [usedDomainIds, setUsedDomainIds] = useState<Set<string>>(new Set());

  // 마운트 시 /settings 호출해서 사용 중인 도메인 수집
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchSettings();
        if (!alive) return;

        const set = new Set<string>(
          list
            .map((s) => s.domain_id)
            .filter((id): id is string | number => id != null)
            .map((id) => String(id))
        );

        setUsedDomainIds(set);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error("[Domains] fetchSettings 실패", e);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const items = domains.map((d) => {
    // Domain.icon 이 optional일 수 있으니 안전하게 처리
    const Icon = (Icons as any)[d.icon as keyof typeof Icons] ?? Icons.Globe;

    const idStr = String(d.id);
    const isUsed = usedDomainIds.has(idStr); // 이미 설정된 도메인 여부

    const title = d.name ?? d.keywords?.[0] ?? "항목";

    return (
      <DomainCard
        key={idStr}
        icon={<Icon size={28} />}
        title={title}
        desc={d.desc}
        disabled={isUsed} // 버튼 비활성화
        onClick={
          isUsed
            ? undefined // 이미 사용된 도메인은 아예 클릭 이벤트 없음
            : () =>
                setSelected({
                  id: idStr,
                  name: d.name ?? "",
                })
        }
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
        {error && <p className={s.error}>{error}</p>}
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
          // 생성 후에는 /notice로 네비게이션되므로,
          // 여기서 usedDomainIds를 갱신할 필요는 없음.
        />
      )}
    </>
  );
}
