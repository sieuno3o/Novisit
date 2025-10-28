import s from "./hero.module.scss";
import { Section } from "../common/Section";
import { Container } from "../common/Container";

type Props = {
  children?: React.ReactNode;
};

export default function Hero({ children }: Props) {
  return (
    <div className={s.wrap}>
      <div className={s.bg} aria-hidden="true" />

      <Container>
        <div className={s.inner}>
          <h1 className={s.title}>
            <span className={s.logoText}>Skip the visit, get the news</span>
          </h1>

          <p className={s.sub}>
            더 이상 여러 사이트를 들락날락하지 마세요.
            <br />
            원하는 공지사항만 골라서 실시간 알림을 받아보세요.
          </p>

          {children && <div className={s.actions}>{children}</div>}
        </div>
      </Container>
    </div>
  );
}
