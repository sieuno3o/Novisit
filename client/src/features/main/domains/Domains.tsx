import { Section } from "../common/Section";
import { DomainCard } from "./DomainCard";
import { GraduationCap, Trophy, UserCircle2 } from "lucide-react";
import s from "./domains.module.scss";

export default function Domains() {
  return (
    <Section  
    title={
    <span className="heading1" style={{ fontSize: 31, fontWeight: 600 }} >
       관심 분야를 선택하세요
       </span>}
    titleClassName="text-center">
    
      <div className={s.grid}>
        <DomainCard icon={<GraduationCap size={28}/>} title="지원" desc="장학금, 창업지원, 소상공인 지원 등 정부 정책" />
        <DomainCard icon={<Trophy size={28}/>}         title="공모전" desc="디자인, 개발, 논문, 영상 등 각종 공모전" />
        <DomainCard icon={<UserCircle2 size={28}/>}     title="채용"   desc="대기업, 공기업, 스타트업 채용 공고" />
      </div>

    </Section>
  );
}