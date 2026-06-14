import { useState, useEffect } from 'react';
import type { AuditLog } from '@/lib/types';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Lock,
  Eye,
  Database,
  Calendar,
  Clock,
} from 'lucide-react';

const complianceChecklist = [
  { id: 1, category: 'Data Protection', item: 'GDPR Article 6 - Lawful basis for processing', status: 'compliant' },
  { id: 2, category: 'Data Protection', item: 'GDPR Article 7 - Valid consent mechanisms', status: 'compliant' },
  { id: 3, category: 'Data Protection', item: 'GDPR Article 17 - Right to erasure implementation', status: 'warning' },
  { id: 4, category: 'Data Protection', item: 'GDPR Article 20 - Data portability support', status: 'compliant' },
  { id: 5, category: 'Security', item: 'Encryption at rest (AES-256)', status: 'compliant' },
  { id: 6, category: 'Security', item: 'Encryption in transit (TLS 1.3)', status: 'compliant' },
  { id: 7, category: 'Security', item: 'Multi-factor authentication', status: 'compliant' },
  { id: 8, category: 'Security', item: 'Regular security audits', status: 'warning' },
  { id: 9, category: 'AI Ethics', item: 'Model explainability documentation', status: 'compliant' },
  { id: 10, category: 'AI Ethics', item: 'Bias testing and monitoring', status: 'warning' },
  { id: 11, category: 'AI Ethics', item: 'Human oversight for high-impact decisions', status: 'compliant' },
  { id: 12, category: 'Access Control', item: 'Role-based access control (RBAC)', status: 'compliant' },
  { id: 13, category: 'Access Control', item: 'Least privilege principle', status: 'compliant' },
  { id: 14, category: 'Access Control', item: 'Regular access reviews', status: 'non-compliant' },
];

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
};

export default function Audit() {
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (search?: string) => {
    try {
      const data = await api.audit.logs(search);
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(searchQuery || undefined), 5000);
    return () => clearInterval(interval);
  }, [searchQuery]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.userName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.resource.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  const compliantCount = complianceChecklist.filter((i) => i.status === 'compliant').length;
  const complianceScore = Math.round((compliantCount / complianceChecklist.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit & Compliance</h1>
          <p className="text-muted-foreground">System activity logs and regulatory compliance</p>
        </div>
        <Button variant="outline" onClick={() => fetchLogs(searchQuery || undefined)}>
          <Download className="h-4 w-4 mr-2" />
          Refresh Logs
        </Button>
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Card className="glass-card">
            <CardContent className="p-0">
              {loading ? (
                <p className="p-6 text-muted-foreground">Loading audit logs...</p>
              ) : (
                <div className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
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
                Compliance Score: {complianceScore}%
              </CardTitle>
              <CardDescription>GDPR, security, and AI ethics checklist</CardDescription>
              <Progress value={complianceScore} className="mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {complianceChecklist.map((item) => (
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
              ))}
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">500</p>
                  <p className="text-sm text-muted-foreground">Employee Records</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">Data Categories</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">7 yrs</p>
                  <p className="text-sm text-muted-foreground">Retention Period</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
