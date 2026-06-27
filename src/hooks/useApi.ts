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
  auditCompliance: ['auditCompliance'] as const,
  auditPrivacy: ['auditPrivacy'] as const,
  settingsSecurity: ['settingsSecurity'] as const,
  settingsNotifications: ['settingsNotifications'] as const,
  settingsSystem: ['settingsSystem'] as const,
  settingsIntegrations: ['settingsIntegrations'] as const,
  users: ['users'] as const,
  accessRequests: (status?: string) => ['accessRequests', status] as const,
  models: ['models'] as const,
  modelPerformanceHistory: (modelId: string) => ['modelPerformanceHistory', modelId] as const,
  modelVersions: (modelId: string) => ['modelVersions', modelId] as const,
  modelDrift: (modelId: string) => ['modelDrift', modelId] as const,
  modelFeedback: (modelId: string, threshold: number) => ['modelFeedback', modelId, threshold] as const,
  modelComparison: ['modelComparison'] as const,
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
  surveyResponses: (surveyId: string) => ['surveyResponses', surveyId] as const,
  feedback: ['feedback'] as const,
  alerts: ['alerts'] as const,
  alertSummary: ['alertSummary'] as const,
  alertRules: ['alertRules'] as const,
  retentionStrategies: ['retentionStrategies'] as const,
  interventionQueue: ['interventionQueue'] as const,
  successionPlanning: ['successionPlanning'] as const,
  actionItems: ['actionItems'] as const,
  benchmarks: (industry: string) => ['benchmarks', industry] as const,
  benchmarkCompetitors: ['benchmarkCompetitors'] as const,
  benchmarkBestPractices: ['benchmarkBestPractices'] as const,
  dataQuality: (threshold?: number) => ['dataQuality', threshold] as const,
  dataQualityMissing: ['dataQualityMissing'] as const,
  dataQualityOutliers: (threshold?: number) => ['dataQualityOutliers', threshold] as const,
  featureEngineering: ['featureEngineering'] as const,
  latestPipeline: ['latestPipeline'] as const,
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

export function useAuditCompliance() {
  return useQuery({ queryKey: queryKeys.auditCompliance, queryFn: api.audit.compliance });
}

export function useAuditPrivacy() {
  return useQuery({ queryKey: queryKeys.auditPrivacy, queryFn: api.audit.privacy });
}

export function useSettingsSecurity() {
  return useQuery({ queryKey: queryKeys.settingsSecurity, queryFn: api.settings.security });
}

export function useSettingsNotifications() {
  return useQuery({ queryKey: queryKeys.settingsNotifications, queryFn: api.settings.notifications });
}

export function useSettingsSystem() {
  return useQuery({ queryKey: queryKeys.settingsSystem, queryFn: api.settings.system });
}

export function useSettingsIntegrations() {
  return useQuery({ queryKey: queryKeys.settingsIntegrations, queryFn: api.settings.integrations });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: api.users.list });
}

export function useModels() {
  return useQuery({ queryKey: queryKeys.models, queryFn: api.models.list });
}

export function useModelPerformanceHistory(modelId?: string) {
  return useQuery({
    queryKey: queryKeys.modelPerformanceHistory(modelId || ''),
    queryFn: () => api.models.performanceHistory(modelId!),
    enabled: !!modelId,
  });
}

export function useModelVersions(modelId?: string) {
  return useQuery({
    queryKey: queryKeys.modelVersions(modelId || ''),
    queryFn: () => api.models.modelVersions(modelId!),
    enabled: !!modelId,
  });
}

export function useModelDrift(modelId?: string) {
  return useQuery({
    queryKey: queryKeys.modelDrift(modelId || ''),
    queryFn: () => api.models.featureDrift(modelId!),
    enabled: !!modelId,
  });
}

export function useModelFeedback(modelId?: string, threshold = 70) {
  return useQuery({
    queryKey: queryKeys.modelFeedback(modelId || '', threshold),
    queryFn: () => api.models.predictionFeedback(modelId!, threshold),
    enabled: !!modelId,
  });
}

export function useModelComparison() {
  return useQuery({ queryKey: queryKeys.modelComparison, queryFn: api.models.comparison });
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

export function useSurveyResponses(surveyId: string | null) {
  return useQuery({
    queryKey: surveyId ? queryKeys.surveyResponses(surveyId) : ['surveyResponses', 'none'],
    queryFn: () => api.engagement.surveyResponses(surveyId!),
    enabled: Boolean(surveyId),
  });
}

export function useFeedback() {
  return useQuery({ queryKey: queryKeys.feedback, queryFn: api.engagement.feedback });
}

function invalidateEngagementQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.engagementSummary });
  queryClient.invalidateQueries({ queryKey: queryKeys.engagementTrends });
  queryClient.invalidateQueries({ queryKey: queryKeys.engagementSentiment });
  queryClient.invalidateQueries({ queryKey: queryKeys.engagementDimensions });
  queryClient.invalidateQueries({ queryKey: queryKeys.engagementVsAttrition });
  queryClient.invalidateQueries({ queryKey: queryKeys.surveys });
  queryClient.invalidateQueries({ queryKey: ['surveyResponses'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.feedback });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.engagement.createSurvey,
    onSuccess: () => invalidateEngagementQueries(queryClient),
  });
}

