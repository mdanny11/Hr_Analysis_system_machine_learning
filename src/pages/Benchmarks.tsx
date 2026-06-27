import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useKpis, useBenchmarks, useBenchmarkCompetitors, useBenchmarkBestPractices, queryKeys } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BookOpen,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Building2,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  ExternalLink,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const CHART_PRIMARY = 'hsl(235, 60%, 55%)';
const CHART_SUCCESS = 'hsl(142, 71%, 45%)';
const CHART_DANGER = 'hsl(4, 79%, 55%)';
const CHART_WARNING = 'hsl(38, 92%, 50%)';
const CHART_MUTED = 'hsl(220, 13%, 45%)';

const trendData = [
  { year: '2020', company: 18.2, industry: 17.5 },
  { year: '2021', company: 15.8, industry: 16.8 },
  { year: '2022', company: 14.2, industry: 16.2 },
  { year: '2023', company: 13.1, industry: 15.8 },
  { year: '2024', company: 12.4, industry: 15.2 },
];

export default function Benchmarks() {
  const queryClient = useQueryClient();
  const [selectedIndustry, setSelectedIndustry] = useState('technology');

  const { data: kpis } = useKpis();
  const { data: benchmarkData, isLoading } = useBenchmarks(selectedIndustry);
  const { data: competitorsRaw = [] } = useBenchmarkCompetitors();
  const { data: bestPracticesRaw = [] } = useBenchmarkBestPractices();

  const refetchBenchmarks = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.benchmarks(selectedIndustry) });
    queryClient.invalidateQueries({ queryKey: queryKeys.benchmarkCompetitors });
    queryClient.invalidateQueries({ queryKey: queryKeys.kpis });
  };

  type MetricRow = { metric: string; company: number; industry: number; top25: number; unit: string; higherIsBetter?: boolean };
  type GapRow = { area: string; current: number; benchmark: number; gap: number; priority: string };

  const industryBenchmarks = useMemo<MetricRow[]>(() => {
    const apiMetrics = benchmarkData?.metrics as MetricRow[] | undefined;
    if (apiMetrics?.length) return apiMetrics;
    return [
      { metric: 'Attrition Rate', company: Number(benchmarkData?.companyAttritionRate ?? kpis?.attritionRate ?? 0), industry: Number(benchmarkData?.attritionRate ?? 0), top25: 8.5, unit: '%' },
      { metric: 'Avg Tenure', company: kpis?.avgTenure ?? 0, industry: Number(benchmarkData?.avgTenure ?? 0), top25: 5.5, unit: ' years' },
      { metric: 'Employee Satisfaction', company: kpis?.avgSatisfaction ?? 0, industry: Number(benchmarkData?.avgSatisfaction ?? 0), top25: 8.2, unit: '/10' },
    ];
  }, [benchmarkData, kpis]);

  const radarData = useMemo(
    () => (benchmarkData?.radar as Array<Record<string, string | number>> | undefined) ?? [],
    [benchmarkData],
  );

  const gapAnalysis = useMemo<GapRow[]>(
    () => (benchmarkData?.gaps as GapRow[] | undefined) ?? [],
    [benchmarkData],
  );

  const summary = benchmarkData?.summary as Record<string, string | number> | undefined;

  const competitorComparison = useMemo(
    () =>
      competitorsRaw.map((c) => ({
        name: String(c.company),
        attrition: Number(c.attritionRate ?? 0),
        satisfaction: Number(c.satisfaction ?? 7.0),
        tenure: Number(c.tenure ?? 4.0),
        training: Number(c.training ?? c.retentionPrograms ?? 0) * (c.training ? 1 : 5),
      })),
    [competitorsRaw],
  );

  const bestPractices = useMemo(
    () =>
      bestPracticesRaw.map((p, i) => ({
        id: i + 1,
        category: 'Retention',
        title: String(p.title),
        description: `Industry adoption benchmark for ${String(p.title).toLowerCase()}`,
        impact: String(p.impact ?? 'medium'),
        adoptionRate: Number(p.adoption ?? 0),
      })),
    [bestPracticesRaw],
  );

  const metricsAboveAvg = Number(summary?.metricsAboveAvg ?? industryBenchmarks.filter((item) => {
    const isHigherBetter = item.metric !== 'Attrition Rate' && item.metric !== 'Time to Fill';
    return isHigherBetter ? item.company > item.industry : item.company < item.industry;
  }).length);

  const getComparisonStatus = (company: number, industry: number, higherIsBetter: boolean = false) => {
    const diff = higherIsBetter ? company - industry : industry - company;
    if (diff > 0) return { icon: ArrowUp, color: 'text-success', label: 'Above Average' };
    if (diff < 0) return { icon: ArrowDown, color: 'text-destructive', label: 'Below Average' };
    return { icon: Minus, color: 'text-muted-foreground', label: 'At Average' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Benchmarking</h1>
          <p className="text-muted-foreground">Compare performance against industry standards</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetchBenchmarks} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How this works</AlertTitle>
        <AlertDescription>
          <strong>Your Company</strong> metrics are computed live from your 1,500+ employee records and ML risk scores.
          <strong> Industry / Top 25%</strong> values are reference benchmarks for the selected sector.
          Trend Analysis uses illustrative historical data.
        </AlertDescription>
      </Alert>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Number(summary?.aboveIndustryDelta ?? 0) >= 0 ? '+' : ''}
                  {summary?.aboveIndustryDelta ?? '—'}%
                </p>
                <p className="text-sm text-muted-foreground">Above Industry Avg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metricsAboveAvg}/{summary?.metricsTotal ?? industryBenchmarks.length}
                </p>
                <p className="text-sm text-muted-foreground">Metrics Above Avg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Scale className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.improvementAreas ?? '—'}</p>
                <p className="text-sm text-muted-foreground">Improvement Areas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-5/10">
                <Award className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.industryRanking ?? '—'}</p>
                <p className="text-sm text-muted-foreground">Industry Ranking</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Industry Comparison</TabsTrigger>
          <TabsTrigger value="competitors">Peer Comparison</TabsTrigger>
          <TabsTrigger value="practices">Best Practices</TabsTrigger>
          <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
        </TabsList>

        {/* Industry Comparison Tab */}
        <TabsContent value="overview">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics vs Industry</CardTitle>
                <CardDescription>How your organization compares to industry benchmarks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {industryBenchmarks.map((item) => {
                    const isHigherBetter = item.higherIsBetter ?? (item.metric !== 'Attrition Rate' && item.metric !== 'Time to Fill');
                    const status = getComparisonStatus(item.company, item.industry, isHigherBetter);
                    const StatusIcon = status.icon;

                    return (
                      <div key={item.metric} className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">{item.metric}</span>
                          <div className={`flex items-center gap-1 ${status.color}`}>
                            <StatusIcon className="h-4 w-4" />
                            <span className="text-sm">{status.label}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-2 rounded bg-primary/10">
                            <p className="text-xs text-muted-foreground">Your Company</p>
                            <p className="font-bold text-primary">{item.company}{item.unit}</p>
                          </div>
                          <div className="text-center p-2 rounded bg-muted">
                            <p className="text-xs text-muted-foreground">Industry Avg</p>
                            <p className="font-bold">{item.industry}{item.unit}</p>
                          </div>
                          <div className="text-center p-2 rounded bg-success/10">
                            <p className="text-xs text-muted-foreground">Top 25%</p>
                            <p className="font-bold text-success">{item.top25}{item.unit}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Radar</CardTitle>
                <CardDescription>Multi-dimensional comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                {radarData.length === 0 && !isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-16">Loading benchmark radar…</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(220, 13%, 30%)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="Your Company" dataKey="company" stroke={CHART_PRIMARY} fill={CHART_PRIMARY} fillOpacity={0.3} strokeWidth={2} />
                      <Radar name="Industry Avg" dataKey="industry" stroke={CHART_MUTED} fill={CHART_MUTED} fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                      <Radar name="Top Performer" dataKey="topPerformer" stroke={CHART_SUCCESS} fill={CHART_SUCCESS} fillOpacity={0.1} strokeWidth={2} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Peer Comparison Tab */}
        <TabsContent value="competitors">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Analysis</CardTitle>
              <CardDescription>Comparison with peer organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={competitorComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="attrition" name="Attrition %" fill={CHART_DANGER} />
                    <Bar dataKey="satisfaction" name="Satisfaction" fill={CHART_SUCCESS} />
                    <Bar dataKey="tenure" name="Tenure (yrs)" fill={CHART_PRIMARY} />
                    <Bar dataKey="training" name="Training (hrs)" fill={CHART_WARNING} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 grid md:grid-cols-4 gap-4">
                {competitorComparison.slice(0, 4).map((item, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                    <p className="font-semibold">{item.attrition}% attrition</p>
                    <p className="text-sm text-primary">{item.satisfaction}/10 sat · {item.tenure} yrs</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Best Practices Tab */}
        <TabsContent value="practices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Best Practices Library
              </CardTitle>
              <CardDescription>Industry-proven strategies for improving retention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {bestPractices.map((practice) => (
                  <div
                    key={practice.id}
                    className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant="outline" className="mb-2">{practice.category}</Badge>
                        <h4 className="font-semibold">{practice.title}</h4>
                      </div>
                      <Badge
                        variant={practice.impact === 'high' ? 'success' : 'secondary'}
                      >
                        {practice.impact} impact
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{practice.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Industry Adoption: </span>
                        <span className="font-medium">{practice.adoptionRate}%</span>
                      </div>
                      <Button variant="link" className="p-0 h-auto">
                        Learn more <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gap Analysis Tab */}
        <TabsContent value="gaps">
          <Card>
            <CardHeader>
              <CardTitle>Gap Analysis</CardTitle>
              <CardDescription>Identify areas for improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gapAnalysis.length === 0 && !isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No gap data yet.</p>
                ) : (
                gapAnalysis.map((item) => (
                  <div key={item.area} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {item.gap < -20 ? (
                          <XCircle className="h-5 w-5 text-destructive" />
                        ) : item.gap < 0 ? (
                          <AlertTriangle className="h-5 w-5 text-warning" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                        <span className="font-medium">{item.area}</span>
                      </div>
                      <Badge
                        variant={
                          item.priority === 'high' ? 'destructive' :
                          item.priority === 'medium' ? 'warning' : 'secondary'
                        }
                      >
                        {item.priority} priority
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Current</p>
                        <p className="font-bold">{item.current}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Benchmark</p>
                        <p className="font-bold">{item.benchmark}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gap</p>
                        <p className={`font-bold ${item.gap < 0 ? 'text-destructive' : 'text-success'}`}>
                          {item.gap > 0 ? '+' : ''}{item.gap}%
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(100, (item.current / item.benchmark) * 100)}
                      className="h-2"
                    />
                  </div>
                ))
                )}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-warning" />
                  Recommendations
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Prioritize training investment to close the 40% gap with top performers</li>
                  <li>• Implement internal mobility programs to improve career progression</li>
                  <li>• Focus on engagement initiatives to boost satisfaction scores</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Analysis Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Historical Trend Analysis</CardTitle>
              <CardDescription>Your attrition rate compared to industry over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[10, 20]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="company"
                      name="Your Company"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="industry"
                      name="Industry Average"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                  <p className="text-sm text-muted-foreground">5-Year Improvement</p>
                  <p className="text-2xl font-bold text-success">-5.8%</p>
                  <p className="text-xs text-muted-foreground">Attrition rate reduced</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-sm text-muted-foreground">Industry Gap Closed</p>
                  <p className="text-2xl font-bold text-primary">3.5%</p>
                  <p className="text-xs text-muted-foreground">Outperforming by more each year</p>
                </div>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <p className="text-sm text-muted-foreground">To Reach Top 25%</p>
                  <p className="text-2xl font-bold text-warning">-3.9%</p>
                  <p className="text-xs text-muted-foreground">Additional reduction needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
