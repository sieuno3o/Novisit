import s from "./start.module.scss";

type Props = {
  label?: string;
  className?: string;
  onClick?: () => void; // 나중에 연결
};

export default function StartCTA({ label = "지금 시작하기", className = "", onClick }: Props) {
  return (
    <div className={s.wrap}>
      <button type="button" className={`${s.cta} ${className}`} onClick={onClick}>
        {label}
      </button>
    </div>
  );
}