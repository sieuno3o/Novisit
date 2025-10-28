import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{ title: string }>;

export default function ProfileCard({ title, children }: Props) {
  return (
    <section className="my-card">
      <h2 className="my-card-title">{title}</h2>
      <div className="my-card-body">{children}</div>
    </section>
  );
}
