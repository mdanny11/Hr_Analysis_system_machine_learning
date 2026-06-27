import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/apiClient';
import { useAuditLogs, useAuditCompliance, useAuditPrivacy, queryKeys } from '@/hooks/useApi';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Lock,
  Eye,
  Database,
  Calendar,
  Clock,
  Info,
} from 'lucide-react';

const actionColors: Record<string, string> = {
  LOGIN: 'bg-success/10 text-success',
  LOGOUT: 'bg-muted text-muted-foreground',
  REGISTER: 'bg-primary/10 text-primary',
  VIEW: 'bg-primary/10 text-primary',
  EXPORT: 'bg-warning/10 text-warning',
  UPDATE: 'bg-secondary/10 text-secondary',
  DELETE: 'bg-destructive/10 text-destructive',
  RUN_MODEL: 'bg-chart-5/10 text-chart-5',
  CREATE: 'bg-primary/10 text-primary',
  IMPORT: 'bg-warning/10 text-warning',
};

export default function Audit() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: logs = [], isLoading, refetch } = useAuditLogs(debouncedSearch || undefined);
  const { data: complianceChecklist = [], isLoading: complianceLoading } = useAuditCompliance();
  const { data: privacy, isLoading: privacyLoading } = useAuditPrivacy();

  const applySearch = () => setDebouncedSearch(searchQuery.trim());

  const refetchAll = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: queryKeys.auditCompliance });
    queryClient.invalidateQueries({ queryKey: queryKeys.auditPrivacy });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await api.audit.export(debouncedSearch || undefined);
      toast.success('Audit logs exported', { description: 'CSV downloaded successfully' });
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof ApiError ? error.message : 'Could not export audit logs',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const compliantCount = complianceChecklist.filter((item) => item.status === 'compliant').length;
  const complianceScore = complianceChecklist.length
    ? Math.round((compliantCount / complianceChecklist.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit & Compliance</h1>
          <p className="text-muted-foreground">System activity logs and regulatory compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How this works</AlertTitle>
        <AlertDescription>
          <strong>Audit Logs</strong> are live from the database — login, employee changes, imports, ML training, and report exports.
          <strong> Compliance</strong> checks are computed from your current system state (RBAC, audit trail, trained models).
          <strong> Privacy Impact</strong> uses live employee counts from your dataset.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              />
            </div>
            <Button variant="secondary" onClick={applySearch}>Search</Button>
          </div>

          <Card className="glass-card">
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-6 text-muted-foreground">Loading audit logs...</p>
              ) : logs.length === 0 ? (
                <p className="p-6 text-muted-foreground">No audit logs match your search.</p>
              ) : (
                <div className="divide-y divide-border">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={actionColors[log.action] || 'bg-muted'}>{log.action}</Badge>
                          <span className="text-sm font-medium">{log.userName}</span>
                          <span className="text-xs text-muted-foreground">• {log.resource}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{log.details}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {log.ipAddress}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Compliance Score: {complianceLoading ? '—' : `${complianceScore}%`}
              </CardTitle>
              <CardDescription>Live checks for GDPR, security, and AI ethics</CardDescription>
              {!complianceLoading && <Progress value={complianceScore} className="mt-2" />}
            </CardHeader>
            <CardContent className="space-y-3">
              {complianceLoading ? (
                <p className="text-muted-foreground">Loading compliance checklist...</p>
              ) : (
                complianceChecklist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{item.item}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge variant={item.status === 'compliant' ? 'default' : item.status === 'warning' ? 'secondary' : 'destructive'}>
                      {item.status === 'compliant' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {item.status === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {item.status === 'non-compliant' && <XCircle className="h-3 w-3 mr-1" />}
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Privacy Impact Assessment
              </CardTitle>
              <CardDescription>Live summary of personal data processed by the HR system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {privacyLoading || !privacy ? (
                <p className="text-muted-foreground">Loading privacy summary...</p>
              ) : (
                <>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/30 text-center">
                      <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{privacy.employeeRecords.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Employee Records</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{privacy.dataCategories}</p>
                      <p className="text-sm text-muted-foreground">Data Categories</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{privacy.retentionPeriod}</p>
                      <p className="text-sm text-muted-foreground">Retention Period</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 rounded-lg border">
                      <p className="text-muted-foreground">Active employees</p>
                      <p className="text-xl font-bold">{privacy.activeEmployees.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-muted-foreground">Sensitive ML fields</p>
                      <p className="text-xl font-bold">{privacy.sensitiveFields}</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-muted-foreground">High-risk profiles</p>
                      <p className="text-xl font-bold">{privacy.highRiskEmployees.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
