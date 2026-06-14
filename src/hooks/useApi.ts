import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { UserRole } from '@/contexts/AuthContext';

export const queryKeys = {
  employees: (params?: Record<string, unknown>) => ['employees', params] as const,
  employeeStats: ['employeeStats'] as const,
  departments: ['departments'] as const,
  kpis: ['kpis'] as const,
  attritionTrends: ['attritionTrends'] as const,
  dashboard: (role: UserRole) => ['dashboard', role] as const,
  auditLogs: (search?: string) => ['auditLogs', search] as const,
  users: ['users'] as const,
  models: ['models'] as const,
  featureImportance: (modelId: string) => ['featureImportance', modelId] as const,
  atRisk: (threshold: number) => ['atRisk', threshold] as const,
  riskSummary: ['riskSummary'] as const,
  riskByTenure: ['riskByTenure'] as const,
  riskBySalary: ['riskBySalary'] as const,
  riskMatrix: ['riskMatrix'] as const,
  riskByDepartment: ['riskByDepartment'] as const,
  highRiskEmployees: ['highRiskEmployees'] as const,
  reportTemplates: ['reportTemplates'] as const,
  reportForecast: ['reportForecast'] as const,
  turnoverCost: ['turnoverCost'] as const,
  reportCorrelations: ['reportCorrelations'] as const,
  scheduledReports: ['scheduledReports'] as const,
  engagementSummary: ['engagementSummary'] as const,
  engagementTrends: ['engagementTrends'] as const,
  engagementSentiment: ['engagementSentiment'] as const,
  engagementDimensions: ['engagementDimensions'] as const,
  engagementVsAttrition: ['engagementVsAttrition'] as const,
  surveys: ['surveys'] as const,
  feedback: ['feedback'] as const,
  alerts: ['alerts'] as const,
  alertRules: ['alertRules'] as const,
  retentionStrategies: ['retentionStrategies'] as const,
  interventionQueue: ['interventionQueue'] as const,
  benchmarks: (industry: string) => ['benchmarks', industry] as const,
  benchmarkCompetitors: ['benchmarkCompetitors'] as const,
  benchmarkBestPractices: ['benchmarkBestPractices'] as const,
};

export function useEmployees(params: {
  search?: string;
  department?: string;
  risk?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: queryKeys.employees(params),
    queryFn: () => api.employees.list(params),
  });
}

export function useEmployeeStats() {
  return useQuery({ queryKey: queryKeys.employeeStats, queryFn: api.employees.stats });
}

export function useDepartments() {
  return useQuery({ queryKey: queryKeys.departments, queryFn: api.departments.list });
}

export function useKpis() {
  return useQuery({ queryKey: queryKeys.kpis, queryFn: api.dashboard.kpis });
}

export function useAttritionTrends() {
  return useQuery({ queryKey: queryKeys.attritionTrends, queryFn: api.dashboard.attritionTrends });
}

export function useDashboard(role: UserRole) {
  return useQuery({ queryKey: queryKeys.dashboard(role), queryFn: () => api.dashboard.byRole(role) });
}

export function useAuditLogs(search?: string) {
  return useQuery({ queryKey: queryKeys.auditLogs(search), queryFn: () => api.audit.logs(search) });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: api.users.list });
}

export function useModels() {
  return useQuery({ queryKey: queryKeys.models, queryFn: api.models.list });
}

export function useFeatureImportance(modelId?: string) {
  return useQuery({
    queryKey: queryKeys.featureImportance(modelId || ''),
    queryFn: () => api.models.featureImportance(modelId!),
    enabled: !!modelId,
  });
}

export function useAtRiskEmployees(threshold = 60) {
  return useQuery({
    queryKey: queryKeys.atRisk(threshold),
    queryFn: () => api.predictions.atRisk(threshold),
  });
}

export function useRiskSummary() {
  return useQuery({ queryKey: queryKeys.riskSummary, queryFn: api.risk.summary });
}

export function useRiskByTenure() {
  return useQuery({ queryKey: queryKeys.riskByTenure, queryFn: api.risk.byTenure });
}

