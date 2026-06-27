import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/apiClient';
import { ML_TRAINING_TIMEOUT_MS } from '@/lib/apiClient';
import {
  useModels,
  useModelPerformanceHistory,
  useModelVersions,
  useModelDrift,
  useModelFeedback,
  useModelComparison,
  useRetrainModel,
  queryKeys,
} from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  GitBranch,
  Target,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const METRIC_THRESHOLDS = [
  { key: 'accuracy' as const, name: 'Accuracy', threshold: 0.85 },
  { key: 'precision' as const, name: 'Precision', threshold: 0.8 },
  { key: 'recall' as const, name: 'Recall', threshold: 0.85 },
  { key: 'f1Score' as const, name: 'F1 Score', threshold: 0.83 },
  { key: 'auc' as const, name: 'AUC-ROC', threshold: 0.9 },
];

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ModelPerformance() {
  const queryClient = useQueryClient();
  const { data: models = [], isLoading: modelsLoading } = useModels();
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  useEffect(() => {
    if (models.length && !selectedModelId) {
      const recommended = models.find((model) => model.type === 'xgboost') ?? models.find((model) => model.status === 'active') ?? models[0];
      setSelectedModelId(recommended.id);
    }
  }, [models, selectedModelId]);

  const selectedModel = models.find((model) => model.id === selectedModelId);
  const { data: history = [], isLoading: historyLoading } = useModelPerformanceHistory(selectedModelId);
  const { data: versions = [], isLoading: versionsLoading } = useModelVersions(selectedModelId);
  const { data: driftMetrics = [], isLoading: driftLoading } = useModelDrift(selectedModelId);
  const { data: feedback, isLoading: feedbackLoading } = useModelFeedback(selectedModelId);
  const { data: comparison, isLoading: comparisonLoading } = useModelComparison();
  const retrainModel = useRetrainModel();

  const accuracyHistory = useMemo(() => {
    if (history.length) {
      return history.map((entry, index) => ({
        date: history.length > 1 ? formatShortDate(entry.recordedAt) : `Run ${index + 1}`,
        accuracy: entry.accuracy,
        precision: entry.precision,
        recall: entry.recall,
      }));
    }
    if (!selectedModel) return [];
    return [{
      date: 'Latest',
      accuracy: selectedModel.accuracy,
      precision: selectedModel.precision,
      recall: selectedModel.recall,
    }];
  }, [history, selectedModel]);

  const currentAccuracy = selectedModel?.accuracy ?? 0;
  const accuracyTrend = accuracyHistory.length > 1
    ? accuracyHistory[accuracyHistory.length - 1].accuracy - accuracyHistory[0].accuracy
    : 0;
  const driftAlerts = driftMetrics.filter((metric) => metric.status === 'alert' || metric.status === 'warning').length;
  const activeVersion = versions[0]?.version ?? (selectedModel?.lastTrained ? `v${formatShortDate(selectedModel.lastTrained).replace(/\s/g, '')}` : '—');

  const refetchPerformance = () => {
    if (!selectedModelId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.models });
    queryClient.invalidateQueries({ queryKey: queryKeys.modelPerformanceHistory(selectedModelId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.modelVersions(selectedModelId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.modelDrift(selectedModelId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.modelFeedback(selectedModelId, 70) });
    queryClient.invalidateQueries({ queryKey: queryKeys.modelComparison });
  };

  const handleRetrain = async () => {
    if (!selectedModelId || !selectedModel) return;
    toast.loading(`Retraining ${selectedModel.name}...`, { id: 'model-performance-retrain', duration: ML_TRAINING_TIMEOUT_MS });
    try {
      const updated = await retrainModel.mutateAsync(selectedModelId);
      toast.success('Model retrained', {
        id: 'model-performance-retrain',
        description: `${updated.name}: F1 ${formatPercent(updated.f1Score)}, AUC ${formatPercent(updated.auc)}`,
      });
      refetchPerformance();
    } catch (error) {
      toast.error('Retrain failed', {
        id: 'model-performance-retrain',
        description: error instanceof ApiError ? error.message : 'Could not retrain model',
      });
    }
  };

  if (modelsLoading) {
    return <p className="text-muted-foreground p-6">Loading model performance...</p>;
  }

  if (!models.length) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Model Performance</h1>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No models found</AlertTitle>
          <AlertDescription>
            Go to Predictions and run <strong>Train &amp; Run Predictions</strong> first to create and evaluate models.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Model Performance</h1>
          <p className="text-muted-foreground">Monitor, improve, and manage ML models</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refetchPerformance}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleRetrain} disabled={retrainModel.isPending || !selectedModelId}>
            <RefreshCw className={`h-4 w-4 mr-2 ${retrainModel.isPending ? 'animate-spin' : ''}`} />
            {retrainModel.isPending ? 'Retraining...' : 'Retrain Now'}
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How this works</AlertTitle>
        <AlertDescription>
          Metrics come from your last training run on {models.length} production models and {history.length || 1} recorded history entries.
          Drift compares older vs newer employee cohorts. Feedback compares ML risk scores against inactive employee outcomes.
          Retraining schedule and automated jobs are reference-only — use <strong>Retrain Now</strong> or Predictions for live training.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPercent(currentAccuracy)}</p>
                <p className="text-sm text-muted-foreground">Current Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${accuracyTrend >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {accuracyTrend >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">{(accuracyTrend * 100).toFixed(2)}%</p>
                <p className="text-sm text-muted-foreground">Training Trend</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${driftAlerts > 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
                <AlertTriangle className={`h-5 w-5 ${driftAlerts > 0 ? 'text-warning' : 'text-success'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{driftLoading ? '—' : driftAlerts}</p>
                <p className="text-sm text-muted-foreground">Drift Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeVersion}</p>
                <p className="text-sm text-muted-foreground">Active Version</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accuracy" className="space-y-6">
        <TabsList>
          <TabsTrigger value="accuracy">Accuracy Tracking</TabsTrigger>
          <TabsTrigger value="drift">Drift Detection</TabsTrigger>
          <TabsTrigger value="feedback">Feedback Loop</TabsTrigger>
          <TabsTrigger value="retraining">Retraining</TabsTrigger>
          <TabsTrigger value="ab-testing">A/B Testing</TabsTrigger>
          <TabsTrigger value="versions">Version Control</TabsTrigger>
        </TabsList>

        <TabsContent value="accuracy">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Model Accuracy Over Time</CardTitle>
                <CardDescription>
                  {history.length > 1 ? 'Metrics recorded after each training run' : 'Latest training metrics (retrain to build history)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {historyLoading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">Loading history...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={accuracyHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0.5, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [formatPercent(value), '']}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="precision" name="Precision" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="recall" name="Recall" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Metrics</CardTitle>
                <CardDescription>{selectedModel?.name ?? 'Selected model'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedModel && METRIC_THRESHOLDS.map((metric) => {
                  const value = selectedModel[metric.key];
                  return (
                    <div key={metric.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{metric.name}</span>
                        <span className={`font-medium ${value >= metric.threshold ? 'text-success' : 'text-destructive'}`}>
                          {formatPercent(value)}
                        </span>
                      </div>
                      <div className="relative">
                        <Progress value={value * 100} className="h-2" />
                        <div className="absolute top-0 w-0.5 h-2 bg-foreground/50" style={{ left: `${metric.threshold * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drift">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Feature Drift Detection
              </CardTitle>
              <CardDescription>Compares older vs newer employee cohorts in your dataset</CardDescription>
            </CardHeader>
            <CardContent>
              {driftLoading ? (
                <p className="text-muted-foreground">Loading drift metrics...</p>
              ) : driftMetrics.length === 0 ? (
                <p className="text-muted-foreground">Not enough employee data to compute drift.</p>
              ) : (
                <div className="space-y-4">
                  {driftMetrics.map((metric) => (
                    <div
                      key={metric.feature}
                      className={`p-4 rounded-lg border ${
                        metric.status === 'alert' ? 'border-destructive/50 bg-destructive/5' :
                        metric.status === 'warning' ? 'border-warning/50 bg-warning/5' :
                        'border-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {metric.status === 'alert' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {metric.status === 'warning' && <AlertTriangle className="h-4 w-4 text-warning" />}
                          {metric.status === 'ok' && <CheckCircle2 className="h-4 w-4 text-success" />}
                          <span className="font-medium">{metric.feature}</span>
                        </div>
                        <Badge variant={metric.status === 'alert' ? 'destructive' : metric.status === 'warning' ? 'warning' : 'success'}>
                          {metric.drift > 0 ? '+' : ''}{metric.drift.toFixed(1)}% drift
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Baseline</p>
                          <p className="font-medium">{metric.baseline.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current</p>
                          <p className="font-medium">{metric.current.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className={`font-medium capitalize ${
                            metric.status === 'alert' ? 'text-destructive' :
                            metric.status === 'warning' ? 'text-warning' : 'text-success'
                          }`}>
                            {metric.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {driftAlerts > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Drift Alert
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {driftAlerts} features shifted significantly between cohorts. Retrain to adapt the model to current data.
                  </p>
                  <Button size="sm" className="mt-3" onClick={handleRetrain} disabled={retrainModel.isPending}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Trigger Retrain
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Prediction Accuracy Feedback</CardTitle>
                <CardDescription>High-risk predictions (≥70%) vs inactive employee outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackLoading || !feedback ? (
                  <p className="text-muted-foreground">Loading feedback...</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-center">
                        <p className="text-3xl font-bold text-success">{feedback.truePositives}</p>
                        <p className="text-sm text-muted-foreground">True Positives</p>
                        <p className="text-xs">Predicted High Risk → Left</p>
                      </div>
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                        <p className="text-3xl font-bold text-destructive">{feedback.falsePositives}</p>
                        <p className="text-sm text-muted-foreground">False Positives</p>
                        <p className="text-xs">Predicted High Risk → Stayed</p>
                      </div>
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                        <p className="text-3xl font-bold text-destructive">{feedback.falseNegatives}</p>
                        <p className="text-sm text-muted-foreground">False Negatives</p>
                        <p className="text-xs">Predicted Low Risk → Left</p>
                      </div>
                      <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-center">
                        <p className="text-3xl font-bold text-success">{feedback.trueNegatives}</p>
                        <p className="text-sm text-muted-foreground">True Negatives</p>
                        <p className="text-xs">Predicted Low Risk → Stayed</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                        <span>Overall Accuracy</span>
                        <span className="font-bold">{formatPercent(feedback.overallAccuracy)}</span>
                      </div>
                      <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                        <span>Precision (High Risk)</span>
                        <span className="font-bold">{formatPercent(feedback.precision)}</span>
                      </div>
                      <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                        <span>Recall (High Risk)</span>
                        <span className="font-bold">{formatPercent(feedback.recall)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback Collection</CardTitle>
                <CardDescription>Live counts from scored employees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedback && (
                  <>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Employees Scored</h4>
                      <p className="text-3xl font-bold text-primary">{feedback.predictionsMade}</p>
                      <p className="text-sm text-muted-foreground">Employees with ML risk scores applied</p>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Outcome Coverage</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Inactive (Left)</p>
                          <p className="text-xl font-bold">{feedback.truePositives + feedback.falseNegatives}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Active (Stayed)</p>
                          <p className="text-xl font-bold">{feedback.trueNegatives + feedback.falsePositives}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="retraining">
          <Card>
            <CardHeader>
              <CardTitle>Retraining</CardTitle>
              <CardDescription>Manual retraining is live; scheduled jobs are not yet automated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="font-medium mb-2">Last trained</p>
                <p>{selectedModel?.lastTrained ? new Date(selectedModel.lastTrained).toLocaleString() : '—'}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Status: <Badge variant={selectedModel?.status === 'active' ? 'success' : 'secondary'}>{selectedModel?.status}</Badge>
                </p>
              </div>
              <Button onClick={handleRetrain} disabled={retrainModel.isPending}>
                <RefreshCw className={`h-4 w-4 mr-2 ${retrainModel.isPending ? 'animate-spin' : ''}`} />
                Retrain {selectedModel?.name ?? 'Model'}
              </Button>
              <p className="text-sm text-muted-foreground">
                For full pipeline training on all models, use Predictions → Train &amp; Run Predictions.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ab-testing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                A/B Testing Results
              </CardTitle>
              <CardDescription>Compares your top two models by production score</CardDescription>
            </CardHeader>
            <CardContent>
              {comparisonLoading ? (
                <p className="text-muted-foreground">Loading comparison...</p>
              ) : !comparison?.modelA || !comparison?.modelB ? (
                <p className="text-muted-foreground">Train at least two models to run an A/B comparison.</p>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className={`p-4 rounded-lg border ${comparison.overallWinner === 'A' ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge>Model A</Badge>
                        {comparison.overallWinner === 'A' && <Badge variant="success">Winner</Badge>}
                      </div>
                      <h4 className="font-semibold">{comparison.modelA.name}</h4>
                      <p className="text-sm text-muted-foreground">Production score {formatPercent(comparison.modelA.productionScore)}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${comparison.overallWinner === 'B' ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">Model B</Badge>
                        {comparison.overallWinner === 'B' && <Badge variant="success">Winner</Badge>}
                      </div>
                      <h4 className="font-semibold">{comparison.modelB.name}</h4>
                      <p className="text-sm text-muted-foreground">Production score {formatPercent(comparison.modelB.productionScore)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {comparison.metrics.map((result) => (
                      <div key={result.metric} className="flex items-center justify-between p-3 rounded-lg border">
                        <span className="font-medium">{result.metric}</span>
                        <div className="flex items-center gap-8">
                          <div className={`text-right ${result.winner === 'A' ? 'text-success font-bold' : ''}`}>
                            <p className="text-sm">Model A</p>
                            <p>{formatPercent(result.modelA)}</p>
                          </div>
                          <div className={`text-right ${result.winner === 'B' ? 'text-success font-bold' : ''}`}>
                            <p className="text-sm">Model B</p>
                            <p>{formatPercent(result.modelB)}</p>
                          </div>
                          <Badge variant={result.winner === 'A' ? 'success' : 'secondary'}>
                            {result.winner}: {result.diff}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Model Version History
              </CardTitle>
              <CardDescription>Recorded each time this model is retrained</CardDescription>
            </CardHeader>
            <CardContent>
              {versionsLoading ? (
                <p className="text-muted-foreground">Loading versions...</p>
              ) : versions.length === 0 ? (
                <p className="text-muted-foreground">No version history yet. Retrain to create the first version entry.</p>
              ) : (
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-4 rounded-lg border ${version.status === 'active' ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <code className="px-2 py-1 rounded bg-muted text-sm font-mono">{version.version}</code>
                          {version.status === 'active' && <Badge variant="success">Active</Badge>}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {version.deployedAt ? new Date(version.deployedAt).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{version.changes}</span>
                        {version.accuracy != null && (
                          <span>Accuracy: <strong>{formatPercent(version.accuracy)}</strong></span>
                        )}
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
