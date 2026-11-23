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

// ── Loan Products API ──

export const loanProductApi = {
  list: (all?: boolean) =>
    request<any[]>(all ? '/loans/products/all' : '/loans/products'),
  get: (id: string) =>
    request<any>(`/loans/products/${id}`),
  create: (data: any) =>
    request<any>('/loans/products', { method: 'POST', body: data }),
  update: (id: string, data: any) =>
    request<any>(`/loans/products/${id}`, { method: 'PATCH', body: data }),
  toggle: (id: string) =>
    request<any>(`/loans/products/${id}/toggle`, { method: 'PATCH' }),
}

// ── Calculation API ──

export const calculationApi = {
  calculate: (data: { principal: number; interestRate: number; durationMonths: number; interestMethod?: string; processingFee?: number }) =>
    request<any>('/loans/calculate', { method: 'POST', body: data }),
  getMethods: () =>
    request<string[]>('/loans/interest-methods'),
}

// ── Loan Applications API ──

export const loanApplicationApi = {
  apply: (data: { productId: string; principal: number; purpose?: string; repaymentPeriod?: number }) =>
    request<any>('/loans/apply', { method: 'POST', body: data }),
  list: (params?: { memberId?: string; status?: string }) =>
    request<any[]>('/loans/applications', { params }),
  pending: (page?: number, limit?: number) =>
    request<any>('/loans/pending', { params: { page, limit } }),
  all: (page?: number, limit?: number) =>
    request<any>('/loans/all', { params: { page, limit } }),
}

// ── Loan Management API ──

export const loanApi = {
  approve: (id: string) =>
    request<any>(`/loans/${id}/approve`, { method: 'PATCH' }),
  reject: (id: string, reason: string) =>
    request<any>(`/loans/${id}/reject`, { method: 'PATCH', body: { reason } }),
  disburse: (id: string) =>
    request<any>(`/loans/${id}/disburse`, { method: 'POST' }),
  repay: (id: string, data: { amount: number; paymentMethod?: string; reference?: string; notes?: string }) =>
    request<any>(`/loans/${id}/repay`, { method: 'POST', body: data }),
  earlyRepayment: (id: string, amount: number) =>
    request<any>(`/loans/${id}/early-repayment`, { method: 'POST', body: { amount } }),
  getSchedule: (id: string) =>
    request<any[]>(`/loans/${id}/schedule`),
  activeLoans: (page?: number, limit?: number) =>
    request<any>('/loans/active', { params: { page, limit } }),
  overdueLoans: (page?: number, limit?: number) =>
    request<any>('/loans/overdue', { params: { page, limit } }),
}

// ── Penalty API ──

export const penaltyApi = {
  list: (loanId?: string) =>
    request<any[]>('/loans/penalties', { params: { loanId } }),
  waive: (id: string) =>
    request<any>(`/loans/penalties/${id}/waive`, { method: 'POST' }),
  calculate: () =>
    request<any>('/loans/calculate-penalties', { method: 'POST' }),
}

// ── Statistics API ──

export const statisticsApi = {
  overview: () =>
    request<any>('/loans/overview'),
  statistics: () =>
    request<any>('/loans/statistics'),
  officerStatistics: () =>
    request<any>('/loans/officer-statistics'),
  memberStatistics: () =>
    request<any>('/loans/member-statistics'),
}

// ── Report API ──

export const reportApi = {
  portfolio: (format?: string) =>
    request<any>('/loans/reports/portfolio', { params: { format } }),
  interestRevenue: (format?: string) =>
    request<any>('/loans/reports/interest-revenue', { params: { format } }),
  outstanding: (format?: string) =>
    request<any>('/loans/reports/outstanding', { params: { format } }),
  overdue: (format?: string) =>
    request<any>('/loans/reports/overdue', { params: { format } }),
  productPerformance: (format?: string) =>
    request<any>('/loans/reports/product-performance', { params: { format } }),
  recovery: (format?: string) =>
    request<any>('/loans/reports/recovery', { params: { format } }),
}
