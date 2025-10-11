import { Container } from "./Container";
import s from "./section.module.css";
import type { PropsWithChildren, ReactNode } from "react";

export function Section({
  title, subtitle, surface, className, children
}: PropsWithChildren<{title?:ReactNode; subtitle?:ReactNode; surface?:boolean; className?:string;}>) {
  return (
    <section className={surface ? s.surface : undefined}>
      <Container>
        <div className={`${s.wrap} ${className ?? ""}`}>
          {title && <h2 className={s.title}>{title}</h2>}
          {subtitle && <p className={s.sub}>{subtitle}</p>}
          {children}
        </div>
      </Container>
    </section>
  );
}