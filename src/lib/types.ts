export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  hireDate: string;
  salary: number;
  currency?: string;
  payFrequency?: string;
  age: number;
  gender: string;
  yearsAtCompany: number;
  performanceScore: number;
  satisfactionScore: number;
  workLifeBalance: number;
  lastPromotionYears: number;
  trainingHours: number;
  overtimeHours: number;
  attritionRisk: 'low' | 'medium' | 'high';
  attritionProbability: number;
  status: 'active' | 'inactive' | 'on-leave';
  avatar?: string;
}

export interface Department {
  id: string;
  name: string;
  headCount: number;
  attritionRate: number;
  avgSatisfaction: number;
  budget: number;
}

export interface PredictionModel {
  id: string;
  name: string;
  type: 'random-forest' | 'xgboost' | 'neural-network';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  productionScore: number;
  lastTrained: string;
  status: 'active' | 'training' | 'deprecated';
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  category: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  details: string;
}

export interface KpiMetrics {
  totalEmployees: number;
  activeEmployees: number;
  attritionRate: number;
  avgTenure: number;
  avgSatisfaction: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  openPositions: number;
  monthlyTurnover: number;
  retentionRate: number;
  avgPerformance: number;
}

export interface AttritionTrend {
  month: string;
  actual: number;
  predicted: number;
  hired: number;
}

export interface EmployeeStats {
  total: number;
  active: number;
  onLeave: number;
  inactive: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  avgPerformance: number;
  avgSatisfaction: number;
}

export interface PaginatedMeta {
  page?: number;
  limit?: number;
  total?: number;
}
