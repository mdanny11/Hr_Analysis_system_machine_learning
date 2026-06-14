import { useState, useMemo } from 'react';
import { useInterventionQueue, useRetentionStrategies } from '@/hooks/useApi';
import type { Employee } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

const successionCandidates = [
  { role: 'Engineering Lead', current: 'John Smith', candidates: ['Sarah Chen', 'Mike Johnson', 'Lisa Park'], readiness: [85, 72, 68] },
  { role: 'Sales Director', current: 'Emily Davis', candidates: ['Tom Wilson', 'Anna Lee'], readiness: [78, 65] },
  { role: 'HR Manager', current: 'Robert Brown', candidates: ['Jessica Martinez', 'David Kim', 'Rachel Green'], readiness: [92, 80, 75] },
];

const actionItems = [
  { id: 1, task: 'Schedule 1:1 with James Wilson', assignee: 'HR Manager', due: '2024-01-22', status: 'pending', employee: 'James Wilson' },
  { id: 2, task: 'Prepare salary adjustment proposal', assignee: 'HR Director', due: '2024-01-23', status: 'in-progress', employee: 'Sarah Chen' },
  { id: 3, task: 'Review career development plan', assignee: 'Department Head', due: '2024-01-24', status: 'completed', employee: 'Mike Johnson' },
  { id: 4, task: 'Implement flexible schedule', assignee: 'Team Lead', due: '2024-01-25', status: 'pending', employee: 'Lisa Park' },
  { id: 5, task: 'Follow-up on wellness program enrollment', assignee: 'HR Coordinator', due: '2024-01-26', status: 'in-progress', employee: 'Tom Wilson' },
];

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function Decisions() {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [interventionNotes, setInterventionNotes] = useState('');

  const { data: strategiesRaw = [] } = useRetentionStrategies();
  const { data: queueRaw = [] } = useInterventionQueue();

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
          targetEmployees: Math.max(1, Math.round(cost / 1000)),
          expectedRetention: Number(s.successRate ?? 0),
          description: String(s.description ?? ''),
        };
      }),
    [strategiesRaw],
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
        cost: Math.round(s.cost / 1000),
        benefit: Math.round((s.cost * s.expectedRetention) / 1000),
        roi: Math.round(s.expectedRetention * 2),
      })),
    [retentionStrategies],
  );

  const totalBudget = 125000;
  const allocatedBudget = retentionStrategies.reduce((sum, s) => sum + s.cost, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Decision Support</h1>
          <p className="text-muted-foreground">Data-driven retention strategies and interventions</p>
        </div>
        <div className="flex gap-2">
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

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{interventionQueue.length}</p>
                <p className="text-sm text-muted-foreground">Pending Interventions</p>
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
                <p className="text-2xl font-bold">${(allocatedBudget / 1000).toFixed(0)}k</p>
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
                <p className="text-2xl font-bold">78%</p>
                <p className="text-sm text-muted-foreground">Projected Retention</p>
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
                                <p className="font-medium">${strategy.cost.toLocaleString()}</p>
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
                      <span className="font-medium">${totalBudget.toLocaleString()}</span>
                    </div>
                    <Progress value={(allocatedBudget / totalBudget) * 100} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1">
                      ${allocatedBudget.toLocaleString()} allocated ({Math.round((allocatedBudget / totalBudget) * 100)}%)
                    </p>
                  </div>

                  <div className="space-y-3 mt-6">
                    {retentionStrategies.map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span className="text-sm">{s.name}</span>
                        <span className="text-sm font-medium">${(s.cost / 1000).toFixed(0)}k</span>
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
                <CardDescription>ROI comparison of retention strategies (in thousands)</CardDescription>
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
                      <Bar dataKey="cost" fill="hsl(var(--destructive))" name="Cost ($k)" />
                      <Bar dataKey="benefit" fill="hsl(var(--success))" name="Benefit ($k)" />
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
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
