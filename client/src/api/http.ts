import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

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

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // withCredentials: true, // 쿠키 전략으로 변경 시 주석 해제
});

// === 요청 인터셉터: 액세스 토큰 자동 부착 ===
http.interceptors.request.use((config) => {
  const at = tokenStore.getAccess();
  if (at) config.headers.Authorization = `Bearer ${at}`;
  return config;
});

// === 동시요청 큐 기반 401 → refresh 처리 ===
let refreshing = false;
let queue: Array<(t: string | null) => void> = [];

async function doRefresh(): Promise<string> {
  const rt = tokenStore.getRefresh();
  if (!rt) throw new Error("NO_REFRESH_TOKEN");

  // refresh는 순환 방지 위해 기본 axios 사용
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
    { refreshToken: rt }
    // , { withCredentials: true } // 쿠키 전략이면 사용
  );

  const newAT = data?.accessToken as string | undefined;
  if (!newAT) throw new Error("INVALID_REFRESH_RESPONSE");
  tokenStore.setAccess(newAT);
  return newAT;
}

export function hardLogout(opts?: { redirectTo?: string | false }) {
  // 1) 토큰/임시 상태 정리
  tokenStore.setAccess(null);
  tokenStore.setRefresh(null);
  sessionStorage.removeItem("__oauth_state");

  // 2) (옵션) 강제 리다이렉트
  if (opts?.redirectTo !== false) {
    const to =
      typeof opts?.redirectTo === "string" ? opts.redirectTo : "/login";
    window.location.replace(to); // 히스토리 대체
  }
}

// === 응답 인터셉터: 401 처리 ===
http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = (err.config || {}) as RetriableConfig;
    const status = err.response?.status;

    // refresh 호출 자체는 재시도 금지
    const isRefreshCall =
      typeof original.url === "string" &&
      original.url.includes("/auth/refresh");
    if (isRefreshCall) {
      hardLogout(); // 실패 시 즉시 로그아웃
      return Promise.reject(err);
    }

    // 일반 요청 401 → refresh 후 재시도
    if (status === 401 && !original._retry) {
      if (!refreshing) {
        refreshing = true;
        try {
          const newAT = await doRefresh();
          queue.forEach((cb) => cb(newAT));
        } catch {
          queue.forEach((cb) => cb(null));
          hardLogout(); // RT까지 무효 → 하드 로그아웃
        } finally {
          refreshing = false;
          queue = [];
        }
      }

      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) return reject(err);
          original._retry = true;
          original.headers = original.headers || {};
          (original.headers as any).Authorization = `Bearer ${token}`;
          resolve(http(original));
        });
      });
    }

    return Promise.reject(err);
  }
);

export default http;
