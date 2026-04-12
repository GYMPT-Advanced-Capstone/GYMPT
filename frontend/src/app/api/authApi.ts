const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

export interface TokenResponse {
  success: boolean;
  message: string;
  token_type: string;
  access_token: string;
  refresh_token: string;
}

export interface CheckResponse {
  available: boolean;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  nickname: string;
  birth_date?: string | null;
  weekly_target?: number | null;
  created_at?: string;
}

export const tokenStorage = {
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('gympt_access_token', accessToken);
    localStorage.setItem('gympt_refresh_token', refreshToken);
  },
  getAccessToken: (): string | null =>
    localStorage.getItem('gympt_access_token'),
  getRefreshToken: (): string | null =>
    localStorage.getItem('gympt_refresh_token'),
  clearTokens: () => {
    localStorage.removeItem('gympt_access_token');
    localStorage.removeItem('gympt_refresh_token');
    localStorage.removeItem('gympt_user_name');
    localStorage.removeItem('gympt_goal_ids');
  },
  setUserName: (name: string) =>
    localStorage.setItem('gympt_user_name', name),
  getUserName: (): string =>
    localStorage.getItem('gympt_user_name') ?? '',
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data: TokenResponse = await res.json();
    tokenStorage.setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false,
  _retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (withAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && withAuth && _retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, withAuth, false);
    } else {
      tokenStorage.clearTokens();
      window.location.href = '/';
      throw new Error('세션이 만료됐어요. 다시 로그인해주세요.');
    }
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 422 && Array.isArray(data.detail)) {
      const msg = data.detail.map((e: { msg: string }) => e.msg).join(', ');
      throw new Error(msg);
    }
    const msg =
      typeof data.detail === 'string'
        ? data.detail
        : data.message ?? '요청에 실패했어요. 다시 시도해주세요.';
    throw new Error(msg);
  }

  return data as T;
}

export { request };

export const authApi = {
  signup: (data: {
    email: string;
    name: string;
    nickname: string;
    pw: string;
  }) =>
    request<UserResponse>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; pw: string }) =>
    request<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: (refreshToken: string) =>
    request<void>(
      '/api/v1/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
      true,
    ),

  sendEmailVerification: (email: string) =>
    request<void>('/api/v1/auth/email-verify/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyEmailCode: (email: string, code: string) =>
    request<void>('/api/v1/auth/email-verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  checkEmail: (email: string) =>
    request<CheckResponse>(
      `/api/v1/auth/check-email?email=${encodeURIComponent(email)}`,
    ),

  checkNickname: (nickname: string) =>
    request<CheckResponse>(
      `/api/v1/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`,
    ),

  refreshToken: (refreshToken: string) =>
    request<TokenResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  requestPasswordReset: (email: string) =>
    request<void>('/api/v1/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<void>('/api/v1/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email, code, new_password: newPassword }),
    }),
};
