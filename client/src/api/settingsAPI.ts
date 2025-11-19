// src/api/settingsAPI.ts
import http from "./http";

/** 두 채널만 허용 */
export type Channel = "kakao" | "discord";

/** 생성 요청 — channel은 반드시 배열 */
export type CreateSettingRequest = {
  domain_id: string;
  name: string;
  url_list: string[];
  filter_keywords: string[];
  channel: Channel[]; // ✅ 배열 고정
};

/** 메시지 — platform도 배열 유지 */
export type Message = {
  id: string;
  title?: string;
  contents: string;
  link?: string;
  sended_at: string; // ISO8601
  platform: Channel[]; // ["kakao","discord"]
};

/** 설정 — channel은 항상 배열 */
export type Setting = {
  id?: string;
  _id?: string;
  user_id?: string;
  domain_id: string;
  name: string;
  url_list: string[];
  filter_keywords: string[];
  channel: Channel[]; // ✅ 배열 고정
  created_at?: string;
  messages: Message[];
  [extra: string]: any;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ---------------- utils ---------------- */
const normList = (v: any) => (Array.isArray(v) ? v : []);
const getId = (s: any) => s?.id ?? s?._id;
const toLower = (x: any) =>
  String(x ?? "")
    .trim()
    .toLowerCase();

/**
 * channel/ platform을 안전한 배열로 정규화(문자열이 오더라도 최소 방어).
 * 서버는 배열을 준다고 가정하지만, 클라이언트 안정성을 위해 남겨둠.
 */
const ensureChannelArray = (v: any): Channel[] => {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  return raw
    .map((x) => toLower(x))
    .filter((x) => x === "kakao" || x === "discord") as Channel[];
};

/** 메시지 정규화 (title/link/platform 포함) */
const normMessages = (arr: any[]): Message[] =>
  (Array.isArray(arr) ? arr : []).map((m) => ({
    id: String(m?.id ?? m?._id ?? ""),
    title: m?.title,
    contents: String(m?.contents ?? ""),
    link: m?.link ? String(m.link) : undefined,
    sended_at: String(m?.sended_at ?? m?.sent_at ?? ""),
    platform: ensureChannelArray(m?.platform ?? m?.channel),
  }));

/* ---------------- API ---------------- */

/** 생성: POST /settings — payload 그대로 전송 */
export async function createSetting(
  payload: CreateSettingRequest
): Promise<Setting> {
  try {
    const body = { ...payload, channel: ensureChannelArray(payload.channel) };

    const { data } = await http.post("/settings", body, {
      headers: { "Content-Type": "application/json" },
    });

    const picked = data?.settings ?? data?.setting ?? null;
    if (!picked || typeof picked !== "object") {
      throw new ApiError(
        200,
        "서버 응답 형식이 올바르지 않습니다. (settings 없음)"
      );
    }

    return {
      ...(picked as any),
      id: getId(picked),
      url_list: normList(picked?.url_list),
      filter_keywords: normList(picked?.filter_keywords),
      messages: normMessages(picked?.messages),
      channel: ensureChannelArray(picked?.channel),
      created_at: picked?.created_at,
    } as Setting;
  } catch (e: any) {
    const status = e?.response?.status ?? 0;
    const msg =
      e?.response?.data?.message ??
      (status === 400
        ? "잘못된 요청입니다."
        : status === 401
        ? "인증이 필요합니다."
        : status === 403
        ? "권한이 없습니다."
        : status === 404
        ? "엔드포인트를 찾을 수 없습니다. (베이스URL/프리픽스 확인)"
        : "알 수 없는 오류가 발생했어요.");
    throw new ApiError(status, msg);
  }
}

/** 목록 조회: GET /settings — { settings: [...] } */
export async function fetchSettings(): Promise<Setting[]> {
  try {
    const { data } = await http.get("/settings");
    const list: any[] = Array.isArray(data?.settings) ? data.settings : [];

    return list.map((it) => ({
      ...(it ?? {}),
      id: getId(it),
      url_list: normList(it?.url_list),
      filter_keywords: normList(it?.filter_keywords),
      messages: normMessages(it?.messages),
      channel: ensureChannelArray(it?.channel),
      created_at: it?.created_at,
    })) as Setting[];
  } catch (e: any) {
    const status = e?.response?.status ?? 0;
    const msg =
      e?.response?.data?.message ??
      (status === 401
        ? "토큰이 필요합니다."
        : status === 403
        ? "유효하지 않은 AccessToken"
        : status === 500
        ? "알림 설정 조회 중 오류가 발생했습니다."
        : "알 수 없는 오류가 발생했어요.");
    throw new ApiError(status, msg);
  }
}

/** 수정: PUT /settings/{id} — { updatedSetting: {...} } */
export type UpdateSettingRequest = Partial<
  Pick<Setting, "name" | "filter_keywords" | "url_list" | "channel">
>;

export async function updateSetting(
  id: string,
  payload: UpdateSettingRequest
): Promise<Setting> {
  try {
    const body =
      "channel" in payload && payload.channel
        ? { ...payload, channel: ensureChannelArray(payload.channel) }
        : payload;

    const { data } = await http.put(`/settings/${id}`, body, {
      headers: { "Content-Type": "application/json" },
    });

    const picked =
      data?.updatedSetting ?? data?.settings ?? data?.setting ?? null;
    if (!picked || typeof picked !== "object") {
      throw new ApiError(
        200,
        "서버 응답 형식이 올바르지 않습니다. (updatedSetting 없음)"
      );
    }

    return {
      ...(picked as any),
      id: getId(picked) ?? id,
      url_list: normList(picked?.url_list),
      filter_keywords: normList(picked?.filter_keywords),
      messages: normMessages(picked?.messages),
      channel: ensureChannelArray(picked?.channel),
      created_at: picked?.created_at,
    } as Setting;
  } catch (e: any) {
    const status = e?.response?.status ?? 0;
    const msg =
      e?.response?.data?.message ??
      (status === 401
        ? "토큰이 필요합니다."
        : status === 403
        ? "유효하지 않은 AccessToken"
        : status === 404
        ? "해당 알림 설정을 찾을 수 없습니다."
        : status === 500
        ? "알림 설정 수정에 실패했습니다."
        : "알 수 없는 오류가 발생했어요.");
    throw new ApiError(status, msg);
  }
}

export async function deleteSetting(id: string): Promise<void> {
  try {
    await http.delete(`/settings/${id}`);
  } catch (e: any) {
    const status = e?.response?.status ?? 0;
    const msg =
      e?.response?.data?.message ??
      (status === 401
        ? "인증이 필요합니다."
        : status === 403
        ? "권한이 없습니다."
        : status === 404
        ? "해당 알림 설정을 찾을 수 없습니다."
        : "알림 설정 삭제에 실패했습니다.");
    throw new ApiError(status, msg);
  }
}