export function useSendPulseSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.engagement.sendPulse,
    onSuccess: () => invalidateEngagementQueries(queryClient),
  });
}

export function useSendQuickSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.engagement.sendQuickSurvey,
    onSuccess: () => invalidateEngagementQueries(queryClient),
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.engagement.submitFeedback,
    onSuccess: () => invalidateEngagementQueries(queryClient),
  });
}

export function useAlerts() {
  return useQuery({ queryKey: queryKeys.alerts, queryFn: api.alerts.list });
}

export function useAlertSummary() {
  return useQuery({ queryKey: queryKeys.alertSummary, queryFn: api.alerts.summary });
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

export function useSuccessionPlanning() {
  return useQuery({ queryKey: queryKeys.successionPlanning, queryFn: api.retention.succession });
}

export function useActionItems() {
  return useQuery({ queryKey: queryKeys.actionItems, queryFn: api.retention.actionItems });
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

export function useDataQuality(threshold = 2.5) {
  return useQuery({
    queryKey: queryKeys.dataQuality(threshold),
    queryFn: () => api.dataQuality.get(threshold),
  });
}

export function useDataQualityMissing() {
  return useQuery({ queryKey: queryKeys.dataQualityMissing, queryFn: api.dataQuality.missing });
}

export function useDataQualityOutliers(threshold = 2.5) {
  return useQuery({
    queryKey: queryKeys.dataQualityOutliers(threshold),
    queryFn: () => api.dataQuality.outliers(threshold),
  });
}

export function useFeatureEngineering() {
  return useQuery({ queryKey: queryKeys.featureEngineering, queryFn: api.dataQuality.features });
}

export function useLatestPipeline() {
  return useQuery({ queryKey: queryKeys.latestPipeline, queryFn: api.dataQuality.latestPipeline });
}

export function useInvalidateDataQuality() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['dataQuality'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.dataQualityMissing });
    queryClient.invalidateQueries({ queryKey: ['dataQualityOutliers'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.featureEngineering });
    queryClient.invalidateQueries({ queryKey: queryKeys.latestPipeline });
  };
}

export function useInvalidateEmployees() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.employeeStats });
    queryClient.invalidateQueries({ queryKey: queryKeys.kpis });
    queryClient.invalidateQueries({ queryKey: queryKeys.highRiskEmployees });
    invalidateRiskQueries(queryClient);
    invalidateDecisionsQueries(queryClient);
    invalidateAlertsQueries(queryClient);
  };
}

function invalidateRiskQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.riskSummary });
  queryClient.invalidateQueries({ queryKey: queryKeys.riskByTenure });
  queryClient.invalidateQueries({ queryKey: queryKeys.riskBySalary });
  queryClient.invalidateQueries({ queryKey: queryKeys.riskMatrix });
  queryClient.invalidateQueries({ queryKey: queryKeys.riskByDepartment });
  queryClient.invalidateQueries({ queryKey: queryKeys.highRiskEmployees });
}

function invalidateDecisionsQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.retentionStrategies });
  queryClient.invalidateQueries({ queryKey: queryKeys.interventionQueue });
  queryClient.invalidateQueries({ queryKey: queryKeys.successionPlanning });
  queryClient.invalidateQueries({ queryKey: queryKeys.actionItems });
}

function invalidateAlertsQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
  queryClient.invalidateQueries({ queryKey: queryKeys.alertSummary });
  queryClient.invalidateQueries({ queryKey: queryKeys.alertRules });
}

export function useRunPredictions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, threshold }: { modelId: string; threshold: number }) =>
      api.models.predict(modelId, threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.atRisk });
      invalidateRiskQueries(queryClient);
      invalidateDecisionsQueries(queryClient);
      invalidateAlertsQueries(queryClient);
    },
  });
}

function invalidateModelPerformanceQueries(queryClient: ReturnType<typeof useQueryClient>, modelId?: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.models });
  queryClient.invalidateQueries({ queryKey: queryKeys.modelComparison });
  if (modelId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.modelPerformanceHistory(modelId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.modelVersions(modelId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.modelDrift(modelId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.modelFeedback(modelId, 70) });
  }
}

export function useRetrainModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => api.models.retrain(modelId),
    onSuccess: (_data, modelId) => invalidateModelPerformanceQueries(queryClient, modelId),
  });
}

export function useRetrainAllModels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.models.retrainAll,
    onSuccess: () => {
      invalidateModelPerformanceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.atRisk });
      invalidateRiskQueries(queryClient);
      invalidateDecisionsQueries(queryClient);
      invalidateAlertsQueries(queryClient);
    },
  });
}

export function useTrainAndPredict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threshold: number) => api.models.trainAndPredict(threshold / 100),
    onSuccess: () => {
      invalidateModelPerformanceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.atRisk });
      invalidateRiskQueries(queryClient);
      invalidateDecisionsQueries(queryClient);
      invalidateAlertsQueries(queryClient);
    },
  });
}
