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
  const isDisabled = !!disabled;
  const buttonLabel = isDisabled ? "설정 완료" : "설정하기";

  return (
    <div className={`${s.card} ${isDisabled ? s.disabled : ""}`}>
      <div className={s.icon}>{icon}</div>
      <h3 className={s.title}>{title}</h3>
      <p className={s.desc}>{desc}</p>

      <button
        className={`${s.button} btn-outline ${
          isDisabled ? s.buttonDisabled : ""
        }`}
        disabled={isDisabled}
        onClick={isDisabled ? undefined : onClick}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
