import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders,
  AxiosRequestHeaders,
} from "axios";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

export const tokenStore = {
  getAccess: () => sessionStorage.getItem(ACCESS_KEY),
  setAccess: (t: string | null) =>
    t
      ? sessionStorage.setItem(ACCESS_KEY, t)
      : sessionStorage.removeItem(ACCESS_KEY),
  getRefresh: () => sessionStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string | null) =>
    t
      ? sessionStorage.setItem(REFRESH_KEY, t)
      : sessionStorage.removeItem(REFRESH_KEY),
};

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const REFRESH_ENDPOINT = "/auth/refresh";

const http = axios.create({
  baseURL: API_BASE || undefined,
});

function asAxiosHeaders(h?: AxiosRequestHeaders | AxiosHeaders): AxiosHeaders {
  return h instanceof AxiosHeaders ? h : new AxiosHeaders(h);
}
function normalizeUrl(u?: string): string {
  try {
    return new URL(u || "", API_BASE || window.location.origin).toString();
  } catch {
    return u || "";
  }
}
function isRefreshUrl(u?: string): boolean {
  const full = normalizeUrl(u);
  try {
    const p = new URL(full).pathname;
    return p.endsWith(REFRESH_ENDPOINT);
  } catch {
    return full.includes(REFRESH_ENDPOINT);
  }
}

if (import.meta.env.DEV) {
  (window as Window & { __http?: typeof http; __API_BASE__?: string }).__http = http;
  (window as Window & { __http?: typeof http; __API_BASE__?: string }).__API_BASE__ = http.defaults.baseURL ?? "";
  console.log("[HTTP] baseURL =", http.defaults.baseURL ?? "(origin)");
  if (!http.defaults.baseURL) {
    console.warn(
      "[HTTP] baseURL 미설정 — 상대경로로 호출됩니다. 프록시(vite.config.ts server.proxy)나 CORS 설정을 확인하세요."
    );
  }
}

http.interceptors.request.use((config) => {
  const at = tokenStore.getAccess();
  if (at) {
    const hdrs = asAxiosHeaders(config.headers);
    hdrs.set("Authorization", `Bearer ${at}`);
    config.headers = hdrs;
  }
  if (import.meta.env.DEV) {
    try {
      // console.log("[HTTP] →", http.getUri(config));
      const h = (config.headers as any) || {};
      // console.log(
      //   "[HTTP]   Authorization:",
      //   h?.Authorization || h?.authorization || "(none)"
      // );
    } catch {}
  }
  return config;
});

let refreshing: Promise<string> | null = null;
let waiters: Array<(t: string | null) => void> = [];

async function doRefresh(): Promise<string> {
  const rt = tokenStore.getRefresh();
  if (!rt) throw new Error("NO_REFRESH_TOKEN");

  const { data } = await axios.post(`${API_BASE}${REFRESH_ENDPOINT}`, {
    refreshToken: rt,
  });
  const newAT = data?.accessToken as string | undefined;
  if (!newAT) throw new Error("INVALID_REFRESH_RESPONSE");
  tokenStore.setAccess(newAT);
  return newAT;
}

const SESSION_EXPIRED_KEY = "__session_expired_message";

export function hardLogout(opts?: { redirectTo?: string | false; reason?: "expired" }) {
  tokenStore.setAccess(null);
  tokenStore.setRefresh(null);
  sessionStorage.removeItem("__oauth_state");

  // 세션 만료로 인한 로그아웃인 경우 메시지 저장
  if (opts?.reason === "expired") {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, "로그인이 만료되었습니다. 다시 로그인 해주세요.");
  }

  if (opts?.redirectTo !== false) {
    const to = typeof opts?.redirectTo === "string" ? opts.redirectTo : "/";
    window.location.replace(to);
  }
}

// 세션 만료 메시지 확인 및 삭제
export function getAndClearSessionExpiredMessage(): string | null {
  const msg = sessionStorage.getItem(SESSION_EXPIRED_KEY);
  if (msg) {
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  }
  return msg;
}

http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = (err.config || {}) as RetriableConfig;
    const status = err.response?.status;

    if (import.meta.env.DEV) {
      console.error("[HTTP] ✖ error", {
        url: normalizeUrl(original.url),
        status,
        code: (err as { code?: string })?.code,
        message: err.message,
        hasResponse: !!err.response,
      });
    }

    if (!err.response) {
      return Promise.reject(err);
    }

    if (isRefreshUrl(original.url)) {
      hardLogout({ redirectTo: "/", reason: "expired" });
      return Promise.reject(err);
    }

    if (status === 403) {
      hardLogout({ redirectTo: "/", reason: "expired" });
      return Promise.reject(err);
    }

    if (status === 401 && !original._retry) {
      if (!tokenStore.getRefresh()) {
        hardLogout({ redirectTo: "/", reason: "expired" });
        return Promise.reject(err);
      }

      if (!refreshing) {
        refreshing = doRefresh()
          .then((newAT) => {
            waiters.forEach((w) => w(newAT));
            return newAT;
          })
          .catch(() => {
            waiters.forEach((w) => w(null));
            hardLogout({ redirectTo: "/", reason: "expired" });
            throw err;
          })
          .finally(() => {
            refreshing = null;
            waiters = [];
          });
      }

      return new Promise((resolve, reject) => {
        waiters.push((token) => {
          if (!token) return reject(err);
          original._retry = true;
          const hdrs = asAxiosHeaders(original.headers);
          hdrs.set("Authorization", `Bearer ${token}`);
          original.headers = hdrs;
          resolve(http(original));
        });
      });
    }

    return Promise.reject(err);
  }
);

export default http;
