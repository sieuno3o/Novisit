import React, { useEffect, useMemo, useState, FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "../../notice/CreateNotice.scss";                   
import { useAuth } from "../../../auth";
import {
    createSetting,
    ApiError,
    Channel,
    Setting,
} from "../../../api/settingsAPI";

type Domain = { id: string; name: string };

type Props = {
    open: boolean;
    onClose: () => void;
    domains: Domain[];                
    initialDomainId: string;           
    initialDomainName?: string;       
    onCreated?: (s: Setting) => void;  
};

export default function CreateNoticeMain({
    open,
    onClose,
    domains,
    initialDomainId,
    initialDomainName,
    onCreated,
}: Props) {
    const navigate = useNavigate();
    const { logout } = (useAuth() as any) ?? {};

    // ====== CreateNotice.tsx와 동일한 상태 구성 ======
    const [name, setName] = useState("");
    const [keywordText, setKeywordText] = useState("");
    const [selected, setSelected] = useState<Record<Channel, boolean>>({
        kakao: false,
        discord: false,
    });
    const [loading, setLoading] = useState(false);
    const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // 도메인명은 고정 표시
    const domainName = useMemo(() => {
        if (initialDomainName) return initialDomainName;
        return domains.find((d) => d.id === initialDomainId)?.name ?? "도메인";
    }, [domains, initialDomainId, initialDomainName]);

    // ESC 닫기 + 스크롤 락
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;

    const toggle = (key: Channel) =>
        setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

    const parseList = (text: string) =>
        text
            .split(/[\n,]/g)
            .map((s) => s.trim())
            .filter(Boolean);

    const canSubmit = !!name.trim() && (selected.kakao || selected.discord) && !loading;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setBanner(null);

        // 채널 단일/복수 처리
        const chosen = (["kakao", "discord"] as Channel[]).filter((c) => selected[c]);
        if (chosen.length === 0) {
            setBanner({ type: "error", text: "채널을 최소 1개 이상 선택해 주세요." });
            return;
        }
        const channelPayload: Channel | Channel[] = chosen.length === 1 ? chosen[0] : chosen;

        const payload = {
            domain_id: initialDomainId,          // 메인에서 받은 고정 도메인 ID
            name: name.trim(),
            url_list: [],                        // 메인 모달은 URL 미사용
            filter_keywords: parseList(keywordText),
            channel: channelPayload,             // 단일/배열 모두 지원
        };

        try {
            setLoading(true);
            const setting = await createSetting(payload); // 백엔드 저장

            onCreated?.(setting); // 선택: 필요 시 상위에서 활용
            onClose();
            navigate("/notice", { replace: true }); // /notice 이동 → NoticeSetting이 fetch로 즉시 반영
        } catch (err: any) {
            const msg =
                err instanceof ApiError ? err.message : "네트워크 오류가 발생했습니다.";
            setBanner({ type: "error", text: msg });
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                logout?.();
            }
        } finally {
            setLoading(false);
        }
    };


    return createPortal(
        <div
            className="modal-backdrop flex-center"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header flex-center">
                    <div className="heading3">알림 설정 생성</div>
                </div>

                <div className="modal__body">
                    {banner && (
                        <div
                            className={`notice-banner ${banner.type === "success" ? "notice-banner--success" : "notice-banner--error"
                                }`}
                            role="alert"
                        >
                            {banner.text}
                        </div>
                    )}

  const canSubmit =
    !!name.trim() && (selected.kakao || selected.discord) && !loading;
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const chosen = (["kakao", "discord"] as Channel[]).filter(
      (c) => selected[c]
    );
    if (chosen.length === 0) {
      setBanner({ type: "error", text: "채널을 최소 1개 이상 선택해 주세요." });
      return;
    }

    const payload = {
      domain_id: initialDomainId,
      name: name.trim(),
      url_list: [],
      filter_keywords: parseList(keywordText),
      channel: chosen, // 🔹 항상 Channel[]
    };

    try {
      setLoading(true);
      const setting = await createSetting(payload);
      onCreated?.(setting);
      onClose();
      navigate("/notice", { replace: true });
    } catch (err: any) {
      const msg =
        err instanceof ApiError ? err.message : "네트워크 오류가 발생했습니다.";
      setBanner({ type: "error", text: msg });
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        logout?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="modal-backdrop flex-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header flex-center">
          <div className="heading3">알림 설정 생성</div>
        </div>

        <div className="modal__body">
          {banner && (
            <div
              className={`notice-banner ${
                banner.type === "success"
                  ? "notice-banner--success"
                  : "notice-banner--error"
              }`}
              role="alert"
            >
              {banner.text}
            </div>
          )}

          <form className="notice-form flex-col" onSubmit={handleSubmit}>
            {/* 도메인: 읽기 전용 표시 (드롭다운 대신) */}
            <label
              className="form__label"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ whiteSpace: "nowrap" }}>
                도메인 <span className="req">*</span>
              </span>

              <div
                style={{
                  borderBottom: "1px solid #ccc",
                  paddingBottom: "3px",
                  display: "inline-block",
                  width: "fit-content",
                  minWidth: `${domainName.length * 10 + 20}px`, // 글자 수 기반으로 살짝 여유
                  textAlign: "left",
                  pointerEvents: "none",
                }}
              >
                {domainName}
              </div>

              <input type="hidden" value={initialDomainId} />
            </label>

            <label className="form__label">
              설정 이름 <span className="req">*</span>
              <input
                className="form__input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <div className="flex-row form__group">
              <div className="channel-label">채널</div>
              <div className="channel-toggle-row">
                <button
                  type="button"
                  className={`chip ${
                    selected.kakao ? "chip--active" : ""
                  } channel kakao`}
                  onClick={() => toggle("kakao")}
                >
                  카카오톡
                </button>
                <button
                  type="button"
                  className={`chip ${
                    selected.discord ? "chip--active" : ""
                  } channel discord`}
                  onClick={() => toggle("discord")}
                >
                  디스코드
                </button>
              </div>
            </div>

            <label className="form__label">
              필터 키워드 (줄바꿈 또는 쉼표)
              <textarea
                className="form__textarea"
                rows={3}
                value={keywordText}
                onChange={(e) => setKeywordText(e.target.value)}
              />
            </label>

            <div className="form__actions flex-center">
              <button
                className="btn btn--secondary"
                type="button"
                onClick={onClose}
                disabled={loading}
              >
                취소
              </button>
              <button
                className="btn btn--primary"
                type="submit"
                disabled={!canSubmit}
              >
                {loading ? "생성 중…" : "생성"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
