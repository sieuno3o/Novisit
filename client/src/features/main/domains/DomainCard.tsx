import s from "./domains.module.scss";
import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  desc: string;
  onClick?: () => void;
  disabled?: boolean;    // 추가
};

export function DomainCard({ icon, title, desc, onClick, disabled }: Props) {
  return (
    <div className={s.card}>
      <div className={s.icon}>{icon}</div>
      <h3 className={s.title}>{title}</h3>
      <p className={s.desc}>{desc}</p>

      <button
        className={`${s.button} btn-outline`}
        disabled={disabled}                     // 비활성화
        onClick={disabled ? undefined : onClick} // 클릭 완전 차단
      >
        설정하기
      </button>
    </div>
  );
}
