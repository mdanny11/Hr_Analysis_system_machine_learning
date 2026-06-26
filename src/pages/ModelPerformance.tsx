import { useState } from 'react';
import { useModels } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  GitBranch,
  Clock,
  BarChart3,
  Target,
  Zap,
  Settings,
  Play,
  History,
  ArrowRightLeft,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const accuracyHistory = [
  { date: 'Week 1', accuracy: 0.872, precision: 0.845, recall: 0.891 },
  { date: 'Week 2', accuracy: 0.878, precision: 0.852, recall: 0.895 },
  { date: 'Week 3', accuracy: 0.881, precision: 0.858, recall: 0.892 },
  { date: 'Week 4', accuracy: 0.885, precision: 0.862, recall: 0.898 },
  { date: 'Week 5', accuracy: 0.882, precision: 0.855, recall: 0.894 },
  { date: 'Week 6', accuracy: 0.879, precision: 0.848, recall: 0.890 },
  { date: 'Week 7', accuracy: 0.875, precision: 0.842, recall: 0.885 },
  { date: 'Week 8', accuracy: 0.871, precision: 0.838, recall: 0.880 },
];

const driftMetrics = [
  { feature: 'Satisfaction Score', baseline: 7.2, current: 6.8, drift: -5.6, status: 'warning' },
  { feature: 'Overtime Hours', baseline: 12.5, current: 15.2, drift: 21.6, status: 'alert' },
  { feature: 'Years at Company', baseline: 4.8, current: 4.5, drift: -6.3, status: 'warning' },
  { feature: 'Monthly Income', baseline: 68000, current: 72000, drift: 5.9, status: 'ok' },
  { feature: 'Performance Score', baseline: 7.8, current: 7.6, drift: -2.6, status: 'ok' },
  { feature: 'Training Hours', baseline: 42, current: 38, drift: -9.5, status: 'warning' },
];

const modelVersions = [
  { version: 'v3.2.1', date: '2024-01-18', accuracy: 0.894, status: 'active', author: 'ML Team', changes: 'XGBoost hyperparameter tuning' },
  { version: 'v3.2.0', date: '2024-01-10', accuracy: 0.889, status: 'archived', author: 'ML Team', changes: 'Added new engagement features' },
  { version: 'v3.1.2', date: '2024-01-05', accuracy: 0.881, status: 'archived', author: 'ML Team', changes: 'Bug fix in preprocessing' },
  { version: 'v3.1.1', date: '2023-12-28', accuracy: 0.878, status: 'archived', author: 'ML Team', changes: 'Retraining with Q4 data' },
  { version: 'v3.1.0', date: '2023-12-15', accuracy: 0.872, status: 'archived', author: 'ML Team', changes: 'Neural network architecture update' },
];

const abTestResults = [
  { metric: 'Accuracy', modelA: 0.894, modelB: 0.887, winner: 'A', diff: '+0.7%' },
  { metric: 'Precision', modelA: 0.878, modelB: 0.882, winner: 'B', diff: '+0.5%' },
  { metric: 'Recall', modelA: 0.905, modelB: 0.891, winner: 'A', diff: '+1.6%' },
  { metric: 'F1 Score', modelA: 0.891, modelB: 0.886, winner: 'A', diff: '+0.6%' },
  { metric: 'AUC-ROC', modelA: 0.934, modelB: 0.928, winner: 'A', diff: '+0.6%' },
];

const retrainingSchedule = [
  { id: 1, name: 'Weekly Incremental', frequency: 'Every Sunday', lastRun: '2024-01-14', nextRun: '2024-01-21', enabled: true },
  { id: 2, name: 'Monthly Full Retrain', frequency: '1st of month', lastRun: '2024-01-01', nextRun: '2024-02-01', enabled: true },
  { id: 3, name: 'Drift-triggered', frequency: 'On drift alert', lastRun: '2024-01-10', nextRun: 'As needed', enabled: true },
  { id: 4, name: 'Quarterly Validation', frequency: 'Every 3 months', lastRun: '2024-01-01', nextRun: '2024-04-01', enabled: false },
];

const predictionFeedback = [
  { prediction: 'High Risk', actual: 'Left', correct: true, count: 42 },
  { prediction: 'High Risk', actual: 'Stayed', correct: false, count: 8 },
  { prediction: 'Low Risk', actual: 'Stayed', correct: true, count: 385 },
  { prediction: 'Low Risk', actual: 'Left', correct: false, count: 12 },
];

