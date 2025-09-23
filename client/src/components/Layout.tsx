import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="wrapper">
      <div className="content">{children}</div>
    </div>
  );
}
