import { Container } from "./Container";
import s from "./section.module.scss";
import type { PropsWithChildren, ReactNode } from "react";

export function Section({
  title, subtitle, surface, className, children,
  titleClassName, subtitleClassName,
}: PropsWithChildren<{
  title?: ReactNode; subtitle?: ReactNode; surface?: boolean;
  className?: string; titleClassName?: string; subtitleClassName?: string;
}>) {
  return (
    <section className={surface ? s.surface : undefined}>
      <Container>
        <div className={`${s.wrap} ${className ?? ""}`}>
          {title && <h2 className={`${s.title} ${titleClassName ?? ""}`}>{title}</h2>}
          {subtitle && <p className={`${s.sub} ${subtitleClassName ?? ""}`}>{subtitle}</p>}
          {children}
        </div>
      </Container>
    </section>
  );
}
