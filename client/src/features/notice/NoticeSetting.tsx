import React, { useEffect, useMemo, useState } from "react";
import "../../../public/assets/style/_flex.scss";
import "../../../public/assets/style/_typography.scss";
import "./NoticeSetting.scss";
import { FiEdit, FiSave, FiX, FiTrash2 } from "react-icons/fi";
import { IoMdTime } from "react-icons/io";
import CreateNotice from "./CreateNotice";
import {
  fetchSettings,
  updateSetting,
  deleteSetting,
  Setting,
  ApiError,
  Message,
  Channel,
} from "../../api/settingsAPI";
import { ToastProvider, useToast } from "../../components/Toast";

interface Tag {
  label: string;
}

interface NoticeItem {
  id: string;
  title: string;
  tags: Tag[];
  channels: Channel[]; // ★ 다중
  date: string;
  link?: string;
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

const mapSettingToItem = (s: Setting): NoticeItem => {
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
    tags: (s.filter_keywords ?? []).map((k) => ({ label: k })),
    channels,
    date: dateText,
    link: s.url_list?.[0],
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
  onUpdated,
  onDeleted,
}: {
  item: NoticeItem;
  setting: Setting;
  onUpdated: (updated: Setting) => void;
  onDeleted: (id: string) => void;
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

  return (
    <div className={`notice-card ${editing ? "notice-card--editing" : ""}`}>
      <div className="notice-card-header flex-between">
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
          <div className="form__label" style={{ marginTop: 8 }}>
            채널
          </div>
          <div className="channel-toggle-row" style={{ marginBottom: 8 }}>
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
          <div className="notice-card-tags">
            {item.tags.map((t, i) => (
              <span className="tag" key={i}>
                {t.label}
              </span>
            ))}
          </div>
          <div className="notice-contour"></div>

          {/* ★ 다중 배지 표시 */}
          <div className="notice-card-channel body3">
            알림 채널:&nbsp;
            {item.channels.length === 0 ? (
              <span className="channel kakao">카카오톡</span> // fallback
            ) : (
              item.channels.map((ch, i) => (
                <span
                  key={`${ch}-${i}`}
                  className={`channel ${ch}`}
                  style={{ marginRight: 6 }}
                >
                  {ch === "discord" ? "디스코드" : "카카오톡"}
                </span>
              ))
            )}
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
function NoticeSettingInner() {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, Setting>>({});
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
        const list = await fetchSettings();
        const m: Record<string, Setting> = {};
        list.forEach((s) => (m[getId(s)] = s));
        setSettingsMap(m);
        setItems(list.map(mapSettingToItem));
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
      prev.map((it) => (it.id === id ? mapSettingToItem(u) : it))
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
    setItems((prev) => [...prev, mapSettingToItem(s)]); // 맨 밑에 추가
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
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
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

const NoticeSetting: React.FC = () => (
  <ToastProvider>
    <NoticeSettingInner />
  </ToastProvider>
);

export default NoticeSetting;
