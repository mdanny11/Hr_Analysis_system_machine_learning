import { useState } from 'react';
import { toast } from 'sonner';
import { X, Eye, Save, Download, FileText, BarChart3, TrendingUp, PieChart } from 'lucide-react';
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

export function CreateReportDialog({ open, onOpenChange }: CreateReportDialogProps) {
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-01-31');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'Attrition Rate',
    'Risk Distribution'
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState(false);

  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const handleGeneratePreview = () => {
    if (!reportName) {
      toast.error('Please enter a report name');
      return;
    }
    if (!reportType) {
      toast.error('Please select a report type');
      return;
    }
    
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setPreviewGenerated(true);
      toast.success('Preview generated (prototype)', {
        description: 'Report preview is ready'
      });
    }, 1500);
  };

  const handleSaveReport = () => {
    toast.success('Report saved successfully (prototype)', {
      description: `"${reportName}" has been saved to your reports`
    });
    onOpenChange(false);
    resetForm();
  };

  const handleExport = () => {
    toast.info('Export disabled (prototype)', {
      description: 'This feature would export the report in your chosen format'
    });
  };

  const resetForm = () => {
    setReportName('');
    setReportType('');
    setSelectedMetrics(['Attrition Rate', 'Risk Distribution']);
    setPreviewGenerated(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto glass-card border-white/10 p-0 data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-xl font-semibold text-white">
            Create New HR Report
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Configure your report parameters and generate a preview
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="p-6">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card border-white/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base text-white">Report Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Report Name */}
                  <div className="space-y-2">
                    <Label className="text-white/80">Report Name</Label>
                    <Input
                      placeholder="e.g., Q1 Attrition Analysis"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      className="glass-input border-white/10 text-white placeholder:text-white/40"
                    />
                  </div>

                  {/* Report Type */}
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

                  {/* Time Range */}
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

                  {/* Metrics Selection */}
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

            {/* Preview Panel */}
            <div className="lg:col-span-3">
              <Card className="glass-card border-white/10 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base text-white">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {previewGenerated ? (
                    <div className="space-y-4">
                      {/* Placeholder KPIs */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-primary">12.5%</p>
                          <p className="text-xs text-white/60">Attrition Rate</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-success">7.2</p>
                          <p className="text-xs text-white/60">Engagement</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-warning">28</p>
                          <p className="text-xs text-white/60">High Risk</p>
                        </div>
                      </div>

                      {/* Placeholder Chart */}
                      <div className="h-48 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto text-white/20 mb-2" />
                          <p className="text-sm text-white/40">Chart Preview</p>
                          <p className="text-xs text-white/30">{reportType || 'Select report type'}</p>
                        </div>
                      </div>

                      {/* Placeholder Table */}
                      <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                        <div className="grid grid-cols-4 gap-2 p-3 bg-white/5 text-xs text-white/60 font-medium">
                          <span>Department</span>
                          <span>Employees</span>
                          <span>Risk</span>
                          <span>Trend</span>
                        </div>
                        {['Engineering', 'Sales', 'Marketing'].map((dept) => (
                          <div key={dept} className="grid grid-cols-4 gap-2 p-3 text-sm text-white/80 border-t border-white/5">
                            <span>{dept}</span>
                            <span>{Math.floor(Math.random() * 50) + 20}</span>
                            <Badge variant="outline" className="w-fit text-xs">
                              {['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]}
                            </Badge>
                            <span className="text-success">↓ 2.1%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto text-white/10 mb-4" />
                        <p className="text-white/40">Configure your report and click</p>
                        <p className="text-white/40">"Generate Preview" to see results</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
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
            disabled={!previewGenerated}
            className="glass-button border-white/20 text-white/80"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            onClick={handleSaveReport}
            disabled={!previewGenerated}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
