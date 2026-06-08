import axios from "axios";
import type { AuthResponse, User } from "@canvas/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "canvas_access_token";

let accessToken: string | null = sessionStorage.getItem(TOKEN_KEY);
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function getAccessToken() {
  return accessToken;
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes("/auth/login") &&
      !original.url?.includes("/auth/register") &&
      !original.url?.includes("/auth/refresh")
    ) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = api
          .post<AuthResponse>("/auth/refresh")
          .then((res) => {
            setAccessToken(res.data.accessToken);
            return accessToken;
          })
          .catch(() => {
            setAccessToken(null);
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: string })?.error ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export async function login(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  setAccessToken(data.accessToken);
  return data;
}

export async function register(email: string, name: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/register", {
    email,
    name,
    password,
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
  setAccessToken(null);
}

export async function fetchMe(): Promise<User | null> {
  try {
    const { data } = await api.get<{ user: User }>("/auth/me");
    return data.user;
  } catch {
    try {
      const { data } = await api.post<AuthResponse>("/auth/refresh");
      setAccessToken(data.accessToken);
      return data.user;
    } catch {
      setAccessToken(null);
      return null;
    }
  }
}

export const WS_URL =
  import.meta.env.VITE_WS_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");
