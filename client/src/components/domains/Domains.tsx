import { Section } from "../common/Section";
import { DomainCard } from "./DomainCard";
import { GraduationCap, Trophy, UserCircle2 } from "lucide-react";

export default function Domains() {
  return (
    <Section surface title="원클릭 도메인 선택" subtitle="장학금 · 공모전 · 입시 중에서 골라 빠르게 시작하세요.">
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",
        gap:18, marginTop:28
      }}>
        <DomainCard icon={<GraduationCap size={28}/>} title="장학금" desc="대학/정부/민간 장학재단 공지사항" />
        <DomainCard icon={<Trophy size={28}/>}         title="공모전" desc="디자인, 개발, 논문, 영상 등 각종 공모전" />
        <DomainCard icon={<UserCircle2 size={28}/>}     title="입시"   desc="대학 공지, 전형 안내, 모집요강" />
      </div>
    </Section>
  );
}