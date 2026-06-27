import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/services/api';
import {
  useDataQuality,
  useDataQualityMissing,
  useDataQualityOutliers,
  useFeatureEngineering,
  useInvalidateDataQuality,
  useLatestPipeline,
} from '@/hooks/useApi';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Wand2,
  Settings2,
  Play,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

const DEFAULT_PIPELINE_STEPS = [
  { id: 1, name: 'Data Import', status: 'pending', duration: '-' },
  { id: 2, name: 'Schema Validation', status: 'pending', duration: '-' },
  { id: 3, name: 'Missing Value Detection', status: 'pending', duration: '-' },
  { id: 4, name: 'Missing Value Imputation', status: 'pending', duration: '-' },
  { id: 5, name: 'Outlier Detection', status: 'pending', duration: '-' },
  { id: 6, name: 'Data Normalization', status: 'pending', duration: '-' },
  { id: 7, name: 'Feature Engineering', status: 'pending', duration: '-' },
  { id: 8, name: 'Export to ML Pipeline', status: 'pending', duration: '-' },
];

function formatPipelineDuration(result: {
  durationSeconds?: number;
  duration_seconds?: number;
  steps?: Array<{ duration?: string }>;
}): string {
  const seconds = result.durationSeconds ?? result.duration_seconds;
  if (typeof seconds === 'number' && Number.isFinite(seconds)) {
    return `${seconds}s`;
  }

  const totalFromSteps = (result.steps ?? []).reduce((sum, step) => {
    const match = step.duration?.match(/^([\d.]+)s$/);
    return sum + (match ? Number.parseFloat(match[1]) : 0);
  }, 0);

  if (totalFromSteps > 0) {
    return `${totalFromSteps.toFixed(1)}s`;
  }

  return 'successfully';
}

