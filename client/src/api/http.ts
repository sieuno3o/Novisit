import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

// 새로고침/탭 유지만 원해서 sessionStorage 사용 (localStorage는 장기보관이라 비추천)
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
});

// 요청: Authorization 헤더 자동 부착
http.interceptors.request.use((config) => {
  const at = tokenStore.getAccess();
  if (at) config.headers.Authorization = `Bearer ${at}`;
  return config;
});

// 401 대응: refresh 토큰으로 재발급 → 원요청 재시도(동시요청 큐 처리)
let refreshing = false;
let queue: Array<(t: string | null) => void> = [];

async function refreshAccessToken() {
  const rt = tokenStore.getRefresh();
  if (!rt) throw new Error("NO_REFRESH_TOKEN");
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
    { refreshToken: rt }
  );
  const newAT = data?.accessToken as string | undefined;
  if (!newAT) throw new Error("INVALID_REFRESH_RESPONSE");
  tokenStore.setAccess(newAT);
  return newAT;
}

http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = (err.config || {}) as RetriableConfig;
    if (err.response?.status === 401 && !original._retry) {
      if (!refreshing) {
        refreshing = true;
        try {
          const newAT = await refreshAccessToken();
          queue.forEach((cb) => cb(newAT));
        } catch {
          queue.forEach((cb) => cb(null));
          tokenStore.setAccess(null);
          tokenStore.setRefresh(null);
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
