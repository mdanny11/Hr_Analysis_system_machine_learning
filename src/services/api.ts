import { apiRequest, buildQuery, clearTokens, setTokens } from '@/lib/apiClient';
import type {
  AttritionTrend,
  AuditLog,
  Department,
  Employee,
  EmployeeStats,
  FeatureImportance,
  KpiMetrics,
  PaginatedMeta,
  PredictionModel,
} from '@/lib/types';
import type { User, UserRole } from '@/contexts/AuthContext';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const { data } = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setTokens(data.accessToken, data.refreshToken);
      return data;
    },
    logout: async () => {
      const refreshToken = sessionStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          await apiRequest('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });
        } catch {
          // ignore logout errors
        }
      }
      clearTokens();
    },
    me: async () => {
      const { data } = await apiRequest<User>('/auth/me');
      return data;
    },
  },

  users: {
    list: () => apiRequest<User[]>('/users').then((r) => r.data),
    create: (payload: {
      email: string;
      password: string;
      name: string;
      role: UserRole;
      department?: string;
      avatar?: string;
    }) => apiRequest<User>('/users', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.data),
    update: (id: string, payload: Partial<User & { status?: string; mfaEnabled?: boolean }>) =>
      apiRequest<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }).then((r) => r.data),
    delete: (id: string) => apiRequest<{ message: string }>(`/users/${id}`, { method: 'DELETE' }).then((r) => r.data),
  },

  employees: {
    list: (params: {
      search?: string;
      department?: string;
      risk?: string;
      status?: string;
      page?: number;
      limit?: number;
      sort?: string;
    } = {}) =>
      apiRequest<Employee[]>(`/employees${buildQuery(params)}`).then((r) => ({
        items: r.data,
        meta: r.meta as PaginatedMeta,
      })),
    stats: () => apiRequest<EmployeeStats>('/employees/stats').then((r) => r.data),
    create: (payload: Record<string, unknown>) =>
      apiRequest<Employee>('/employees', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.data),
  },

  departments: {
    list: () => apiRequest<Department[]>('/departments').then((r) => r.data),
  },

  dashboard: {
    kpis: () => apiRequest<KpiMetrics>('/dashboard/kpis').then((r) => r.data),
    byRole: (role: UserRole) => apiRequest<{ role: string; kpis: KpiMetrics; highRiskEmployees: Employee[]; attritionTrends: AttritionTrend[] }>(`/dashboard/${role}`).then((r) => r.data),
    attritionTrends: () => apiRequest<AttritionTrend[]>('/analytics/attrition-trends').then((r) => r.data),
  },

  audit: {
    logs: (search?: string) =>
      apiRequest<AuditLog[]>(`/audit/logs${buildQuery({ search, limit: 100 })}`).then((r) => r.data),
  },

  models: {
    list: () => apiRequest<PredictionModel[]>('/models').then((r) => r.data),
    featureImportance: (modelId: string) =>
      apiRequest<FeatureImportance[]>(`/models/${modelId}/feature-importance`).then((r) => r.data),
    predict: (modelId: string, threshold = 0.5) =>
      apiRequest<{ atRiskEmployees: Employee[]; analyzedCount: number; atRiskCount: number }>(
        `/models/${modelId}/predict`,
        { method: 'POST', body: JSON.stringify({ threshold }) },
      ).then((r) => r.data),
    retrain: (modelId: string) =>
      apiRequest<PredictionModel>(`/models/${modelId}/retrain`, { method: 'POST' }).then((r) => r.data),
    performanceHistory: (modelId: string) =>
      apiRequest<Array<{ recordedAt: string; accuracy: number; f1Score: number }>>(`/models/${modelId}/performance/history`).then((r) => r.data),
  },

  predictions: {
    atRisk: (threshold = 60) =>
      apiRequest<Employee[]>(`/predictions/at-risk${buildQuery({ threshold })}`).then((r) => r.data),
  },

  risk: {
    summary: () => apiRequest<Record<string, number>>('/risk/summary').then((r) => r.data),
    byTenure: () => apiRequest<Array<{ tenure: string; avgRisk: number; count: number }>>('/risk/by-tenure').then((r) => r.data),
    bySalary: () => apiRequest<Array<{ salary: string; avgRisk: number; count: number }>>('/risk/by-salary').then((r) => r.data),
    matrix: () => apiRequest<Array<{ satisfaction: number; performance: number; risk: number; name: string }>>('/risk/matrix').then((r) => r.data),
    byDepartment: () => apiRequest<Array<Record<string, unknown>>>('/risk/by-department').then((r) => r.data),
    highRisk: () => apiRequest<Employee[]>('/risk/high-risk-employees').then((r) => r.data),
  },

  reports: {
    templates: () => apiRequest<Array<Record<string, string>>>('/reports/templates').then((r) => r.data),
    forecast: () => apiRequest<Array<Record<string, unknown>>>('/reports/forecast').then((r) => r.data),
    turnoverCost: () => apiRequest<Array<Record<string, unknown>>>('/reports/turnover-cost').then((r) => r.data),
    correlations: () => apiRequest<Array<Record<string, unknown>>>('/reports/correlations').then((r) => r.data),
    scheduled: () => apiRequest<Array<Record<string, unknown>>>('/reports/scheduled').then((r) => r.data),
  },

  engagement: {
    summary: () => apiRequest<Record<string, number>>('/engagement/summary').then((r) => r.data),
    sentiment: () => apiRequest<Array<Record<string, number | string>>>('/engagement/sentiment').then((r) => r.data),
    dimensions: () => apiRequest<Array<{ dimension: string; score: number }>>('/engagement/dimensions').then((r) => r.data),
    trends: () => apiRequest<Array<{ month: string; score: number; participation: number }>>('/engagement/trends').then((r) => r.data),
    vsAttrition: () => apiRequest<Array<Record<string, unknown>>>('/engagement/vs-attrition').then((r) => r.data),
    surveys: () => apiRequest<Array<Record<string, unknown>>>('/surveys').then((r) => r.data),
    feedback: () => apiRequest<Array<Record<string, unknown>>>('/feedback').then((r) => r.data),
  },

  alerts: {
    list: () => apiRequest<Array<Record<string, unknown>>>('/alerts').then((r) => r.data),
    acknowledge: (id: string) =>
      apiRequest<Record<string, unknown>>(`/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'acknowledged' }),
      }).then((r) => r.data),
    detect: () => apiRequest<{ alertsCreated: number }>('/alerts/detect', { method: 'POST' }).then((r) => r.data),
    rules: () => apiRequest<Array<Record<string, unknown>>>('/alerts/rules').then((r) => r.data),
  },

  retention: {
    strategies: () => apiRequest<Array<Record<string, unknown>>>('/retention/strategies').then((r) => r.data),
    interventionQueue: () => apiRequest<Employee[]>('/interventions/queue').then((r) => r.data),
  },

  benchmarks: {
    industry: (industry = 'technology') =>
      apiRequest<Record<string, unknown>>(`/benchmarks/industry${buildQuery({ industry })}`).then((r) => r.data),
    competitors: () => apiRequest<Array<Record<string, unknown>>>('/benchmarks/competitors').then((r) => r.data),
    bestPractices: () => apiRequest<Array<Record<string, unknown>>>('/benchmarks/best-practices').then((r) => r.data),
  },

  dataQuality: {
    get: () => apiRequest<Record<string, number>>('/data-quality').then((r) => r.data),
    missing: () => apiRequest<Array<Record<string, unknown>>>('/data-quality/missing').then((r) => r.data),
    runPipeline: () => apiRequest<Record<string, unknown>>('/pipelines/run', { method: 'POST' }).then((r) => r.data),
  },
};