export default function ModelPerformance() {
  const { data: predictionModels = [] } = useModels();
  const [selectedModel, setSelectedModel] = useState('xgboost');

  const currentAccuracy = accuracyHistory[accuracyHistory.length - 1].accuracy;
  const accuracyTrend = currentAccuracy - accuracyHistory[0].accuracy;
  const driftAlerts = driftMetrics.filter(d => d.status === 'alert' || d.status === 'warning').length;

  const truePositives = predictionFeedback.find(p => p.prediction === 'High Risk' && p.correct)?.count || 0;
  const falsePositives = predictionFeedback.find(p => p.prediction === 'High Risk' && !p.correct)?.count || 0;
  const trueNegatives = predictionFeedback.find(p => p.prediction === 'Low Risk' && p.correct)?.count || 0;
  const falseNegatives = predictionFeedback.find(p => p.prediction === 'Low Risk' && !p.correct)?.count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Model Performance</h1>
          <p className="text-muted-foreground">Monitor, improve, and manage ML models</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xgboost">XGBoost Ensemble</SelectItem>
              <SelectItem value="random-forest">Random Forest</SelectItem>
              <SelectItem value="neural-network">Neural Network</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retrain Now
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(currentAccuracy * 100).toFixed(1)}%</p>
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
                <p className="text-sm text-muted-foreground">8-Week Trend</p>
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
                <p className="text-2xl font-bold">{driftAlerts}</p>
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
                <p className="text-2xl font-bold">v3.2.1</p>
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

        {/* Accuracy Tracking Tab */}
        <TabsContent value="accuracy">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Model Accuracy Over Time</CardTitle>
                <CardDescription>Weekly performance metrics tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accuracyHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0.8, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, '']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        name="Accuracy"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="precision"
                        name="Precision"
                        stroke="hsl(var(--success))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--success))' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="recall"
                        name="Recall"
                        stroke="hsl(var(--warning))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--warning))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Metrics</CardTitle>
                <CardDescription>Latest model performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {predictionModels.filter(m => m.type === 'xgboost')[0] && (
                  <>
                    {[
                      { name: 'Accuracy', value: 0.894, threshold: 0.85 },
                      { name: 'Precision', value: 0.878, threshold: 0.80 },
                      { name: 'Recall', value: 0.905, threshold: 0.85 },
                      { name: 'F1 Score', value: 0.891, threshold: 0.83 },
                      { name: 'AUC-ROC', value: 0.934, threshold: 0.90 },
                    ].map((metric) => (
                      <div key={metric.name} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{metric.name}</span>
                          <span className={`font-medium ${
                            metric.value >= metric.threshold ? 'text-success' : 'text-destructive'
                          }`}>
                            {(metric.value * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative">
                          <Progress value={metric.value * 100} className="h-2" />
                          <div
                            className="absolute top-0 w-0.5 h-2 bg-foreground/50"
                            style={{ left: `${metric.threshold * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Drift Detection Tab */}
        <TabsContent value="drift">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Feature Drift Detection
              </CardTitle>
              <CardDescription>Monitor data distribution changes that may affect model performance</CardDescription>
            </CardHeader>
            <CardContent>
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
                      <Badge
                        variant={
                          metric.status === 'alert' ? 'destructive' :
                          metric.status === 'warning' ? 'warning' : 'success'
                        }
                      >
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

              {driftAlerts > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Drift Alert
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {driftAlerts} features show significant drift from baseline. Consider retraining the model
                    to maintain prediction accuracy.
                  </p>
                  <Button size="sm" className="mt-3">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Trigger Retrain
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Loop Tab */}
        <TabsContent value="feedback">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Prediction Accuracy Feedback</CardTitle>
                <CardDescription>Comparing predictions against actual outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-center">
                    <p className="text-3xl font-bold text-success">{truePositives}</p>
                    <p className="text-sm text-muted-foreground">True Positives</p>
                    <p className="text-xs">Predicted High Risk → Left</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                    <p className="text-3xl font-bold text-destructive">{falsePositives}</p>
                    <p className="text-sm text-muted-foreground">False Positives</p>
                    <p className="text-xs">Predicted High Risk → Stayed</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                    <p className="text-3xl font-bold text-destructive">{falseNegatives}</p>
                    <p className="text-sm text-muted-foreground">False Negatives</p>
                    <p className="text-xs">Predicted Low Risk → Left</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-center">
                    <p className="text-3xl font-bold text-success">{trueNegatives}</p>
                    <p className="text-sm text-muted-foreground">True Negatives</p>
                    <p className="text-xs">Predicted Low Risk → Stayed</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span>Overall Accuracy</span>
                    <span className="font-bold">
                      {(((truePositives + trueNegatives) / (truePositives + trueNegatives + falsePositives + falseNegatives)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span>Precision (High Risk)</span>
                    <span className="font-bold">
                      {((truePositives / (truePositives + falsePositives)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span>Recall (High Risk)</span>
                    <span className="font-bold">
                      {((truePositives / (truePositives + falseNegatives)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback Collection</CardTitle>
                <CardDescription>Track prediction outcomes for model improvement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Pending Feedback</h4>
                  <p className="text-3xl font-bold text-primary">23</p>
                  <p className="text-sm text-muted-foreground">Predictions awaiting outcome verification</p>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">This Month</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Predictions Made</p>
                      <p className="text-xl font-bold">156</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Verified Outcomes</p>
                      <p className="text-xl font-bold">89</p>
                    </div>
                  </div>
                </div>

                <Button className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Record New Outcomes
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Retraining Tab */}
        <TabsContent value="retraining">
          <Card>
            <CardHeader>
              <CardTitle>Retraining Schedule</CardTitle>
              <CardDescription>Automated model retraining configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {retrainingSchedule.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <Switch checked={schedule.enabled} />
                      <div>
                        <p className="font-medium">{schedule.name}</p>
                        <p className="text-sm text-muted-foreground">{schedule.frequency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Last Run</p>
                        <p>{schedule.lastRun}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Next Run</p>
                        <p className="font-medium">{schedule.nextRun}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium mb-2">Retraining Configuration</h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Training Data Window</p>
                    <p className="font-medium">Last 12 months</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Validation Split</p>
                    <p className="font-medium">20% holdout</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Auto-deploy</p>
                    <p className="font-medium">If accuracy ≥ 85%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="ab-testing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                A/B Testing Results
              </CardTitle>
              <CardDescription>Compare model variants to identify the best performer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="p-4 rounded-lg border border-primary">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>Model A (Current)</Badge>
                    <Badge variant="success">Winner</Badge>
                  </div>
                  <h4 className="font-semibold">XGBoost v3.2.1</h4>
                  <p className="text-sm text-muted-foreground">Production model with latest features</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">Model B (Challenger)</Badge>
                  </div>
                  <h4 className="font-semibold">XGBoost v3.3.0-beta</h4>
                  <p className="text-sm text-muted-foreground">Experimental with new hyperparameters</p>
                </div>
              </div>

              <div className="space-y-3">
                {abTestResults.map((result) => (
                  <div
                    key={result.metric}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <span className="font-medium">{result.metric}</span>
                    <div className="flex items-center gap-8">
                      <div className={`text-right ${result.winner === 'A' ? 'text-success font-bold' : ''}`}>
                        <p className="text-sm">Model A</p>
                        <p>{(result.modelA * 100).toFixed(1)}%</p>
                      </div>
                      <div className={`text-right ${result.winner === 'B' ? 'text-success font-bold' : ''}`}>
                        <p className="text-sm">Model B</p>
                        <p>{(result.modelB * 100).toFixed(1)}%</p>
                      </div>
                      <Badge variant={result.winner === 'A' ? 'success' : 'secondary'}>
                        {result.winner}: {result.diff}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="flex-1">
                  <Zap className="h-4 w-4 mr-2" />
                  Promote Model A
                </Button>
                <Button variant="outline" className="flex-1">
                  Continue Testing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Version Control Tab */}
        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Model Version History
              </CardTitle>
              <CardDescription>Track and manage model versions with rollback capability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelVersions.map((version, index) => (
                  <div
                    key={version.version}
                    className={`p-4 rounded-lg border ${
                      version.status === 'active' ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <code className="px-2 py-1 rounded bg-muted text-sm font-mono">
                          {version.version}
                        </code>
                        {version.status === 'active' && (
                          <Badge variant="success">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{version.date}</span>
                        {version.status !== 'active' && (
                          <Button variant="outline" size="sm">
                            <History className="h-4 w-4 mr-1" />
                            Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Changes: </span>
                        <span>{version.changes}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>Accuracy: <strong>{(version.accuracy * 100).toFixed(1)}%</strong></span>
                        <span className="text-muted-foreground">by {version.author}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4">
                <Download className="h-4 w-4 mr-2" />
                Export Model Artifacts
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
