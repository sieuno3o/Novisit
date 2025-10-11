import s from "./domains.module.css";
import type { ReactNode } from "react";

type Props = { icon: ReactNode; title: string; desc: string; onClick?: () => void; };
export function DomainCard({ icon, title, desc, onClick }: Props) {
  return (
    <div className={s.card}>
      <div className={s.icon}>{icon}</div>
      <h3 className={s.title}>{title}</h3>
      <p className={s.desc}>{desc}</p>
      <button className={`${s.button} btn-outline`} onClick={onClick}>설정하기</button>
    </div>
  );
}