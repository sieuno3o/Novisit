import React, { useState, FormEvent, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";
import "./CreateNotice.scss";
import { FiPlus } from "react-icons/fi";
import { useAuth } from "../../auth";
import {
  createSetting,
  ApiError,
  Setting,
  Channel,
} from "../../api/settingsAPI";
import { fetchMain, type Domain } from "../../api/main";
import { useToast } from "../../components/Toast";

export type NoticeItemShape = {
  id: string;
  title: string;
  tags: { label: string }[];
  channels: Channel[];
  date: string;
  link?: string;
};

interface CreateNoticeProps {
  onCreated: (setting: Setting) => void;
  existingSettings?: Setting[];
}

const CreateNotice: React.FC<CreateNoticeProps> = ({
  onCreated,
  existingSettings = [],
}) => {
  const { logout } = (useAuth() as any) ?? {};
  const { show } = useToast();

  const [open, setOpen] = useState(false);

  // 서버 도메인 목록 사용
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainId, setDomainId] = useState("");

  const [name, setName] = useState("");
  const [urlText, setUrlText] = useState("");
  const [keywordText, setKeywordText] = useState("");

  // ✅ 채널은 배열만 허용하므로 단순 토글 상태만 유지
  const [selected, setSelected] = useState<Record<Channel, boolean>>({
    kakao: true, // 기본값 원하면 false로 변경 가능
    discord: false,
  });

  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 컴포넌트 마운트 시 서버에서 도메인 목록 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setDomainsLoading(true);
        const list = await fetchMain();
        if (!alive) return;
        setDomains(list);
      } catch {
        // 실패 시 조용히 빈 리스트 유지
      } finally {
        if (alive) setDomainsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 이미 설정된 도메인 ID 목록
  const usedDomainIds = useMemo(
    () => new Set(existingSettings.map((s) => s.domain_id)),
    [existingSettings]
  );

  const parseList = (text: string) =>
    text
      .split(/[\n,]/g)
      .map((s) => s.trim())
      .filter(Boolean);

  const chosenChannels = useMemo(
    () => (["kakao", "discord"] as Channel[]).filter((c) => selected[c]),
    [selected]
  );

  // 사용 가능한 도메인이 있는지 확인
  const availableDomains = useMemo(
    () => domains.filter((d) => !usedDomainIds.has(d.id)),
    [domains, usedDomainIds]
  );

  const canSubmit =
    !!domainId.trim() && !!name.trim() && chosenChannels.length > 0 && !loading;

  const toggle = (key: Channel) =>
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleOpenModal = () => {
    // 사용 가능한 도메인이 없으면 Toast 표시
    if (
      !domainsLoading &&
      domains.length > 0 &&
      availableDomains.length === 0
    ) {
      show(
        "모든 도메인에 이미 알림 설정이 존재합니다. 새로운 알림을 추가하려면 기존 설정을 삭제해 주세요."
      );
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBanner(null);

    if (chosenChannels.length === 0) {
      setBanner({ type: "error", text: "채널을 최소 1개 이상 선택해 주세요." });
      return;
    }

    // 이미 설정된 도메인 확인
    if (usedDomainIds.has(domainId.trim())) {
      setBanner({
        type: "error",
        text: "해당 도메인은 이미 알림 설정이 존재합니다. 다른 도메인을 선택해 주세요.",
      });
      return;
    }

    const payload = {
      domain_id: domainId.trim(),
      name: name.trim(),
      url_list: parseList(urlText),
      filter_keywords: parseList(keywordText),
      channel: chosenChannels,
    };

    try {
      setLoading(true);
      const setting = await createSetting(payload);
      onCreated(setting);

      // reset & close
      setDomainId("");
      setName("");
      setUrlText("");
      setKeywordText("");
      setSelected({ kakao: false, discord: false });
      setOpen(false);
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

  return (
    <>
      <div className="notice-add-row">
        <button
          type="button"
          className="notice-fab"
          aria-label="알림 설정 추가"
          onClick={handleOpenModal}
        >
          <FiPlus size={22} />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            className="modal-backdrop flex-center"
            role="dialog"
            aria-modal="true"
            onClick={() => setOpen(false)}
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              aria-labelledby="modal-title"
            >
              <div className="modal__header flex-center">
                <div id="modal-title" className="heading3">
                  알림 설정 생성
                </div>
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
                  <label className="form__label">
                    도메인
                    <select
                      className="form__input"
                      value={domainId}
                      onChange={(e) => setDomainId(e.target.value)}
                      required
                      disabled={domainsLoading}
                    >
                      <option value="" disabled>
                        {domainsLoading
                          ? "도메인 불러오는 중…"
                          : "도메인을 선택하세요"}
                      </option>
                      {domains.map((d) => {
                        const isUsed = usedDomainIds.has(d.id);
                        return (
                          <option key={d.id} value={d.id} disabled={isUsed}>
                            {d.name}
                            {isUsed ? " (이미 설정됨)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  {usedDomainIds.size > 0 && (
                    <div
                      className="body3"
                      style={{ marginTop: 4, color: "#666" }}
                    >
                      * 한 도메인에 하나의 알림만 설정할 수 있습니다.
                    </div>
                  )}

                  <label className="form__label">
                    설정 이름
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

                  {/* 필요 시 URL 입력 사용 */}
                  {/* <label className="form__label">
                    URL 목록 (줄바꿈 또는 쉼표)
                    <textarea
                      className="form__textarea"
                      rows={3}
                      value={urlText}
                      onChange={(e) => setUrlText(e.target.value)}
                    />
                  </label> */}

                  {/* <label className="form__label">
                    필터 키워드 (줄바꿈 또는 쉼표)
                    <textarea
                      className="form__textarea"
                      rows={3}
                      value={keywordText}
                      onChange={(e) => setKeywordText(e.target.value)}
                    />
                  </label> */}

                  <div className="form__actions flex-center">
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={() => setOpen(false)}
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
        )}
    </>
  );
};

export default CreateNotice;
