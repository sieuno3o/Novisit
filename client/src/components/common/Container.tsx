import s from "./container.module.css";
import type { PropsWithChildren } from "react";

export function Container({ children, className }: PropsWithChildren<{className?:string}>) {
  return <div className={`${s.container} ${className ?? ""}`}>{children}</div>;
}