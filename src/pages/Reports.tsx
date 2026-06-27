import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { ApiError } from '@/lib/apiClient';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import {
  useKpis,
  useReportTemplates,
  useReportForecast,
  useTurnoverCost,
  useReportCorrelations,
  useScheduledReports,
  queryKeys,
} from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateReportDialog } from '@/components/reports/CreateReportDialog';
import { ScheduleReportDrawer } from '@/components/reports/ScheduleReportDrawer';
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  Plus,
  FileSpreadsheet,
  File,
  Send,
  Settings,
  Eye,
  Sparkles,
  Info,
  RefreshCw,
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
  ComposedChart,
} from 'recharts';

const templateIcons: Record<string, typeof FileText> = {
  summary: FileText,
  analysis: TrendingUp,
  comparison: BarChart3,
  financial: DollarSign,
  risk: PieChart,
};

const REPORT_SECTIONS = [
  'Executive Summary',
  'Risk Analysis',
  'Department Breakdown',
  'Recommendations',
] as const;

const CHART_PRIMARY = 'hsl(235, 60%, 55%)';
const CHART_SUCCESS = 'hsl(142, 71%, 45%)';
const CHART_WARNING = 'hsl(38, 92%, 50%)';

export default function Reports() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-01-31');
  const [selectedSections, setSelectedSections] = useState<string[]>([...REPORT_SECTIONS]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);

  const { data: kpiMetrics } = useKpis();
  const { data: reportTemplates = [], isLoading } = useReportTemplates();
  const { data: forecastData = [] } = useReportForecast();
  const { data: turnoverCostData } = useTurnoverCost();
  const { data: correlationData = [] } = useReportCorrelations();
  const { data: scheduledReportsRaw = [] } = useScheduledReports();

  const refetchReports = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reportTemplates });
    queryClient.invalidateQueries({ queryKey: queryKeys.reportForecast });
    queryClient.invalidateQueries({ queryKey: queryKeys.turnoverCost });
    queryClient.invalidateQueries({ queryKey: queryKeys.reportCorrelations });
    queryClient.invalidateQueries({ queryKey: queryKeys.scheduledReports });
    queryClient.invalidateQueries({ queryKey: queryKeys.kpis });
  };

  const turnoverCostBreakdown = turnoverCostData?.breakdown ?? [];
  const avgTurnoverCost = turnoverCostData?.avgTurnoverCost ?? 0;
  const monthlyTurnover = turnoverCostData?.monthlyTurnover ?? kpiMetrics?.monthlyTurnover ?? 0;
  const annualTurnoverCost = turnoverCostData?.annualImpact ?? avgTurnoverCost * monthlyTurnover * 12;

  const scheduledReports = useMemo(
    () =>
      scheduledReportsRaw.map((report) => ({
        id: String(report.id),
        name: `Report ${report.reportTemplateId}`,
        recipients: Array.isArray(report.recipients) ? report.recipients.length : 0,
        nextRun: String(report.startDate ?? ''),
        format: String(report.deliveryMethod ?? 'PDF').toUpperCase(),
      })),
    [scheduledReportsRaw],
  );

  const templatesWithIcons = useMemo(
    () =>
      reportTemplates.map((template) => ({
        ...template,
        id: String(template.id),
        icon: templateIcons[template.type] ?? FileText,
      })),
    [reportTemplates],
  );

  const toggleSection = (section: string) => {
    setSelectedSections((current) =>
      current.includes(section) ? current.filter((s) => s !== section) : [...current, section],
    );
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    const template = templatesWithIcons.find((t) => t.id === selectedTemplate);
    setIsPreviewing(true);
    try {
      const preview = await api.reports.preview({});
      toast.success(`Preview for ${template?.name}`, {
        description: `Attrition rate: ${preview.kpis.attritionRate}% • ${preview.departments.length} departments`,
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Preview failed';
      toast.error('Preview failed', { description: message });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExport = async () => {
    if (!selectedTemplate) return;
    const template = templatesWithIcons.find((t) => t.id === selectedTemplate);
    setIsExporting(true);
    try {
      await api.reports.export({
        templateId: selectedTemplate,
        reportName: template?.name,
        startDate,
        endDate,
        sections: selectedSections.join(','),
        format: exportFormat,
      });
      const formatLabel = exportFormat === 'excel' ? 'Excel (.xlsx)' : 'PDF';
      toast.success('Report exported', {
        description: `${template?.name} downloaded as ${formatLabel}`,
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Export failed';
      toast.error('Export failed', { description: message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dialogs */}
      <CreateReportDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} />
      <ScheduleReportDrawer open={scheduleDrawerOpen} onOpenChange={setScheduleDrawerOpen} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reporting & Analytics</h1>
          <p className="text-muted-foreground">Generate reports, analyze trends, and export insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetchReports} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline"
            onClick={() => setScheduleDrawerOpen(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
          <Button onClick={() => setReportDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How this works</AlertTitle>
        <AlertDescription>
          <strong>Preview &amp; Export</strong> pull live KPIs, risk, and department data from your 1,500+ employees.
          Turnover cost and correlations are computed from current salaries and ML risk scores.
          Forecast uses historical trends plus projected attrition ({kpiMetrics?.attritionRate ?? '—'}% today).
          Export downloads a real PDF or Excel (.xlsx) file with your selected sections.
        </AlertDescription>
      </Alert>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templatesWithIcons.length}</p>
                <p className="text-sm text-muted-foreground">Report Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledReports.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrencyCompact(avgTurnoverCost)}</p>
                <p className="text-sm text-muted-foreground">Avg Turnover Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingUp className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrencyCompact(annualTurnoverCost)}</p>
                <p className="text-sm text-muted-foreground">Annual Impact</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="forecasting">Attrition Forecasting</TabsTrigger>
          <TabsTrigger value="cost">Turnover Cost Calculator</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Analysis</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        {/* Report Templates Tab */}
        <TabsContent value="templates">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Available Templates</CardTitle>
                  <CardDescription>Select a template to generate a report</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {templatesWithIcons.map((template) => {
                      const Icon = template.icon;
                      return (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedTemplate === template.id
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold">{template.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {template.frequency} • Last: {template.lastGenerated}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>Configure and download report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4" />
                          PDF Document
                        </div>
                      </SelectItem>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Excel Spreadsheet (.xlsx)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Include Sections</Label>
                  <div className="space-y-2">
                    {REPORT_SECTIONS.map((section) => (
                      <div key={section} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSections.includes(section)}
                          onCheckedChange={() => toggleSection(section)}
                          id={section}
                        />
                        <label htmlFor={section} className="text-sm">{section}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    disabled={!selectedTemplate || isPreviewing}
                    onClick={handlePreview}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {isPreviewing ? 'Previewing...' : 'Preview'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={!selectedTemplate || isExporting}
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forecasting Tab */}
        <TabsContent value="forecasting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Attrition Forecasting
              </CardTitle>
              <CardDescription>ML-powered predictions for future attrition trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      fill="hsl(var(--primary) / 0.2)"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Actual"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--success))' }}
                      name="Predicted"
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="hsl(var(--warning))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--warning))' }}
                      name="Forecast"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm">Actual Attrition</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm">Model Prediction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm">Future Forecast</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Turnover Cost Tab */}
        <TabsContent value="cost">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown per Turnover</CardTitle>
                <CardDescription>Average cost components when an employee leaves</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={turnoverCostBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrencyCompact(v)} />
                      <YAxis dataKey="category" type="category" width={120} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Cost']}
                      />
                      <Bar dataKey="cost" fill={CHART_PRIMARY} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Calculator</CardTitle>
                <CardDescription>Estimate turnover impact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Turnover</p>
                      <p className="text-2xl font-bold">{monthlyTurnover}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Cost per Turnover</p>
                      <p className="text-2xl font-bold">{formatCurrency(avgTurnoverCost)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between p-3 rounded-lg border">
                    <span>Monthly Impact</span>
                    <span className="font-bold text-destructive">
                      {formatCurrency(avgTurnoverCost * monthlyTurnover)}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg border">
                    <span>Quarterly Impact</span>
                    <span className="font-bold text-destructive">
                      {formatCurrency(avgTurnoverCost * monthlyTurnover * 3)}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg border bg-destructive/5">
                    <span className="font-medium">Annual Impact</span>
                    <span className="font-bold text-destructive">
                      {formatCurrency(annualTurnoverCost)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Reducing attrition by just 10% could save approximately{' '}
                  <span className="font-medium text-success">
                    {formatCurrency(annualTurnoverCost * 0.1)}
                  </span>{' '}
                  annually.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Correlation Analysis Tab */}
        <TabsContent value="correlation">
          <Card>
            <CardHeader>
              <CardTitle>Factor Correlation with Attrition</CardTitle>
              <CardDescription>Statistical analysis of factors influencing employee turnover</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {correlationData.map((item) => (
                  <div key={item.factor} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.factor}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge
                        variant={
                          Math.abs(item.correlation) > 0.6 ? 'destructive' :
                          Math.abs(item.correlation) > 0.4 ? 'warning' : 'secondary'
                        }
                      >
                        r = {item.correlation.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`absolute h-full rounded-full ${
                          item.correlation < 0 ? 'bg-success' : 'bg-destructive'
                        }`}
                        style={{
                          width: `${Math.abs(item.correlation) * 100}%`,
                          left: item.correlation < 0 ? `${50 - Math.abs(item.correlation) * 50}%` : '50%',
                        }}
                      />
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-foreground/20" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium mb-2">Interpretation Guide</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span>Negative correlation: Higher value → Lower attrition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <span>Positive correlation: Higher value → Higher attrition</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Report Distribution</CardTitle>
              <CardDescription>Automated report generation and delivery</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.recipients} recipients • {report.format}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">Next run</p>
                        <p className="text-sm font-medium">{report.nextRun}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toast.info(`Editing ${report.name}`, { description: 'Opening schedule settings...' })}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toast.success(`Sending ${report.name} now`, { description: `Delivering to ${report.recipients} recipients...` })}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Scheduled Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
