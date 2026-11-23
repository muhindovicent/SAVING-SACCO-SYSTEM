const API_BASE = '/api'

interface RequestOptions {
  method?: string
  body?: any
  params?: Record<string, string | number | undefined>
}

function getAuthHeaders(): Record<string, string> {
  return {}
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options

  let url = `${API_BASE}${path}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) searchParams.set(key, String(value))
    })
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  if (res.status === 403) {
    throw new Error('Forbidden')
  }

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const errorMsg = json.error || json.message || `HTTP ${res.status}`
    throw new Error(errorMsg)
  }

  return json.data !== undefined ? json.data : json
}

// ── Auth API ──

export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  register: (data: {
    email: string
    password: string
    role: string
    firstName?: string
    lastName?: string
    phone?: string
    idNumber?: string
    memberNo?: string
  }) =>
    request<{ userId: string; memberId?: string }>('/auth/register', {
      method: 'POST',
      body: data,
    }),
  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),
  me: () =>
    request<{ user: { id: string; email: string; role: string; isActive: boolean; lastLogin?: string } }>('/auth/me', {
      method: 'GET',
    }),
  refresh: () =>
    request<{ message: string }>('/auth/refresh', {
      method: 'POST',
    }),
}

// ── Members API ──

export const membersApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    request<any>('/members', { params }),
  get: (id: string) =>
    request<any>(`/members/${id}`),
  create: (data: {
    memberNo: string
    firstName: string
    lastName: string
    phone?: string
    email?: string
    idNumber?: string
    monthlyIncome?: number
    status?: string
  }) =>
    request<any>('/members', { method: 'POST', body: data }),
}

// ── Savings API ──

export const savingsApi = {
  list: (params?: { page?: number; limit?: number; memberId?: string; status?: string }) =>
    request<any>('/savings', { params }),
  deposit: (data: { accountId: string; amount: number; reference?: string; description?: string; idempotencyKey?: string }) =>
    request<any>('/savings/deposit', { method: 'POST', body: data }),
  withdraw: (data: { accountId: string; amount: number; reference?: string; description?: string; idempotencyKey?: string }) =>
    request<any>('/savings/withdraw', { method: 'POST', body: data }),
  transactions: (params?: { page?: number; limit?: number; accountId?: string; type?: string }) =>
    request<any>('/savings/transactions', { params }),
}

// ── Loans API ──

export const loansApi = {
  list: (params?: { page?: number; limit?: number; memberId?: string; status?: string }) =>
    request<any>('/loans', { params }),
  apply: (data: { loanType: string; amount: number; purpose?: string; durationMonths: number; idempotencyKey?: string }) =>
    request<any>('/loans/apply', { method: 'POST', body: data }),
  approve: (id: string, data?: { interestRate?: number; idempotencyKey?: string }) =>
    request<any>(`/loans/${id}/approve`, { method: 'PATCH', body: data || {} }),
  reject: (id: string, reason: string) =>
    request<any>(`/loans/${id}/reject`, { method: 'PATCH', body: { reason } }),
  disburse: (id: string, data?: { idempotencyKey?: string }) =>
    request<any>(`/loans/${id}/disburse`, { method: 'POST', body: data || {} }),
  repay: (id: string, data: { amount: number; paymentMethod?: string; reference?: string; notes?: string; idempotencyKey?: string }) =>
    request<any>(`/loans/${id}/repay`, { method: 'POST', body: data }),
  getSchedule: (id: string) =>
    request<any[]>(`/loans/${id}/schedule`),
}

// ── Reports API ──

export const reportsApi = {
  overview: () =>
    request<any>('/reports/overview'),
  outstanding: () =>
    request<any>('/reports/outstanding'),
}

// ── Financial Integrity API ──

export const financialApi = {
  verify: (params?: { accountId?: string; loanId?: string }) =>
    request<any>('/financial/verify', { params }),
}
