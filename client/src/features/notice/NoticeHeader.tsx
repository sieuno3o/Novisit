import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiHelpCircle, FiX } from "react-icons/fi";
import "./NoticeHeader.scss";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";

type PopoverPos = { top: number; left: number; placement: "top" | "bottom" };

type AnyRef<T extends HTMLElement> =
  | React.RefObject<T>
  | React.MutableRefObject<T | null>;

const NoticeHeader: React.FC = () => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = "notice-help-popover";

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      const btn = btnRef.current;
      const pop = document.getElementById(panelId);
      if (btn && btn.contains(target)) return;
      if (pop && pop.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="notice-header-container">
      <div className="notice-header-top flex-between">
        <div className="flex-col">
          <div className="notice-title-container flex-row">
            <div className="notice-title heading1">알림 설정 관리</div>
            <button
              ref={btnRef}
              id="notice-help-btn"
              type="button"
              className="notice-help-btn"
              aria-label="알림 주기 안내 열기"
              aria-controls={panelId}
              aria-expanded={open}
              title="알림 주기 안내"
              onClick={() => setOpen((v) => !v)}
            >
              <FiHelpCircle aria-hidden="true" />
            </button>
          </div>
          <div className="notice-body body2">
            설정된 알림을 확인하고 관리하세요
          </div>
        </div>
      </div>

      {open && (
        <HelpPopover
          anchorRef={btnRef}
          id={panelId}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default NoticeHeader;

/** -------- 팝오버 컴포넌트 (Portal) -------- */
const HelpPopover: React.FC<{
  anchorRef: AnyRef<HTMLButtonElement>;
  id: string;
  onClose: () => void;
}> = ({ anchorRef, id, onClose }) => {
  const popRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<PopoverPos>({
    top: 0,
    left: 0,
    placement: "bottom",
  });

  // 열릴 때 포커스 이동(접근성)
  useEffect(() => {
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  // 위치 계산 (열릴 때 + 스크롤/리사이즈)
  useLayoutEffect(() => {
    const calc = () => {
      const anchor = anchorRef.current;
      const pop = popRef.current;
      if (!anchor || !pop) return;

      const r = anchor.getBoundingClientRect();
      const gap = 8; // 버튼과 간격
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 우선 아래쪽 배치 시도, 공간 없으면 위쪽
      let placement: PopoverPos["placement"] = "bottom";
      const desiredTopBottom =
        r.bottom + gap + pop.offsetHeight <= vh
          ? r.bottom + gap
          : r.top - gap - pop.offsetHeight;

      if (desiredTopBottom < 0) {
        placement = "bottom";
      } else {
        placement = desiredTopBottom > r.top ? "bottom" : "top";
      }

      const top =
        placement === "bottom"
          ? window.scrollY + r.bottom + gap
          : window.scrollY + r.top - gap - pop.offsetHeight;

      const desiredLeft = r.left + r.width / 2 - pop.offsetWidth / 2;
      const margin = 12;
      const left =
        window.scrollX +
        Math.min(Math.max(desiredLeft, margin), vw - pop.offsetWidth - margin);

      setPos({ top, left, placement });
    };

    calc();
    const onScroll = () => calc();
    const onResize = () => calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [anchorRef]);

  const body = (
    <div
      id={id}
      ref={popRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-title`}
      className={`notice-popover ${pos.placement}`}
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="notice-popover__header">
        <div id={`${id}-title`} className="body2 strong">
          알림 주기 안내
        </div>
        <button
          ref={closeBtnRef}
          type="button"
          className="notice-popover__close"
          aria-label="닫기"
          onClick={onClose}
        >
          <FiX aria-hidden="true" />
        </button>
      </div>

      <div className="notice-popover__content body3">
        <div>
          Novisit은 매일 <strong>09:00, 12:00, 15:00, 18:00</strong>(KST)
          <br />
          기준으로 새 공지를 수집·필터링하여 등록된 채널
          <br />
          (카카오톡/디스코드)로 알려드립니다.
        </div>
      </div>

      {/* 화살표 */}
      <span className="notice-popover__arrow" aria-hidden="true" />
    </div>
  );

  return createPortal(body, document.body);
};
