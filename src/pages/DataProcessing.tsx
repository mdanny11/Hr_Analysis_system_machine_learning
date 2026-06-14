import { useState } from 'react';
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
  BarChart3,
  Filter,
  Sparkles,
  ArrowRight,
  Clock,
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

const dataQualityMetrics = [
  { field: 'Employee ID', completeness: 100, validity: 100, uniqueness: 100, status: 'good' },
  { field: 'Name', completeness: 100, validity: 98, uniqueness: 95, status: 'good' },
  { field: 'Email', completeness: 99, validity: 97, uniqueness: 100, status: 'good' },
  { field: 'Department', completeness: 100, validity: 100, uniqueness: 15, status: 'good' },
  { field: 'Salary', completeness: 95, validity: 92, uniqueness: 78, status: 'warning' },
  { field: 'Performance Score', completeness: 88, validity: 85, uniqueness: 45, status: 'warning' },
  { field: 'Satisfaction Score', completeness: 82, validity: 80, uniqueness: 42, status: 'warning' },
  { field: 'Last Promotion Date', completeness: 75, validity: 70, uniqueness: 35, status: 'error' },
  { field: 'Training Hours', completeness: 68, validity: 65, uniqueness: 55, status: 'error' },
];

const missingDataByField = [
  { field: 'Training Hours', missing: 32, percentage: 32 },
  { field: 'Last Promotion', missing: 25, percentage: 25 },
  { field: 'Satisfaction', missing: 18, percentage: 18 },
  { field: 'Performance', missing: 12, percentage: 12 },
  { field: 'Salary', missing: 5, percentage: 5 },
  { field: 'Email', missing: 1, percentage: 1 },
];

const outlierData = [
  { x: 45000, y: 2, z: 100, name: 'Normal' },
  { x: 55000, y: 3, z: 150, name: 'Normal' },
  { x: 65000, y: 5, z: 200, name: 'Normal' },
  { x: 75000, y: 7, z: 180, name: 'Normal' },
  { x: 85000, y: 8, z: 160, name: 'Normal' },
  { x: 95000, y: 10, z: 140, name: 'Normal' },
  { x: 105000, y: 12, z: 120, name: 'Normal' },
  { x: 250000, y: 2, z: 50, name: 'Outlier', isOutlier: true },
  { x: 15000, y: 15, z: 30, name: 'Outlier', isOutlier: true },
];

const pipelineSteps = [
  { id: 1, name: 'Data Import', status: 'completed', duration: '2.3s' },
  { id: 2, name: 'Schema Validation', status: 'completed', duration: '1.1s' },
  { id: 3, name: 'Missing Value Detection', status: 'completed', duration: '0.8s' },
  { id: 4, name: 'Outlier Detection', status: 'running', duration: '...' },
  { id: 5, name: 'Data Normalization', status: 'pending', duration: '-' },
  { id: 6, name: 'Feature Engineering', status: 'pending', duration: '-' },
  { id: 7, name: 'Export to ML Pipeline', status: 'pending', duration: '-' },
];

const featureEngineeringOptions = [
  { id: 'tenure_bucket', name: 'Tenure Buckets', description: 'Group years at company into categories', enabled: true },
  { id: 'salary_normalized', name: 'Salary Normalization', description: 'Min-max scaling of salary data', enabled: true },
  { id: 'satisfaction_binary', name: 'Satisfaction Binary', description: 'Convert to high/low satisfaction', enabled: false },
  { id: 'overtime_flag', name: 'Overtime Flag', description: 'Flag employees with >20 overtime hours', enabled: true },
  { id: 'promotion_gap', name: 'Promotion Gap', description: 'Years since last promotion', enabled: true },
  { id: 'engagement_score', name: 'Engagement Score', description: 'Composite engagement metric', enabled: false },
];

export default function DataProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [features, setFeatures] = useState(featureEngineeringOptions);
  const [outlierThreshold, setOutlierThreshold] = useState([2.5]);

  const overallQuality = Math.round(
    dataQualityMetrics.reduce((acc, m) => acc + (m.completeness + m.validity) / 2, 0) / dataQualityMetrics.length
  );

  const runPipeline = () => {
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 3000);
  };

  const toggleFeature = (id: string) => {
    setFeatures(prev =>
      prev.map(f => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Preprocessing</h1>
          <p className="text-muted-foreground">Clean, validate, and prepare data for ML models</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Data
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

      {/* Quality Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallQuality}%</p>
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
                <p className="text-2xl font-bold">
                  {dataQualityMetrics.filter(m => m.status === 'good').length}
                </p>
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
                <p className="text-2xl font-bold">
                  {missingDataByField.reduce((acc, m) => acc + m.missing, 0)}
                </p>
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
                <p className="text-2xl font-bold">
                  {outlierData.filter(d => d.isOutlier).length}
                </p>
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

        {/* Data Quality Tab */}
        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Field Quality Analysis
              </CardTitle>
              <CardDescription>Completeness, validity, and uniqueness metrics per field</CardDescription>
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

        {/* Missing Values Tab */}
        <TabsContent value="missing">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Missing Data Distribution</CardTitle>
                <CardDescription>Percentage of missing values by field</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Handling Strategy</CardTitle>
                <CardDescription>Configure how missing values should be handled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { field: 'Training Hours', strategy: 'Mean Imputation', action: 'Fill with 42.5 hrs' },
                  { field: 'Last Promotion', strategy: 'Median Imputation', action: 'Fill with hire date' },
                  { field: 'Satisfaction', strategy: 'KNN Imputation', action: 'Predict from similar employees' },
                  { field: 'Performance', strategy: 'Forward Fill', action: 'Use last known value' },
                  { field: 'Salary', strategy: 'Drop Records', action: 'Remove 5 incomplete rows' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.field}</p>
                      <p className="text-sm text-muted-foreground">{item.strategy}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{item.action}</Badge>
                    </div>
                  </div>
                ))}
                <Button className="w-full mt-4">
                  <Wand2 className="h-4 w-4 mr-2" />
                  Apply All Strategies
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Outlier Detection Tab */}
        <TabsContent value="outliers">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Salary vs Tenure Outliers</CardTitle>
                <CardDescription>Scatter plot showing potential data anomalies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Salary"
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
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
                          name === 'Salary' ? `$${value.toLocaleString()}` : value,
                          name,
                        ]}
                      />
                      <Scatter
                        data={outlierData.filter(d => !d.isOutlier)}
                        fill="hsl(var(--primary))"
                      />
                      <Scatter
                        data={outlierData.filter(d => d.isOutlier)}
                        fill="hsl(var(--destructive))"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
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
                  {[
                    { id: 'EMP00234', field: 'Salary', value: '$250,000', reason: 'Z-score: 3.2' },
                    { id: 'EMP00567', field: 'Salary', value: '$15,000', reason: 'Z-score: -2.8' },
                  ].map((outlier, i) => (
                    <div key={i} className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{outlier.id}</span>
                        <Badge variant="destructive">Outlier</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {outlier.field}: {outlier.value} ({outlier.reason})
                      </p>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Handle Outliers
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Engineering Tab */}
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
                          onCheckedChange={() => toggleFeature(feature.id)}
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
                    {features.filter(f => f.enabled).map(f => (
                      <Badge key={f.id} variant="secondary">{f.name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pipeline Tab */}
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
                        {step.status === 'completed' && `Completed in ${step.duration}`}
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
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Clean Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
