import { apiRequest, buildQuery, clearTokens, downloadFile, ML_TRAINING_TIMEOUT_MS, setTokens, uploadFile } from '@/lib/apiClient';
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

export interface AccessRequest {
  id: string;
  referenceId: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  requestedRole: UserRole;
  justification: string;
  managerEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
}

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
    updateProfile: (payload: { name?: string; mfaEnabled?: boolean }) =>
      apiRequest<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }).then((r) => r.data),
    changePassword: (currentPassword: string, newPassword: string) =>
      apiRequest<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }).then((r) => r.data),
    refresh: async () => {
      const refreshToken = sessionStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');
      const { data } = await apiRequest<LoginResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      setTokens(data.accessToken, data.refreshToken);
      return data;
    },
    forgotPassword: (email: string) =>
      apiRequest<{ message: string; devCode?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }).then((r) => r.data),
    verifyCode: (email: string, code: string) =>
      apiRequest<{ valid: boolean }>('/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      }).then((r) => r.data),
    resetPassword: (email: string, code: string, newPassword: string) =>
      apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      }).then((r) => r.data),
    submitAccessRequest: (payload: {
      name: string;
      email: string;
      department: string;
      jobTitle: string;
      requestedRole: UserRole;
      justification: string;
      managerEmail: string;
    }) =>
      apiRequest<{ referenceId: string; status: string; message: string }>('/access-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
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
    resetPassword: (id: string, password: string) =>
      apiRequest<{ message: string; user: User }>(`/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }).then((r) => r.data),
    export: () => downloadFile('/users/export', 'users_export.csv'),
  },

  accessRequests: {
    list: (status?: 'pending' | 'approved' | 'rejected') =>
      apiRequest<AccessRequest[]>(`/access-requests${buildQuery({ status })}`).then((r) => r.data),
    get: (id: string) => apiRequest<AccessRequest>(`/access-requests/${id}`).then((r) => r.data),
    approve: (id: string, payload: { role: UserRole; password: string }) =>
      apiRequest<{ request: AccessRequest; user: User; message: string }>(`/access-requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
    reject: (id: string, payload: { reason?: string }) =>
      apiRequest<{ request: AccessRequest; message: string }>(`/access-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
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
    export: (params: {
      search?: string;
      department?: string;
      risk?: string;
      status?: string;
      format?: 'csv' | 'xlsx';
    } = {}) => {
      const format = params.format ?? 'csv';
      const filename = format === 'xlsx' ? 'employees_export.xlsx' : 'employees_export.csv';
      return downloadFile('/employees/export', filename, { ...params, format });
    },
    importTemplate: (format: 'csv' | 'xlsx' = 'csv') =>
      downloadFile(
        '/employees/import/template',
        format === 'xlsx' ? 'employee_import_template.xlsx' : 'employee_import_template.csv',
        { format },
      ),
    import: (file: File) =>
      uploadFile<{ created: number; skipped: number; errors: { row: number; message: string }[] }>(
        '/employees/import',
        file,
      ),
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
    compliance: () =>
      apiRequest<Array<{
        id: string;
        category: string;
        item: string;
        status: string;
        lastReviewedAt?: string | null;
      }>>('/audit/compliance').then((r) => r.data),
    privacy: () =>
      apiRequest<{
        employeeRecords: number;
        activeEmployees: number;
        dataCategories: number;
        retentionPeriod: string;
        sensitiveFields: number;
        highRiskEmployees: number;
      }>('/audit/privacy').then((r) => r.data),
    export: (search?: string) => downloadFile('/audit/export', 'audit_logs_export.csv', { search }),
  },

  settings: {
    security: () =>
      apiRequest<{
        mfaRequired: boolean;
        passwordMinLength: number;
        requireSpecialChars: boolean;
        requireNumbers: boolean;
        maxLoginAttempts: number;
        sessionTimeoutMinutes: number;
      }>('/settings/security').then((r) => r.data),
    updateSecurity: (payload: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>('/settings/security', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
    notifications: () =>
      apiRequest<{
        emailNotifications: boolean;
        riskAlerts: boolean;
        weeklyDigest: boolean;
        systemUpdates: boolean;
      }>('/settings/notifications').then((r) => r.data),
    updateNotifications: (payload: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>('/settings/notifications', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
    system: () =>
      apiRequest<{
        language: string;
        timezone: string;
        dateFormat: string;
        dataRetentionDays: string;
      }>('/settings/system').then((r) => r.data),
    updateSystem: (payload: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>('/settings/system', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
    integrations: () =>
      apiRequest<Array<{
        id: string;
        key: string;
        name: string;
        description: string;
        status: string;
        configurable: boolean;
      }>>('/settings/integrations').then((r) => r.data),
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
      apiRequest<
        PredictionModel & {
          trainingMetrics?: {
            cvF1: number;
            trainingSamples: number;
            positiveRate: number;
            testAccuracy: number;
            testF1: number;
            testAuc: number;
          };
        }
      >(`/models/${modelId}/retrain`, { method: 'POST' }, ML_TRAINING_TIMEOUT_MS).then((r) => r.data),
    retrainAll: () =>
      apiRequest<
        Array<
          PredictionModel & {
            trainingMetrics?: {
              cvF1: number;
              trainingSamples: number;
              positiveRate: number;
              testAccuracy: number;
              testF1: number;
              testAuc: number;
            };
          }
        >
      >('/models/retrain-all', { method: 'POST' }, ML_TRAINING_TIMEOUT_MS).then((r) => r.data),
    trainAndPredict: (threshold = 0.5) =>
      apiRequest<{
        recommendedModel: PredictionModel;
        trainedModels: PredictionModel[];
        predictions: { atRiskEmployees: Employee[]; analyzedCount: number; atRiskCount: number };
      }>('/models/train-and-predict', {
        method: 'POST',
        body: JSON.stringify({ threshold }),
      }, ML_TRAINING_TIMEOUT_MS).then((r) => r.data),
    performanceHistory: (modelId: string) =>
      apiRequest<Array<{
        recordedAt: string;
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
        auc: number;
      }>>(`/models/${modelId}/performance/history`).then((r) => r.data),
    modelVersions: (modelId: string) =>
      apiRequest<Array<{
        id: string;
        version: string;
        status: string;
        deployedAt: string | null;
        accuracy: number | null;
        changes: string;
      }>>(`/models/${modelId}/versions`).then((r) => r.data),
    featureDrift: (modelId: string) =>
      apiRequest<Array<{
        feature: string;
        baseline: number;
        current: number;
        drift: number;
        status: 'ok' | 'warning' | 'alert';
      }>>(`/models/${modelId}/drift`).then((r) => r.data),
    predictionFeedback: (modelId: string, threshold = 70) =>
      apiRequest<{
        threshold: number;
        truePositives: number;
        falsePositives: number;
        trueNegatives: number;
        falseNegatives: number;
        overallAccuracy: number;
        precision: number;
        recall: number;
        pendingFeedback: number;
        predictionsMade: number;
        verifiedOutcomes: number;
      }>(`/models/${modelId}/feedback${buildQuery({ threshold })}`).then((r) => r.data),
    comparison: () =>
      apiRequest<{
        modelA: PredictionModel | null;
        modelB: PredictionModel | null;
        metrics: Array<{
          metric: string;
          modelA: number;
          modelB: number;
          winner: 'A' | 'B';
          diff: string;
        }>;
        overallWinner: 'A' | 'B';
      }>('/models/comparison/ab-test').then((r) => r.data),
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
    create: (payload: {
      name: string;
      type: string;
      dateRangeStart?: string;
      dateRangeEnd?: string;
      metrics?: Record<string, unknown>;
    }) =>
      apiRequest<{ id: string; name: string; status: string }>('/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
    preview: (payload: {
      name?: string;
      type?: string;
      dateRangeStart?: string;
      dateRangeEnd?: string;
      metrics?: string[];
    } = {}) =>
      apiRequest<{
        kpis: Record<string, number>;
        departments: Array<Record<string, string | number>>;
        pages: number;
      }>('/reports/preview', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.data),
    export: (params: {
      templateId?: string;
      reportType?: string;
      reportName?: string;
      startDate?: string;
      endDate?: string;
      sections?: string;
      format?: string;
    } = {}) => {
      const format = params.format || 'csv';
      const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      const name = params.reportName
        ? `${params.reportName.replace(/[^a-zA-Z0-9-_]/g, '_')}_export.${ext}`
        : `report_export.${ext}`;
      const expectedContentType =
        format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : format === 'pdf'
            ? 'application/pdf'
            : 'text/csv';
      return downloadFile('/reports/export', name, params, { expectedContentType });
    },
    forecast: () => apiRequest<Array<Record<string, unknown>>>('/reports/forecast').then((r) => r.data),
    turnoverCost: () =>
      apiRequest<{
        breakdown: Array<{ category: string; cost: number; percentage: number }>;
        avgTurnoverCost: number;
        monthlyTurnover: number;
        annualImpact: number;
        currency: string;
      }>('/reports/turnover-cost').then((r) => r.data),
    correlations: () => apiRequest<Array<Record<string, unknown>>>('/reports/correlations').then((r) => r.data),
    scheduled: () => apiRequest<Array<Record<string, unknown>>>('/reports/scheduled').then((r) => r.data),
  },

  notifications: {
    list: () =>
      apiRequest<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>>(
        '/notifications',
      ).then((r) => r.data),
    markRead: (id: string) =>
      apiRequest<{ id: string; read: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }).then((r) => r.data),
    markAllRead: () =>
      apiRequest<{ message: string }>('/notifications/mark-all-read', { method: 'POST' }).then((r) => r.data),
  },

  engagement: {
    summary: () => apiRequest<Record<string, number>>('/engagement/summary').then((r) => r.data),
    sentiment: () => apiRequest<Array<Record<string, number | string>>>('/engagement/sentiment').then((r) => r.data),
    dimensions: () => apiRequest<Array<{ dimension: string; score: number }>>('/engagement/dimensions').then((r) => r.data),
    trends: () => apiRequest<Array<{ month: string; score: number; participation: number }>>('/engagement/trends').then((r) => r.data),
    vsAttrition: () =>
      apiRequest<{
        points: Array<{ engagement: number; attritionRisk: number; name: string }>;
        correlation: number | null;
      }>('/engagement/vs-attrition').then((r) => r.data),
    surveys: () => apiRequest<Array<Record<string, unknown>>>('/surveys').then((r) => r.data),
    surveyResponses: (surveyId: string) =>
      apiRequest<{
        surveyId: string;
        title: string;
        anonymous: boolean;
        responseCount: number;
        submissions: Array<{
          id: string;
          submittedAt: string | null;
          respondent: string;
          answers: Array<{
            questionId: string;
            question: string;
            type: string;
            answer: unknown;
          }>;
        }>;
      }>(`/surveys/${surveyId}/responses`).then((r) => r.data),
    feedback: () => apiRequest<Array<Record<string, unknown>>>('/feedback').then((r) => r.data),
    createSurvey: (payload: {
      title: string;
      type: string;
      audience: string;
      anonymous: boolean;
      questions: Array<{ text: string; type: string }>;
    }) =>
      apiRequest<{ id: string; message: string }>('/surveys', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
    sendPulse: () =>
      apiRequest<{ id: string; message: string }>('/surveys/pulse', { method: 'POST' }).then((r) => r.data),
    sendQuickSurvey: (payload: { question: string; response_type: string }) =>
      apiRequest<{ id: string; message: string }>('/surveys/quick', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
    submitFeedback: (payload: { category?: string; message: string; anonymous?: boolean; sentiment?: string }) =>
      apiRequest<{ id: string; message: string; sentiment: string }>('/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
    getPublicSurvey: (token: string) =>
      apiRequest<{
        title: string;
        anonymous: boolean;
        employeeName?: string | null;
        alreadyResponded: boolean;
        questions: Array<{ id: string; text: string; type: string }>;
      }>(`/surveys/public/${token}`).then((r) => r.data),
    submitPublicSurvey: (token: string, answers: Record<string, string | number>) =>
      apiRequest<{ message: string; submittedAt: string }>(`/surveys/public/${token}/respond`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }).then((r) => r.data),
  },

  alerts: {
    list: () => apiRequest<Array<Record<string, unknown>>>('/alerts').then((r) => r.data),
    summary: () =>
      apiRequest<{ critical: number; warning: number; pending: number; resolvedToday: number }>(
        '/alerts/summary',
      ).then((r) => r.data),
    acknowledge: (id: string) =>
      apiRequest<Record<string, unknown>>(`/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'acknowledged' }),
      }).then((r) => r.data),
    detect: () =>
      apiRequest<{ alertsCreated: number; alertsUpdated: number; alertsResolved: number }>(
        '/alerts/detect',
        { method: 'POST' },
      ).then((r) => r.data),
    rules: () => apiRequest<Array<Record<string, unknown>>>('/alerts/rules').then((r) => r.data),
    updateRule: (id: string, payload: { enabled?: boolean; threshold?: number }) =>
      apiRequest<Record<string, unknown>>(`/alerts/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((r) => r.data),
  },

  retention: {
    strategies: () => apiRequest<Array<Record<string, unknown>>>('/retention/strategies').then((r) => r.data),
    interventionQueue: () => apiRequest<Employee[]>('/interventions/queue').then((r) => r.data),
    succession: () =>
      apiRequest<
        Array<{
          targetRole: string;
          currentIncumbent: string | null;
          candidates: Array<{
            id: string;
            employeeId: string;
            name: string;
            readinessScore: number;
            notes?: string | null;
          }>;
        }>
      >('/succession').then((r) => r.data),
    actionItems: () =>
      apiRequest<
        Array<{
          id: string;
          title: string;
          description?: string | null;
          status: string;
          priority: string;
          dueDate?: string | null;
          assignee?: string | null;
          employee?: string | null;
        }>
      >('/action-items').then((r) => r.data),
  },

  benchmarks: {
    industry: (industry = 'technology') =>
      apiRequest<Record<string, unknown>>(`/benchmarks/industry${buildQuery({ industry })}`).then((r) => r.data),
    competitors: () => apiRequest<Array<Record<string, unknown>>>('/benchmarks/competitors').then((r) => r.data),
    bestPractices: () => apiRequest<Array<Record<string, unknown>>>('/benchmarks/best-practices').then((r) => r.data),
  },

  dataQuality: {
    get: (threshold = 2.5) =>
      apiRequest<{
        summary: {
          qualityScore: number;
          fieldsValidated: number;
          missingValues: number;
          outliersDetected: number;
          employeeCount: number;
          completeness: number;
          accuracy: number;
          consistency: number;
          lastSnapshotAt?: string;
        };
        fields: Array<{
          field: string;
          completeness: number;
          validity: number;
          uniqueness: number;
          status: string;
        }>;
        missing: Array<{ field: string; missing: number; percentage: number }>;
        outliers: {
          threshold: number;
          points: Array<Record<string, unknown>>;
          outliers: Array<Record<string, unknown>>;
          outlierCount: number;
        };
      }>(`/data-quality${buildQuery({ threshold })}`).then((r) => r.data),
    missing: () =>
      apiRequest<{
        distribution: Array<{ field: string; missing: number; percentage: number }>;
        strategies: Array<{ field: string; strategy: string; action: string; missingCount: number }>;
      }>('/data-quality/missing').then((r) => r.data),
    outliers: (threshold = 2.5) =>
      apiRequest<{
        threshold: number;
        points: Array<{ x: number; y: number; z: number; employeeId: string; name: string; currency: string; isOutlier: boolean }>;
        outliers: Array<{ id: string; field: string; value: number; currency: string; reason: string }>;
        outlierCount: number;
      }>(`/data-quality/outliers${buildQuery({ threshold })}`).then((r) => r.data),
    features: () =>
      apiRequest<Array<{ id: string; name: string; description: string; enabled: boolean; transformation?: string }>>(
        '/data-quality/features',
      ).then((r) => r.data),
    updateFeatures: (features: Array<{ id: string; enabled: boolean }>) =>
      apiRequest<Array<{ id: string; name: string; description: string; enabled: boolean }>>('/data-quality/features', {
        method: 'PATCH',
        body: JSON.stringify({ features }),
      }).then((r) => r.data),
    impute: () =>
      apiRequest<{ updatedEmployees: number; message: string }>('/data-quality/impute', { method: 'POST' }).then((r) => r.data),
    handleOutliers: (threshold = 2.5) =>
      apiRequest<{ adjustedEmployees: number; message: string }>(
        `/data-quality/outliers/handle${buildQuery({ threshold })}`,
        { method: 'POST' },
      ).then((r) => r.data),
    latestPipeline: () =>
      apiRequest<{ runId?: string; status?: string; steps: Array<{ name: string; status: string; duration?: string; detail?: string }> }>(
        '/pipelines/latest',
      ).then((r) => r.data),
    runPipeline: (payload: { outlierThreshold?: number; features?: Array<{ id: string; enabled: boolean }> } = {}) =>
      apiRequest<{
        runId: string;
        status: string;
        steps: Array<{ name: string; status: string; duration?: string; detail?: string }>;
        summary: Record<string, number>;
        durationSeconds?: number;
        duration_seconds?: number;
      }>('/pipelines/run', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.data),
  },
};
