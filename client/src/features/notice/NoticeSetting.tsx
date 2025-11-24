import React, { useEffect, useMemo, useState } from "react";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";
import "./NoticeSetting.scss";
import "../my/my.scss";
import { FiEdit, FiSave, FiX, FiTrash2 } from "react-icons/fi";
import { IoMdTime } from "react-icons/io";
import CreateNotice from "./CreateNotice";
import Toggle from "../my/Toggle";
import {
  fetchSettings,
  updateSetting,
  deleteSetting,
  Setting,
  ApiError,
  Message,
  Channel,
} from "../../api/settingsAPI";
import { fetchMain, type Domain } from "../../api/main";
import { ToastProvider, useToast } from "../../components/Toast";

interface Tag {
  label: string;
}

interface NoticeItem {
  id: string;
  title: string;
  domainName: string;
  tags: Tag[];
  channels: Channel[]; // ★ 다중
  date: string;
  link?: string;
  summary: boolean;
}

const getId = (s: Setting) => String((s as any).id ?? s._id);
const pickFirstMessage = (s: Setting): Message | undefined =>
  Array.isArray(s.messages) && s.messages.length > 0
    ? (s.messages[0] as Message)
    : undefined;

const toKST = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const ensureChannels = (v?: unknown): Channel[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x).trim().toLowerCase())
    .filter((x) => x === "kakao" || x === "discord") as Channel[];
};

const mapSettingToItem = (
  s: Setting,
  domainMap: Record<string, string>
): NoticeItem => {
  const firstMsg = pickFirstMessage(s);

  const primary = ensureChannels(s.channel);
  const channels =
    primary.length > 0 ? primary : ensureChannels(firstMsg?.platform);

  const formatDateOnly = (v: string) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("ko-KR");
  };

  const createdRaw = (s as any).created_at;
  const dateText =
    typeof createdRaw === "string" && createdRaw.trim()
      ? formatDateOnly(createdRaw)
      : firstMsg?.sended_at
      ? formatDateOnly(firstMsg.sended_at)
      : new Date().toLocaleDateString("ko-KR");

  return {
    id: getId(s),
    title: s.name,
    domainName: domainMap[s.domain_id] ?? "",
    tags: (s.filter_keywords ?? []).map((k) => ({ label: k })),
    channels,
    date: dateText,
    link: s.url_list?.[0],
    summary: s.summary ?? true,
  };
};

