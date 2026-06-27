import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useRiskSummary,
  useRiskByTenure,
  useRiskBySalary,
  useRiskMatrix,
  useRiskByDepartment,
  useHighRiskEmployees,
  queryKeys,
} from '@/hooks/useApi';
import { ApiError } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { AlertTriangle, TrendingUp, Users, Building, Target, Download, RefreshCw, Info } from 'lucide-react';

const CHART_PRIMARY = 'hsl(235, 60%, 55%)';
const CHART_SECONDARY = 'hsl(4, 79%, 55%)';
const CHART_SUCCESS = 'hsl(142, 71%, 45%)';
const CHART_WARNING = 'hsl(38, 92%, 50%)';
const CHART_DANGER = 'hsl(4, 79%, 55%)';

export default function RiskAnalysis() {
  const queryClient = useQueryClient();
  const summaryQuery = useRiskSummary();
  const tenureQuery = useRiskByTenure();
  const salaryQuery = useRiskBySalary();
  const matrixQuery = useRiskMatrix();
  const deptQuery = useRiskByDepartment();
  const highRiskQuery = useHighRiskEmployees();

  const summary = summaryQuery.data;
  const riskByTenure = tenureQuery.data ?? [];
  const riskBySalary = salaryQuery.data ?? [];
  const riskMatrix = matrixQuery.data ?? [];
  const deptData = deptQuery.data ?? [];
  const highRiskEmployees = highRiskQuery.data ?? [];

  const isLoading = [summaryQuery, tenureQuery, salaryQuery, matrixQuery, deptQuery].some((q) => q.isLoading);
  const isError = [summaryQuery, tenureQuery, salaryQuery, matrixQuery, deptQuery].some((q) => q.isError);
  const errorMessage = [summaryQuery, tenureQuery, salaryQuery, matrixQuery, deptQuery]
    .find((q) => q.error)?.error;

  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.riskSummary }),
      queryClient.invalidateQueries({ queryKey: queryKeys.riskByTenure }),
      queryClient.invalidateQueries({ queryKey: queryKeys.riskBySalary }),
      queryClient.invalidateQueries({ queryKey: queryKeys.riskMatrix }),
      queryClient.invalidateQueries({ queryKey: queryKeys.riskByDepartment }),
      queryClient.invalidateQueries({ queryKey: queryKeys.highRiskEmployees }),
    ]);
    toast.success('Risk analysis refreshed');
  };

  const deptRadarData = deptData.slice(0, 6).map((d: Record<string, unknown>) => ({
    department: String(d.department || d.fullName || '').split(' ')[0],
    attritionRate: Number(d.attritionRate) || 0,
    satisfaction: Number(d.satisfaction) || 0,
    avgRisk: Number(d.avgRisk) || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Analysis</h1>
          <p className="text-muted-foreground">Deep-dive into attrition risk factors and patterns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetchAll} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => toast.success('Report export queued')}>
            <Download className="h-4 w-4 mr-2" />Export Report
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How this works</AlertTitle>
        <AlertDescription>
          Risk scores come from your trained ML model on the Predictions page. Each employee&apos;s{' '}
          <strong>attrition probability</strong> and <strong>risk level</strong> (Low / Medium / High) drive these charts.
          Run <strong>Train &amp; Run Predictions</strong> first, then refresh this page to see updated analytics.
        </AlertDescription>
      </Alert>

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load risk data</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{errorMessage instanceof ApiError ? errorMessage.message : 'Check that the backend is running on port 8000.'}</span>
            <Button variant="outline" size="sm" onClick={refetchAll}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{isLoading ? '…' : (summary?.highRisk ?? '—')}</p>
                <p className="text-xs text-muted-foreground">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{isLoading ? '…' : (summary?.mediumRisk ?? '—')}</p>
                <p className="text-xs text-muted-foreground">Medium Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{isLoading ? '…' : (summary?.lowRisk ?? '—')}</p>
                <p className="text-xs text-muted-foreground">Low Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{isLoading ? '…' : `${summary?.avgRiskScore ?? '—'}%`}</p>
                <p className="text-xs text-muted-foreground">Avg Risk Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader><CardTitle>Risk by Tenure</CardTitle><CardDescription>Average attrition probability by years at company</CardDescription></CardHeader>
          <CardContent>
            {riskByTenure.length === 0 && !isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-16">No tenure data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={riskByTenure}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 25%)" />
                  <XAxis dataKey="tenure" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Avg risk']} />
                  <Bar dataKey="avgRisk" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><CardTitle>Risk by Salary Band</CardTitle><CardDescription>Auto-detects RWF vs standard salary ranges</CardDescription></CardHeader>
          <CardContent>
            {riskBySalary.length === 0 && !isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-16">No salary data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={riskBySalary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 25%)" />
                  <XAxis dataKey="salary" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Avg risk']} />
                  <Bar dataKey="avgRisk" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Satisfaction vs Performance</CardTitle>
            <CardDescription>Top 100 employees by risk — colored by attrition probability</CardDescription>
          </CardHeader>
          <CardContent>
            {riskMatrix.length === 0 && !isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-16">Run predictions to populate this chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 25%)" />
                  <XAxis dataKey="satisfaction" name="Satisfaction" domain={[1, 10]} type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="performance" name="Performance" domain={[1, 10]} type="number" tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={riskMatrix} fill={CHART_PRIMARY}>
                    {riskMatrix.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.risk > 60 ? CHART_DANGER : entry.risk > 30 ? CHART_WARNING : CHART_SUCCESS}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><CardTitle>Department Risk Radar</CardTitle><CardDescription>Live high-risk % and satisfaction by department</CardDescription></CardHeader>
          <CardContent>
            {deptRadarData.length === 0 && !isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-16">No department data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={deptRadarData}>
                  <PolarGrid stroke="hsl(220, 13%, 30%)" />
                  <PolarAngleAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="High risk %" dataKey="attritionRate" stroke={CHART_DANGER} fill={CHART_DANGER} fillOpacity={0.2} />
                  <Radar name="Satisfaction" dataKey="satisfaction" stroke={CHART_PRIMARY} fill={CHART_PRIMARY} fillOpacity={0.2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Department Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deptData.length === 0 && !isLoading ? (
              <p className="text-sm text-muted-foreground">No departments found.</p>
            ) : (
              deptData.map((dept: Record<string, unknown>, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium truncate">{String(dept.fullName || dept.department)}</div>
                  <Progress value={Number(dept.avgRisk) || 0} className="flex-1 h-3" />
                  <Badge variant="outline">{String(dept.avgRisk)}%</Badge>
                  <span className="text-sm text-muted-foreground w-20 text-right">{String(dept.employeeCount)} emp</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            High-Risk Employees
          </CardTitle>
          <CardDescription>Employees flagged as High risk by the ML model</CardDescription>
        </CardHeader>
        <CardContent>
          {highRiskEmployees.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground">No high-risk employees after the latest prediction run.</p>
          ) : (
            <div className="space-y-2">
              {highRiskEmployees.slice(0, 10).map((emp) => (
                <div key={emp.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-muted-foreground">{emp.department?.name} · {emp.position}</p>
                  </div>
                  <Badge variant="destructive">{emp.attritionProbability}%</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