export default function DataProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImputing, setIsImputing] = useState(false);
  const [isHandlingOutliers, setIsHandlingOutliers] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [outlierThreshold, setOutlierThreshold] = useState([2.5]);
  const invalidateDataQuality = useInvalidateDataQuality();

  const threshold = outlierThreshold[0];
  const { data: qualityReport, isLoading: qualityLoading } = useDataQuality(threshold);
  const { data: missingReport, isLoading: missingLoading } = useDataQualityMissing();
  const { data: outlierReport, isLoading: outliersLoading } = useDataQualityOutliers(threshold);
  const { data: features = [], isLoading: featuresLoading } = useFeatureEngineering();
  const { data: latestPipeline } = useLatestPipeline();

  const summary = qualityReport?.summary;
  const dataQualityMetrics = qualityReport?.fields ?? [];
  const missingDataByField = missingReport?.distribution ?? qualityReport?.missing ?? [];
  const imputationStrategies = missingReport?.strategies ?? [];
  const outlierPoints = outlierReport?.points ?? [];
  const detectedOutliers = outlierReport?.outliers ?? [];

  const pipelineSteps = useMemo(() => {
    if (latestPipeline?.steps?.length) {
      return latestPipeline.steps.map((step, index) => ({
        id: index + 1,
        name: step.name,
        status: step.status,
        duration: step.duration ?? '-',
        detail: step.detail,
      }));
    }
    return DEFAULT_PIPELINE_STEPS;
  }, [latestPipeline]);

  const refreshAll = () => invalidateDataQuality();

  const runPipeline = async () => {
    setIsProcessing(true);
    try {
      const result = await api.dataQuality.runPipeline({
        outlierThreshold: threshold,
        features: features.map((feature) => ({ id: feature.id, enabled: feature.enabled })),
      });
      toast.success('Pipeline completed', {
        description: `Run ${result.runId} finished in ${formatPipelineDuration(result)}`,
      });
      refreshAll();
    } catch {
      toast.error('Pipeline run failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyImputation = async () => {
    setIsImputing(true);
    try {
      const result = await api.dataQuality.impute();
      toast.success('Imputation applied', { description: result.message });
      refreshAll();
    } catch {
      toast.error('Failed to apply imputation strategies');
    } finally {
      setIsImputing(false);
    }
  };

  const handleOutliers = async () => {
    setIsHandlingOutliers(true);
    try {
      const result = await api.dataQuality.handleOutliers(threshold);
      toast.success('Outliers handled', { description: result.message });
      refreshAll();
    } catch {
      toast.error('Failed to handle outliers');
    } finally {
      setIsHandlingOutliers(false);
    }
  };

  const toggleFeature = async (id: string, enabled: boolean) => {
    try {
      const next = features.map((feature) =>
        feature.id === id ? { ...feature, enabled } : feature,
      );
      await api.dataQuality.updateFeatures(next.map((feature) => ({ id: feature.id, enabled: feature.enabled })));
      refreshAll();
    } catch {
      toast.error('Failed to update feature configuration');
    }
  };

  const exportCleanData = async () => {
    setIsExporting(true);
    try {
      await api.employees.export({ format: 'xlsx' });
      toast.success('Clean employee data exported as Excel');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (qualityLoading && !qualityReport) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Preprocessing</h1>
          <p className="text-muted-foreground">Loading data quality report…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Preprocessing</h1>
          <p className="text-muted-foreground">Clean, validate, and prepare data for ML models</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/employees">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Link>
          </Button>
          <Button onClick={runPipeline} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Pipeline
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.qualityScore ?? 0}%</p>
                <p className="text-sm text-muted-foreground">Data Quality Score</p>
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
                <p className="text-2xl font-bold">{summary?.fieldsValidated ?? 0}</p>
                <p className="text-sm text-muted-foreground">Fields Validated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.missingValues ?? 0}</p>
                <p className="text-sm text-muted-foreground">Missing Values</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.outliersDetected ?? 0}</p>
                <p className="text-sm text-muted-foreground">Outliers Detected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quality" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="missing">Missing Values</TabsTrigger>
          <TabsTrigger value="outliers">Outlier Detection</TabsTrigger>
          <TabsTrigger value="features">Feature Engineering</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Field Quality Analysis
              </CardTitle>
              <CardDescription>
                Completeness, validity, and uniqueness metrics per field ({summary?.employeeCount ?? 0} employees)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataQualityMetrics.map((metric) => (
                  <div key={metric.field} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {metric.status === 'good' && <CheckCircle2 className="h-4 w-4 text-success" />}
                        {metric.status === 'warning' && <AlertTriangle className="h-4 w-4 text-warning" />}
                        {metric.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                        <span className="font-medium">{metric.field}</span>
                      </div>
                      <Badge
                        variant={
                          metric.status === 'good' ? 'success' :
                          metric.status === 'warning' ? 'warning' : 'destructive'
                        }
                      >
                        {Math.round((metric.completeness + metric.validity) / 2)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Completeness</p>
                        <Progress value={metric.completeness} className="h-2" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Validity</p>
                        <Progress value={metric.validity} className="h-2" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Uniqueness</p>
                        <Progress value={metric.uniqueness} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Missing Data Distribution</CardTitle>
                <CardDescription>Percentage of missing values by field</CardDescription>
              </CardHeader>
              <CardContent>
                {missingLoading ? (
                  <p className="text-sm text-muted-foreground">Loading missing value analysis…</p>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={missingDataByField} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="field" type="category" width={100} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                          {missingDataByField.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.percentage > 20
                                  ? 'hsl(var(--destructive))'
                                  : entry.percentage > 10
                                  ? 'hsl(var(--warning))'
                                  : 'hsl(var(--success))'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Handling Strategy</CardTitle>
                <CardDescription>Configure how missing values should be handled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {imputationStrategies.map((item) => (
                  <div key={item.field} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.field}</p>
                      <p className="text-sm text-muted-foreground">{item.strategy}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{item.action}</Badge>
                    </div>
                  </div>
                ))}
                <Button className="w-full mt-4" onClick={applyImputation} disabled={isImputing}>
                  {isImputing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Apply All Strategies
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outliers">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Salary vs Tenure Outliers</CardTitle>
                <CardDescription>Scatter plot showing potential data anomalies</CardDescription>
              </CardHeader>
              <CardContent>
                {outliersLoading ? (
                  <p className="text-sm text-muted-foreground">Loading outlier analysis…</p>
                ) : (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Salary"
                          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                        />
                        <YAxis type="number" dataKey="y" name="Tenure (Years)" />
                        <ZAxis type="number" dataKey="z" range={[50, 400]} />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number, name: string) => [
                            name === 'Salary' ? formatCurrency(value) : value,
                            name,
                          ]}
                        />
                        <Scatter
                          data={outlierPoints.filter((d) => !d.isOutlier)}
                          fill="hsl(var(--primary))"
                        />
                        <Scatter
                          data={outlierPoints.filter((d) => d.isOutlier)}
                          fill="hsl(var(--destructive))"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outlier Settings</CardTitle>
                <CardDescription>Configure detection sensitivity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Z-Score Threshold: {outlierThreshold[0]}</Label>
                  <Slider
                    value={outlierThreshold}
                    onValueChange={setOutlierThreshold}
                    min={1}
                    max={4}
                    step={0.5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Values beyond {outlierThreshold[0]} standard deviations flagged as outliers
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Detected Outliers</h4>
                  {detectedOutliers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No salary outliers at this threshold.</p>
                  ) : (
                    detectedOutliers.slice(0, 10).map((outlier) => (
                      <div key={outlier.id} className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{outlier.id}</span>
                          <Badge variant="destructive">Outlier</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {outlier.field}: {formatCurrency(outlier.value, outlier.currency)} ({outlier.reason})
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <Button variant="outline" className="w-full" onClick={handleOutliers} disabled={isHandlingOutliers}>
                  {isHandlingOutliers ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Handling...
                    </>
                  ) : (
                    <>
                      <Filter className="h-4 w-4 mr-2" />
                      Handle Outliers
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Feature Engineering Workspace
              </CardTitle>
              <CardDescription>Create and configure derived features for ML models</CardDescription>
            </CardHeader>
            <CardContent>
              {featuresLoading ? (
                <p className="text-sm text-muted-foreground">Loading feature configuration…</p>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    {features.map((feature) => (
                      <div
                        key={feature.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          feature.enabled ? 'border-primary/50 bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={feature.enabled}
                              onCheckedChange={(checked) => toggleFeature(feature.id, checked)}
                            />
                            <div>
                              <p className="font-medium">{feature.name}</p>
                              <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                    <h4 className="font-medium mb-2">Feature Preview</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>Selected features will generate the following columns:</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {features.filter((f) => f.enabled).map((f) => (
                          <Badge key={f.id} variant="secondary">{f.name}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle>Preprocessing Pipeline</CardTitle>
              <CardDescription>Automated data cleaning and transformation workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pipelineSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        step.status === 'completed'
                          ? 'bg-success text-success-foreground'
                          : step.status === 'running'
                          ? 'bg-primary text-primary-foreground animate-pulse'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : step.status === 'running' ? (
                        <RefreshCw className="h-5 w-5 animate-spin" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{step.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {step.status === 'completed' && (step.detail || `Completed in ${step.duration}`)}
                        {step.status === 'running' && 'Processing...'}
                        {step.status === 'pending' && 'Waiting'}
                      </p>
                    </div>
                    {step.status === 'completed' && (
                      <Badge variant="success">Done</Badge>
                    )}
                    {step.status === 'running' && (
                      <Badge variant="default">Running</Badge>
                    )}
                    {step.status === 'pending' && (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    {index < pipelineSteps.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="flex-1" onClick={runPipeline} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running Pipeline...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Full Pipeline
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={exportCleanData} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Clean Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