function TagEditor({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder?: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };
  const remove = (i: number) => {
    const next = values.slice();
    next.splice(i, 1);
    onChange(next);
  };
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };
  return (
    <div className="tag-editor">
      <div className="form__label">{label}</div>
      <div className="tag-input-row">
        <input
          className="form__input"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="btn btn--icon"
          aria-label={`${label} 추가`}
          onClick={add}
        >
          +
        </button>
      </div>
      <div className="notice-card-tags" style={{ marginTop: 8 }}>
        {values.map((t, i) => (
          <span className="tag" key={`${t}-${i}`}>
            {t}
            <button
              type="button"
              aria-label={`${t} 제거`}
              className="tag__remove"
              onClick={() => remove(i)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ----- 카드 ----- */
function NoticeCard({
  item,
  setting,
  isSelected,
  onUpdated,
  onDeleted,
  onSelect,
}: {
  item: NoticeItem;
  setting: Setting;
  isSelected: boolean;
  onUpdated: (updated: Setting) => void;
  onDeleted: (id: string) => void;
  onSelect: (domainId: string | null) => void;
}) {
  const { show } = useToast();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(setting.name ?? "");
  const [urls, setUrls] = useState<string[]>(setting.url_list ?? []);
  const [keywords, setKeywords] = useState<string[]>(
    setting.filter_keywords ?? []
  );

  const initialChannels = ensureChannels(setting.channel);
  const [channels, setChannels] = useState<Record<Channel, boolean>>({
    kakao: initialChannels.includes("kakao"),
    discord: initialChannels.includes("discord"),
  });

  const [summary, setSummary] = useState(setting.summary ?? true);

  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setName(setting.name ?? "");
    setUrls(Array.isArray(setting.url_list) ? setting.url_list : []);
    setKeywords(
      Array.isArray(setting.filter_keywords) ? setting.filter_keywords : []
    );
    const init = ensureChannels(setting.channel);
    setChannels({
      kakao: init.includes("kakao"),
      discord: init.includes("discord"),
    });
    setSummary(setting.summary ?? true);
    setEditing(true);
  };
  const cancel = () => setEditing(false);

  const toggleCh = (key: Channel) =>
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    if (!name.trim()) {
      show("이름을 입력해 주세요.");
      return;
    }
    const chosen = (["kakao", "discord"] as Channel[]).filter(
      (c) => channels[c]
    );
    if (chosen.length === 0) {
      show("채널을 최소 1개 이상 선택해 주세요.");
      return;
    }

    try {
      setSaving(true);
      const updated = await updateSetting(getId(setting), {
        name: name.trim(),
        url_list: urls,
        filter_keywords: keywords,
        channel: chosen, // ✅ 항상 배열로 전송
        summary,
      });
      onUpdated(updated);
      setEditing(false);
      show("수정 완료 되었습니다.");
    } catch (e: any) {
      const text =
        e instanceof ApiError ? e.message : "알림 설정 수정에 실패했습니다.";
      show(text);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const id = getId(setting);
    const ok = window.confirm("삭제 하시겠습니까?");
    if (!ok) return;
    try {
      setSaving(true);
      await deleteSetting(id);
      onDeleted(id);
      show("삭제 완료 되었습니다.");
    } catch (e: any) {
      const text =
        e instanceof ApiError ? e.message : "알림 설정 삭제에 실패했습니다.";
      show(text);
    } finally {
      setSaving(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // 편집 중이거나 버튼/인풋 클릭 시에는 선택 동작 안함
    if (editing) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) return;

    // 이미 선택된 카드면 선택 해제, 아니면 선택
    onSelect(isSelected ? null : setting.domain_id);
  };

  return (
    <div
      className={`notice-card ${editing ? "notice-card--editing" : ""} ${isSelected ? "notice-card--selected" : ""}`}
      onClick={handleCardClick}
      style={{ cursor: editing ? "default" : "pointer" }}
    >
      <div className="notice-card-header flex-between">
        <div className="flex-row notice-card-header-left">
          <div className="notice-card-tags">
            {!editing && item.domainName && (
              <span className="tag domain-tag">{item.domainName}</span>
            )}
            {item.tags.map((t, i) => (
              <span className="tag" key={i}>
                {t.label}
              </span>
            ))}
          </div>
          {!editing ? (
            <div className="notice-card-title body1">{item.title}</div>
          ) : (
            <input
              className="form__input body1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="설정 이름"
            />
          )}
        </div>

        <div className="flex-row gap-8">
          {!editing ? (
            <>
              <button
                type="button"
                className="notice-card-edit flex-center"
                aria-label="삭제"
                onClick={remove}
                title="삭제"
              >
                <div className="icon-wrapper">
                  <FiTrash2 size={16} />
                </div>
              </button>
              <button
                type="button"
                className="notice-card-edit flex-center"
                aria-label="편집"
                onClick={startEdit}
                title="편집"
              >
                <div className="icon-wrapper">
                  <FiEdit size={16} />
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="notice-card-edit flex-center"
                aria-label="저장"
                onClick={save}
                disabled={saving}
                title="저장"
              >
                <div className="icon-wrapper">
                  <FiSave size={16} />
                </div>
              </button>
              <button
                type="button"
                className="notice-card-edit flex-center"
                aria-label="취소"
                onClick={cancel}
                disabled={saving}
                title="취소"
              >
                <div className="icon-wrapper">
                  <FiX size={16} />
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {!editing && item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="notice-card-link"
        >
          {item.link}
        </a>
      )}

      {editing ? (
        <>
          {/* ★ 채널 다중 토글 */}
          <div className="form__label body3">채널</div>
          <div className="channel-toggle-row">
            <button
              type="button"
              className={`chip ${
                channels.kakao ? "chip--active" : ""
              } channel kakao`}
              onClick={() => toggleCh("kakao")}
            >
              카카오톡
            </button>
            <button
              type="button"
              className={`chip ${
                channels.discord ? "chip--active" : ""
              } channel discord`}
              onClick={() => toggleCh("discord")}
            >
              디스코드
            </button>
          </div>

          {/* ★ 요약 토글 */}
          <div className="form__label flex-row">
            <div className="body3">요약</div>
            <div className="notify-toggle-wrap">
              <span className="notify-label" aria-hidden>
                {summary ? "ON" : "OFF"}
              </span>
              <div
                role="switch"
                aria-checked={summary}
                aria-label={`요약 ${summary ? "끄기" : "켜기"}`}
                className={`toggle-wrap ${summary ? "on" : "off"}`}
                onClick={() => setSummary(!summary)}
              >
                <Toggle key={summary ? "1" : "0"} defaultChecked={summary} />
              </div>
            </div>
          </div>

          {/* <TagEditor
            label="필터 키워드"
            values={keywords}
            placeholder="새 키워드 입력"
            onChange={setKeywords}
          /> */}
          <div style={{ height: 8 }} />
          {/* <TagEditor
            label="URL 목록"
            values={urls}
            placeholder="새 url 입력"
            onChange={setUrls}
          /> */}
        </>
      ) : (
        <>
          {/* <div className="notice-contour"></div> */}

          {/* 다중 배지 표시 */}
          <div className="notice-card-channel body3">
            알림 채널:&nbsp;
            {item.channels.length === 0 ? (
              <span className="channel kakao">카카오톡</span>
            ) : (
              item.channels.map((ch, i) => (
                <span key={`${ch}-${i}`} className={`channel ${ch}`}>
                  {ch === "discord" ? "디스코드" : "카카오톡"}
                </span>
              ))
            )}
          </div>

          {/* 요약 상태 토글 (읽기 전용) */}
          <div className="notice-card-channel body3">
            <div className="notify-toggle-wrap flex-row">
              <span className="notify-label body3">요약</span>
              <span className="notify-label" aria-hidden>
                {summary ? "ON" : "OFF"}
              </span>
              <div
                className={`toggle-wrap ${
                  item.summary ? "on" : "off"
                } readonly`}
                aria-label={`요약 ${item.summary ? "ON" : "OFF"}`}
              >
                <Toggle defaultChecked={item.summary} />
              </div>
            </div>
          </div>

          {/* 날짜: 백엔드 created_at 우선 */}
          <div className="notice-card-date button2 flex-row">
            <div className="time-icon">
              <IoMdTime />
            </div>
            {item.date}
          </div>
        </>
      )}
    </div>
  );
}

/* ----- 리스트 컨테이너 ----- */
interface NoticeSettingProps {
  selectedDomainId: string | null;
  onSelectDomain: (domainId: string | null) => void;
}

function NoticeSettingInner({ selectedDomainId, onSelectDomain }: NoticeSettingProps) {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, Setting>>({});
  const [domainMap, setDomainMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setBanner(null);
      try {
        // 도메인 목록과 설정 목록을 병렬로 가져오기
        const [domains, list] = await Promise.all([
          fetchMain(),
          fetchSettings(),
        ]);

        // 도메인 ID → 이름 매핑
        const dMap: Record<string, string> = {};
        domains.forEach((d) => (dMap[d.id] = d.name));
        setDomainMap(dMap);

        const m: Record<string, Setting> = {};
        list.forEach((s) => (m[getId(s)] = s));
        setSettingsMap(m);
        setItems(list.map((s) => mapSettingToItem(s, dMap)));
      } catch (e: any) {
        setBanner({
          type: "error",
          text: e?.message || "알림 설정을 불러오지 못했습니다.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdated = (u: Setting) => {
    const id = getId(u);
    setSettingsMap((prev) => ({ ...prev, [id]: u }));
    setItems((prev) =>
      prev.map((it) => (it.id === id ? mapSettingToItem(u, domainMap) : it))
    );
  };

  const handleDeleted = (id: string) => {
    setSettingsMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleCreated = (s: Setting) => {
    const id = getId(s);
    setSettingsMap((prev) => ({ ...prev, [id]: s }));
    setItems((prev) => [...prev, mapSettingToItem(s, domainMap)]); // 맨 밑에 추가
  };

  const empty = useMemo(
    () => !loading && items.length === 0,
    [loading, items.length]
  );

  return (
    <div className="notice-setting-container">
      {banner && (
        <div
          className={`notice-banner ${
            banner.type === "success"
              ? "notice-banner--success"
              : "notice-banner--error"
          }`}
          role="alert"
          style={{ marginBottom: 12 }}
        >
          {banner.text}
        </div>
      )}

      <div className="notice-title heading3">알림 설정 목록</div>

      {loading && (
        <div className="body3" style={{ padding: "12px 4px" }}>
          불러오는 중…
        </div>
      )}
      {empty && (
        <div className="body3" style={{ padding: "12px 4px" }}>
          알림 설정이 없습니다.
        </div>
      )}

      {!loading &&
        items.map((it) => {
          const s = settingsMap[it.id];
          if (!s) return null;
          return (
            <NoticeCard
              key={it.id}
              item={it}
              setting={s}
              isSelected={selectedDomainId === s.domain_id}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onSelect={onSelectDomain}
            />
          );
        })}

      <CreateNotice
        onCreated={handleCreated}
        existingSettings={Object.values(settingsMap)}
      />
    </div>
  );
}

const NoticeSetting: React.FC<NoticeSettingProps> = ({ selectedDomainId, onSelectDomain }) => (
  <ToastProvider>
    <NoticeSettingInner selectedDomainId={selectedDomainId} onSelectDomain={onSelectDomain} />
  </ToastProvider>
);

export default NoticeSetting;