export function useRiskBySalary() {
  return useQuery({ queryKey: queryKeys.riskBySalary, queryFn: api.risk.bySalary });
}

export function useRiskMatrix() {
  return useQuery({ queryKey: queryKeys.riskMatrix, queryFn: api.risk.matrix });
}

export function useRiskByDepartment() {
  return useQuery({ queryKey: queryKeys.riskByDepartment, queryFn: api.risk.byDepartment });
}

export function useHighRiskEmployees() {
  return useQuery({ queryKey: queryKeys.highRiskEmployees, queryFn: api.risk.highRisk });
}

export function useReportTemplates() {
  return useQuery({ queryKey: queryKeys.reportTemplates, queryFn: api.reports.templates });
}

export function useReportForecast() {
  return useQuery({ queryKey: queryKeys.reportForecast, queryFn: api.reports.forecast });
}

export function useTurnoverCost() {
  return useQuery({ queryKey: queryKeys.turnoverCost, queryFn: api.reports.turnoverCost });
}

export function useReportCorrelations() {
  return useQuery({ queryKey: queryKeys.reportCorrelations, queryFn: api.reports.correlations });
}

export function useScheduledReports() {
  return useQuery({ queryKey: queryKeys.scheduledReports, queryFn: api.reports.scheduled });
}

export function useEngagementSummary() {
  return useQuery({ queryKey: queryKeys.engagementSummary, queryFn: api.engagement.summary });
}

export function useEngagementTrends() {
  return useQuery({ queryKey: queryKeys.engagementTrends, queryFn: api.engagement.trends });
}

export function useEngagementSentiment() {
  return useQuery({ queryKey: queryKeys.engagementSentiment, queryFn: api.engagement.sentiment });
}

export function useEngagementDimensions() {
  return useQuery({ queryKey: queryKeys.engagementDimensions, queryFn: api.engagement.dimensions });
}

export function useEngagementVsAttrition() {
  return useQuery({ queryKey: queryKeys.engagementVsAttrition, queryFn: api.engagement.vsAttrition });
}

export function useSurveys() {
  return useQuery({ queryKey: queryKeys.surveys, queryFn: api.engagement.surveys });
}

export function useFeedback() {
  return useQuery({ queryKey: queryKeys.feedback, queryFn: api.engagement.feedback });
}

export function useAlerts() {
  return useQuery({ queryKey: queryKeys.alerts, queryFn: api.alerts.list });
}

export function useAlertRules() {
  return useQuery({ queryKey: queryKeys.alertRules, queryFn: api.alerts.rules });
}

export function useRetentionStrategies() {
  return useQuery({ queryKey: queryKeys.retentionStrategies, queryFn: api.retention.strategies });
}

export function useInterventionQueue() {
  return useQuery({ queryKey: queryKeys.interventionQueue, queryFn: api.retention.interventionQueue });
}

export function useBenchmarks(industry = 'technology') {
  return useQuery({ queryKey: queryKeys.benchmarks(industry), queryFn: () => api.benchmarks.industry(industry) });
}

export function useBenchmarkCompetitors() {
  return useQuery({ queryKey: queryKeys.benchmarkCompetitors, queryFn: api.benchmarks.competitors });
}

export function useBenchmarkBestPractices() {
  return useQuery({ queryKey: queryKeys.benchmarkBestPractices, queryFn: api.benchmarks.bestPractices });
}

export function useInvalidateEmployees() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.employeeStats });
    queryClient.invalidateQueries({ queryKey: queryKeys.kpis });
    queryClient.invalidateQueries({ queryKey: queryKeys.highRiskEmployees });
  };
}

export function useRunPredictions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, threshold }: { modelId: string; threshold: number }) =>
      api.models.predict(modelId, threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.atRisk });
      queryClient.invalidateQueries({ queryKey: queryKeys.highRiskEmployees });
    },
  });
}

export function useRetrainModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => api.models.retrain(modelId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.models }),
  });
}
