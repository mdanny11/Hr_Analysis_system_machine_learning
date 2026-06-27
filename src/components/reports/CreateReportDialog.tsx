import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, Save, Download, FileText, BarChart3, TrendingUp, PieChart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import { ApiError } from '@/lib/apiClient';

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reportTypes = [
  { value: 'attrition', label: 'Attrition Summary', icon: TrendingUp },
  { value: 'department', label: 'Department Risk', icon: BarChart3 },
  { value: 'engagement', label: 'Engagement Trends', icon: PieChart },
  { value: 'executive', label: 'Executive Summary', icon: FileText },
];

const availableMetrics = [
  'Attrition Rate',
  'Engagement Score',
  'Risk Distribution',
  'Turnover Cost',
  'Department Comparison',
  'Tenure Analysis',
  'Satisfaction Trends',
  'Prediction Accuracy',
];

interface PreviewData {
  kpis: Record<string, number>;
  departments: Array<Record<string, string | number>>;
}

export function CreateReportDialog({ open, onOpenChange }: CreateReportDialogProps) {
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-01-31');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'Attrition Rate',
    'Risk Distribution',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const handleGeneratePreview = async () => {
    if (!reportName) {
      toast.error('Please enter a report name');
      return;
    }
    if (!reportType) {
      toast.error('Please select a report type');
      return;
    }

    setIsGenerating(true);
    try {
      const preview = await api.reports.preview({
        name: reportName,
        type: reportType,
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        metrics: selectedMetrics,
      });
      setPreviewData(preview);
      setPreviewGenerated(true);
      toast.success('Preview generated', { description: 'Report preview is ready' });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Preview failed';
      toast.error('Preview failed', { description: message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName || !reportType) return;
    setIsSaving(true);
    try {
      await api.reports.create({
        name: reportName,
        type: reportType,
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        metrics: { selected: selectedMetrics },
      });
      toast.success('Report saved successfully', {
        description: `"${reportName}" has been saved to your reports`,
      });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Save failed';
      toast.error('Save failed', { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await api.reports.export({
        reportName,
        reportType,
        startDate,
        endDate,
        sections: 'Executive Summary,Risk Analysis,Department Breakdown,Recommendations',
        format: 'csv',
      });
      toast.success('Report exported', { description: `"${reportName}" downloaded as CSV` });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Export failed';
      toast.error('Export failed', { description: message });
    } finally {
      setIsExporting(false);
    }
  };

  const resetForm = () => {
    setReportName('');
    setReportType('');
    setSelectedMetrics(['Attrition Rate', 'Risk Distribution']);
    setPreviewGenerated(false);
    setPreviewData(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto glass-card border-white/10 p-0 data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out">
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-xl font-semibold text-white">
            Create New HR Report
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Configure your report parameters and generate a preview
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card border-white/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base text-white">Report Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Report Name</Label>
                    <Input
                      placeholder="e.g., Q1 Attrition Analysis"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      className="glass-input border-white/10 text-white placeholder:text-white/40"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger className="glass-input border-white/10 text-white">
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/10">
                        {reportTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Time Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="glass-input border-white/10 text-white"
                      />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="glass-input border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Metrics</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableMetrics.map((metric) => (
                        <Badge
                          key={metric}
                          variant={selectedMetrics.includes(metric) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-all ${
                            selectedMetrics.includes(metric)
                              ? 'bg-primary text-white'
                              : 'border-white/20 text-white/60 hover:border-white/40'
                          }`}
                          onClick={() => toggleMetric(metric)}
                        >
                          {metric}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleGeneratePreview}
                disabled={isGenerating}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Generate Preview
                  </>
                )}
              </Button>
            </div>

            <div className="lg:col-span-3">
              <Card className="glass-card border-white/10 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base text-white">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {previewGenerated && previewData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-primary">{previewData.kpis.attritionRate}%</p>
                          <p className="text-xs text-white/60">Attrition Rate</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-success">{previewData.kpis.avgSatisfaction}</p>
                          <p className="text-xs text-white/60">Engagement</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-warning">{previewData.kpis.highRiskCount}</p>
                          <p className="text-xs text-white/60">High Risk</p>
                        </div>
                      </div>

                      <div className="h-48 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto text-white/20 mb-2" />
                          <p className="text-sm text-white/40">Chart Preview</p>
                          <p className="text-xs text-white/30">{reportType || 'Select report type'}</p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                        <div className="grid grid-cols-4 gap-2 p-3 bg-white/5 text-xs text-white/60 font-medium">
                          <span>Department</span>
                          <span>Employees</span>
                          <span>Risk</span>
                          <span>Attrition</span>
                        </div>
                        {previewData.departments.map((dept) => (
                          <div
                            key={String(dept.fullName)}
                            className="grid grid-cols-4 gap-2 p-3 text-sm text-white/80 border-t border-white/5"
                          >
                            <span>{dept.fullName}</span>
                            <span>{dept.employeeCount}</span>
                            <Badge variant="outline" className="w-fit text-xs">
                              {Number(dept.avgRisk) >= 60 ? 'High' : Number(dept.avgRisk) >= 30 ? 'Medium' : 'Low'}
                            </Badge>
                            <span>{dept.attritionRate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto text-white/10 mb-4" />
                        <p className="text-white/40">Configure your report and click</p>
                        <p className="text-white/40">&quot;Generate Preview&quot; to see results</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-white/10 flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={() => { onOpenChange(false); resetForm(); }}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!previewGenerated || isExporting}
            className="glass-button border-white/20 text-white/80"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <Button
            onClick={handleSaveReport}
            disabled={!previewGenerated || isSaving}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
