import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useActionItems,
  useInterventionQueue,
  useRetentionStrategies,
  useSuccessionPlanning,
  useRiskSummary,
  queryKeys,
} from '@/hooks/useApi';
import type { Employee } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Target,
  Lightbulb,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Star,
  Briefcase,
  GraduationCap,
  Heart,
  Award,
  Calendar,
  MessageSquare,
  BarChart3,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DEFAULT_CURRENCY, formatCurrency, formatCurrencyCompact, formatCurrencyMillions } from '@/lib/currency';

const categoryIcons: Record<string, typeof GraduationCap> = {
  development: GraduationCap,
  compensation: DollarSign,
  wellbeing: Heart,
};

const categoryImpact: Record<string, 'high' | 'medium' | 'low'> = {
  development: 'high',
  compensation: 'high',
  wellbeing: 'medium',
};

const suggestedActions = ['Career Development', 'Salary Review', 'Manager Meeting', 'Flexible Schedule'];

const COLORS = ['hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(4, 79%, 55%)'];
const CHART_PRIMARY = 'hsl(235, 60%, 55%)';
const CHART_SUCCESS = 'hsl(142, 71%, 45%)';
const CHART_DANGER = 'hsl(4, 79%, 55%)';

export default function Decisions() {
  const queryClient = useQueryClient();
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [interventionNotes, setInterventionNotes] = useState('');

  const strategiesQuery = useRetentionStrategies();
  const queueQuery = useInterventionQueue();
  const successionQuery = useSuccessionPlanning();
  const actionItemsQuery = useActionItems();
  const riskSummaryQuery = useRiskSummary();

  const strategiesRaw = strategiesQuery.data ?? [];
  const queueRaw = queueQuery.data ?? [];
  const successionRaw = successionQuery.data ?? [];
  const actionItemsRaw = actionItemsQuery.data ?? [];
  const riskSummary = riskSummaryQuery.data;

  const isLoading = [strategiesQuery, queueQuery, successionQuery, actionItemsQuery].some((q) => q.isLoading);

  const refetchDecisions = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.retentionStrategies }),
      queryClient.invalidateQueries({ queryKey: queryKeys.interventionQueue }),
      queryClient.invalidateQueries({ queryKey: queryKeys.successionPlanning }),
      queryClient.invalidateQueries({ queryKey: queryKeys.actionItems }),
      queryClient.invalidateQueries({ queryKey: queryKeys.riskSummary }),
    ]);
    toast.success('Decision support data refreshed');
  };

  const actionItems = useMemo(
    () =>
      actionItemsRaw.map((item) => ({
        id: item.id,
        task: item.title,
        assignee: item.assignee ?? 'Unassigned',
        due: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date',
        status: item.status,
        employee: item.employee ?? 'General',
      })),
    [actionItemsRaw],
  );

  const successionCandidates = useMemo(
    () =>
      successionRaw.map((role) => ({
        role: role.targetRole,
        current: role.currentIncumbent ?? 'Not specified',
        candidates: role.candidates.map((c) => c.name),
        readiness: role.candidates.map((c) => c.readinessScore),
      })),
    [successionRaw],
  );

  const retentionStrategies = useMemo(
    () =>
      strategiesRaw.map((s) => {
        const category = String(s.category ?? 'development');
        const cost = Number(s.estimatedCost ?? 0);
        return {
          id: String(s.id),
          name: String(s.name),
          icon: categoryIcons[category] ?? Lightbulb,
          impact: categoryImpact[category] ?? 'medium',
          cost,
          targetEmployees: Number(s.targetEmployeeCount ?? 0) || Math.max(1, Math.round((riskSummary?.highRisk ?? queueRaw.length) * 0.5)),
          expectedRetention: Number(s.successRate ?? 0),
          description: String(s.description ?? ''),
        };
      }),
    [strategiesRaw, riskSummary?.highRisk, queueRaw.length],
  );

  const interventionQueue = useMemo(
    () =>
      queueRaw.map((emp: Employee, i: number) => ({
        ...emp,
        priority: emp.attritionProbability >= 80 ? 'critical' : 'high',
        suggestedAction: suggestedActions[i % suggestedActions.length],
        deadline: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      })),
    [queueRaw],
  );

  const costBenefitData = useMemo(
    () =>
      retentionStrategies.map((s) => ({
        strategy: s.name.split(' ')[0],
        cost: Math.round(s.cost / 1_000_000),
        benefit: Math.round((s.cost * s.expectedRetention) / 100_000_000),
        roi: Math.round(s.expectedRetention * 2),
      })),
    [retentionStrategies],
  );

  const allocatedBudget = retentionStrategies.reduce((sum, s) => sum + s.cost, 0);
  const totalBudget = Math.max(125_000_000, Math.round(allocatedBudget * 1.2));
  const projectedRetention = useMemo(() => {
    if (!retentionStrategies.length) return 0;
    const totalCost = retentionStrategies.reduce((sum, s) => sum + s.cost, 0);
    if (totalCost === 0) return 0;
    const weighted = retentionStrategies.reduce((sum, s) => sum + s.expectedRetention * s.cost, 0);
    return Math.round(weighted / totalCost);
  }, [retentionStrategies]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Decision Support</h1>
          <p className="text-muted-foreground">Data-driven retention strategies and interventions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetchDecisions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Reports
          </Button>
          <Button>
            <Target className="h-4 w-4 mr-2" />
            Create Action Plan
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How this works</AlertTitle>
        <AlertDescription>
          Decisions uses your ML risk scores from Predictions. The <strong>Intervention Queue</strong> lists the top 20
          employees at ≥70% attrition probability. Retention strategies show estimated RWF costs and target counts based
          on your current high-risk population ({riskSummary?.highRisk ?? '—'} employees).
        </AlertDescription>
      </Alert>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '…' : interventionQueue.length}</p>
                <p className="text-sm text-muted-foreground">Pending Interventions</p>
                <p className="text-xs text-muted-foreground">Top 20 at ≥70% risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{actionItems.filter(a => a.status === 'completed').length}</p>
                <p className="text-sm text-muted-foreground">Actions Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrencyCompact(allocatedBudget)}</p>
                <p className="text-sm text-muted-foreground">Budget Allocated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '…' : `${projectedRetention}%`}</p>
                <p className="text-sm text-muted-foreground">Projected Retention</p>
                <p className="text-xs text-muted-foreground">Cost-weighted strategy success</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="strategies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="strategies">Retention Strategies</TabsTrigger>
          <TabsTrigger value="interventions">Intervention Queue</TabsTrigger>
          <TabsTrigger value="cost-benefit">Cost-Benefit Analysis</TabsTrigger>
          <TabsTrigger value="succession">Succession Planning</TabsTrigger>
          <TabsTrigger value="actions">Action Tracking</TabsTrigger>
        </TabsList>

        {/* Retention Strategies Tab */}
        <TabsContent value="strategies">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Recommended Strategies
                  </CardTitle>
                  <CardDescription>AI-powered retention recommendations based on risk analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {retentionStrategies.map((strategy) => {
                    const Icon = strategy.icon;
                    return (
                      <div
                        key={strategy.id}
                        onClick={() => setSelectedStrategy(strategy.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedStrategy === strategy.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{strategy.name}</h4>
                              <Badge
                                variant={
                                  strategy.impact === 'high' ? 'success' :
                                  strategy.impact === 'medium' ? 'warning' : 'secondary'
                                }
                              >
                                {strategy.impact} impact
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Cost</p>
                                <p className="font-medium">{formatCurrency(strategy.cost)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Target Employees</p>
                                <p className="font-medium">{strategy.targetEmployees}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Expected Retention</p>
                                <p className="font-medium">{strategy.expectedRetention}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
                <CardDescription>Retention program budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Total Budget</span>
                      <span className="font-medium">{formatCurrency(totalBudget)}</span>
                    </div>
                    <Progress value={(allocatedBudget / totalBudget) * 100} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(allocatedBudget)} allocated ({Math.round((allocatedBudget / totalBudget) * 100)}%)
                    </p>
                  </div>

                  <div className="space-y-3 mt-6">
                    {retentionStrategies.map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span className="text-sm">{s.name}</span>
                        <span className="text-sm font-medium">{formatCurrencyCompact(s.cost)}</span>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full mt-4">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Request Budget Increase
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Intervention Queue Tab */}
        <TabsContent value="interventions">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>High-Risk Employee Interventions</CardTitle>
                  <CardDescription>Prioritized list of employees requiring immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {interventionQueue.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                      >
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {emp.firstName[0]}{emp.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                            <Badge variant={emp.priority === 'critical' ? 'destructive' : 'warning'}>
                              {emp.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {emp.department} • {emp.position}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{emp.suggestedAction}</p>
                          <p className="text-xs text-muted-foreground">Due: {emp.deadline}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Intervention Planner</CardTitle>
                <CardDescription>Document intervention strategy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Selected Employee</p>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="font-medium">{interventionQueue[0]?.firstName} {interventionQueue[0]?.lastName}</p>
                    <p className="text-sm text-muted-foreground">Risk: {interventionQueue[0]?.attritionProbability}%</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Intervention Notes</p>
                  <Textarea
                    placeholder="Document your intervention strategy..."
                    value={interventionNotes}
                    onChange={(e) => setInterventionNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Set Reminder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cost-Benefit Analysis Tab */}
        <TabsContent value="cost-benefit">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost vs Benefit Analysis</CardTitle>
                <CardDescription>ROI comparison of retention strategies (in millions of {DEFAULT_CURRENCY})</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costBenefitData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="strategy" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="cost" fill={CHART_DANGER} name={`Cost (${DEFAULT_CURRENCY} M)`} />
                      <Bar dataKey="benefit" fill={CHART_SUCCESS} name={`Benefit (${DEFAULT_CURRENCY} M)`} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ROI by Strategy</CardTitle>
                <CardDescription>Return on investment percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={costBenefitData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="strategy" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="roi"
                        stroke={CHART_PRIMARY}
                        strokeWidth={3}
                        dot={{ fill: CHART_PRIMARY, strokeWidth: 2, r: 6 }}
                        name="ROI %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Succession Planning Tab */}
        <TabsContent value="succession">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Succession Pipeline
              </CardTitle>
              <CardDescription>Talent pipeline for critical roles</CardDescription>
            </CardHeader>
            <CardContent>
              {successionQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading succession pipeline…</p>
              ) : successionCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No succession candidates configured yet.</p>
              ) : (
              <div className="space-y-6">
                {successionCandidates.map((role, i) => (
                  <div key={i} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{role.role}</h4>
                        <p className="text-sm text-muted-foreground">Current: {role.current}</p>
                      </div>
                      <Badge variant="outline">
                        {role.candidates.length} candidates
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {role.candidates.map((candidate, j) => (
                        <div key={j} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {candidate.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{candidate}</p>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, s) => (
                                  <Star
                                    key={s}
                                    className={`h-3 w-3 ${
                                      s < Math.round(role.readiness[j] / 20)
                                        ? 'text-warning fill-warning'
                                        : 'text-muted-foreground'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Readiness</span>
                              <span>{role.readiness[j]}%</span>
                            </div>
                            <Progress value={role.readiness[j]} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Tracking Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Action Item Tracker</CardTitle>
              <CardDescription>Monitor progress of retention interventions</CardDescription>
            </CardHeader>
            <CardContent>
              {actionItemsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading action items…</p>
              ) : actionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No action items yet.</p>
              ) : (
              <div className="space-y-3">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        item.status === 'completed'
                          ? 'bg-success'
                          : item.status === 'in-progress'
                          ? 'bg-warning'
                          : 'bg-muted-foreground'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.task}</p>
                      <p className="text-sm text-muted-foreground">
                        For: {item.employee} • Assigned to: {item.assignee}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Due: {item.due}</p>
                      <Badge
                        variant={
                          item.status === 'completed' ? 'success' :
                          item.status === 'in-progress' ? 'warning' : 'secondary'
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
