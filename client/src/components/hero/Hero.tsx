import s from "./hero.module.css";
import { Container } from "../common/Container";

export default function Hero() {
  return (
    <div className={s.wrap}>
      <div className={s.bg} aria-hidden />
      <Container>
        <div className={s.inner}>
          <div className={s.brand}>
            <img src="/vite.svg" alt="" width={28} height={28}/>
            <strong>Novisit</strong>
          </div>
          <h1 className={s.title}>
            <span className={s.gradient}>Skip the visit, get the news</span>
          </h1>
          <p className={s.sub}>
            더 이상 여러 사이트를 들락날락하지 마세요.<br/>
            원하는 공지사항만 골라서 실시간 알림을 받아보세요.
          </p>
        </div>
      </Container>
    </div>
  );
}