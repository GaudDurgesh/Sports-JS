import { api } from "./client";
import type { ApiResponse, User } from "@/types";

export async function login(email: string, password: string) {
  const res = await api.post<ApiResponse<{ token: string; user: User }>>(
    "/auth/login",
    { email, password },
  );
  return res.data.data;
}

export async function register(name: string, email: string, password: string) {
  const res = await api.post<ApiResponse<{ token: string; user: User }>>(
    "/auth/signup",
    { name, email, password },
  );
  return res.data.data;
}

export async function logoutApi() {
  await api.post("/auth/logout");
}

export async function getMe(): Promise<User> {
  const res = await api.get<ApiResponse<User>>("/auth/me");
  return res.data.data;
}
