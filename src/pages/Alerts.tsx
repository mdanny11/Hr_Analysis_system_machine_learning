import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAlerts, useAlertRules, queryKeys } from '@/hooks/useApi';
import type { Employee } from '@/lib/types';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Settings,
  Send,
  Mail,
  MessageSquare,
  Phone,
  Filter,
  Calendar,
  TrendingUp,
  UserMinus,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface DisplayAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  employee: Employee;
  reason: string;
  triggeredAt: string;
  status: string;
  assignee: string;
}

function mapAlertType(severity: string): DisplayAlert['type'] {
  if (severity === 'critical') return 'critical';
  if (severity === 'high' || severity === 'medium') return 'warning';
  return 'info';
}

function formatCondition(condition: unknown): string {
  if (typeof condition === 'string') return condition;
  if (condition && typeof condition === 'object' && 'field' in condition) {
    const c = condition as { field: string; operator: string; value: number };
    return `${c.field} ${c.operator} ${c.value}`;
  }
  return '—';
}

const escalationWorkflow = [
  { level: 1, role: 'Direct Manager', timeframe: '24 hours', action: 'Initial review and acknowledgment' },
  { level: 2, role: 'HR Manager', timeframe: '48 hours', action: 'Intervention planning' },
  { level: 3, role: 'Department Head', timeframe: '72 hours', action: 'Resource allocation' },
  { level: 4, role: 'HR Director', timeframe: '1 week', action: 'Executive review' },
];

const notificationChannels = [
  { id: 'email', name: 'Email', icon: Mail, enabled: true },
  { id: 'slack', name: 'Slack', icon: MessageSquare, enabled: true },
  { id: 'teams', name: 'Microsoft Teams', icon: Users, enabled: false },
  { id: 'sms', name: 'SMS', icon: Phone, enabled: false },
];

const communicationTemplates = [
  { id: 1, name: 'Initial Outreach', subject: 'Let\'s Connect', type: 'email' },
  { id: 2, name: 'Manager Alert', subject: 'Team Member Risk Alert', type: 'email' },
  { id: 3, name: 'Follow-up Reminder', subject: 'Action Required: Employee Check-in', type: 'email' },
  { id: 4, name: 'Slack Notification', subject: 'Risk Alert', type: 'slack' },
];

export default function Alerts() {
  const queryClient = useQueryClient();
  const [riskThreshold, setRiskThreshold] = useState([70]);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [channels, setChannels] = useState(notificationChannels);
  const [isRunning, setIsRunning] = useState(false);

  const { data: alertsRaw = [] } = useAlerts();
  const { data: rulesRaw = [] } = useAlertRules();

  const alerts = useMemo<DisplayAlert[]>(
    () =>
      alertsRaw.map((alert) => {
        const employee = alert.employee as Employee | null;
        return {
          id: String(alert.id),
          type: mapAlertType(String(alert.type ?? 'info')),
          employee: employee ?? {
            id: '',
            employeeId: '',
            firstName: 'Unknown',
            lastName: 'Employee',
            email: '',
            department: '',
            position: '',
            hireDate: '',
            salary: 0,
            age: 0,
            gender: '',
            yearsAtCompany: 0,
            performanceScore: 0,
            satisfactionScore: 0,
            workLifeBalance: 0,
            lastPromotionYears: 0,
            trainingHours: 0,
            overtimeHours: 0,
            attritionRisk: 'medium',
            attritionProbability: 0,
            status: 'active',
          },
          reason: String(alert.reason ?? ''),
          triggeredAt: alert.triggeredAt
            ? new Date(String(alert.triggeredAt)).toLocaleString()
            : '—',
          status: String(alert.status ?? 'active'),
          assignee: String(alert.assignee ?? 'HR Manager'),
        };
      }),
    [alertsRaw],
  );

  const rules = useMemo(
    () =>
      rulesRaw.map((rule) => ({
        id: String(rule.id),
        name: String(rule.name),
        condition: formatCondition(rule.condition),
        enabled: Boolean(rule.enabled),
        priority: String(rule.name).toLowerCase().includes('attrition') ? 'critical' : 'warning',
      })),
    [rulesRaw],
  );

  const alertCounts = {
    critical: alerts.filter((a) => a.type === 'critical').length,
    warning: alerts.filter((a) => a.type === 'warning').length,
    pending: alerts.filter((a) => a.status === 'active' || a.status === 'pending').length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
  };

  const handleRunDetection = async () => {
    setIsRunning(true);
    toast.loading('Running detection algorithm...', { id: 'detection' });
    try {
      const result = await api.alerts.detect();
      await queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
      toast.success('Detection complete', {
        id: 'detection',
        description: `Created ${result.alertsCreated} new alert(s)`,
      });
    } catch {
      toast.error('Detection failed', { id: 'detection' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    try {
      await api.alerts.acknowledge(alertId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
      toast.success('Alert acknowledged', {
        description: `${alert?.employee.firstName} ${alert?.employee.lastName}`,
      });
    } catch {
      toast.error('Failed to acknowledge alert');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Early Warning System</h1>
          <p className="text-muted-foreground">Proactive alerts and escalation management</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => toast.info('Opening alert rules configuration')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Rules
          </Button>
          <Button
            disabled={isRunning}
            onClick={handleRunDetection}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Detection'}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertCounts.critical}</p>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
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
                <p className="text-2xl font-bold">{alertCounts.warning}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertCounts.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Action</p>
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
                <p className="text-2xl font-bold">{alertCounts.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="escalation">Escalation Workflow</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Notification Center</CardTitle>
                      <CardDescription>Alerts requiring attention</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toast.info('Opening filter options')}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedAlert === alert.id
                            ? 'border-primary ring-1 ring-primary'
                            : 'hover:border-primary/50'
                        } ${
                          alert.type === 'critical' ? 'border-l-4 border-l-destructive' :
                          alert.type === 'warning' ? 'border-l-4 border-l-warning' :
                          'border-l-4 border-l-primary'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <Avatar>
                            <AvatarFallback className={`${
                              alert.type === 'critical' ? 'bg-destructive/10 text-destructive' :
                              alert.type === 'warning' ? 'bg-warning/10 text-warning' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {alert.employee.firstName[0]}{alert.employee.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {alert.employee.firstName} {alert.employee.lastName}
                              </p>
                              <Badge
                                variant={
                                  alert.status === 'active' || alert.status === 'pending' ? 'destructive' :
                                  alert.status === 'acknowledged' ? 'warning' :
                                  alert.status === 'escalated' ? 'default' : 'success'
                                }
                              >
                                {alert.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{alert.reason}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {alert.triggeredAt}
                              </span>
                              <span>Assigned: {alert.assignee}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Respond to selected alert</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedAlert ? (
                  <>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="font-medium text-sm">
                        {alerts.find(a => a.id === selectedAlert)?.employee.firstName}{' '}
                        {alerts.find(a => a.id === selectedAlert)?.employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Risk: {alerts.find(a => a.id === selectedAlert)?.employee.attritionProbability}%
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Follow-up Note</Label>
                      <Textarea
                        placeholder="Add notes about the action taken..."
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => selectedAlert && handleAcknowledge(selectedAlert)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Acknowledge
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const alert = alerts.find(a => a.id === selectedAlert);
                          toast.info('Escalating to HR Manager', { description: `${alert?.employee.firstName} ${alert?.employee.lastName} - ${alert?.reason}` });
                        }}
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Escalate
                      </Button>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => {
                        const alert = alerts.find(a => a.id === selectedAlert);
                        toast.success('Meeting scheduled', { description: `1:1 with ${alert?.employee.firstName} ${alert?.employee.lastName} - Tomorrow at 10:00 AM` });
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Meeting
                    </Button>

                    <Button 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => {
                        const alert = alerts.find(a => a.id === selectedAlert);
                        if (followUpNote) {
                          toast.success('Message sent', { description: `To ${alert?.employee.firstName} ${alert?.employee.lastName}` });
                          setFollowUpNote('');
                        } else {
                          toast.error('Please enter a message', { description: 'Add a follow-up note before sending' });
                        }
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select an alert to take action
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alert Rules Tab */}
        <TabsContent value="rules">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Alert Configuration</CardTitle>
                <CardDescription>Configure risk detection thresholds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>High Risk Threshold</Label>
                    <span className="text-sm font-medium">{riskThreshold[0]}%</span>
                  </div>
                  <Slider
                    value={riskThreshold}
                    onValueChange={setRiskThreshold}
                    min={50}
                    max={90}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Employees with attrition probability above this threshold will trigger alerts
                  </p>
                </div>

                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={rule.enabled}
                          onCheckedChange={(checked) => {
                            toast.success(`${rule.name} ${checked ? 'enabled' : 'disabled'}`);
                          }}
                        />
                        <div>
                          <p className="font-medium text-sm">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">{rule.condition}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          rule.priority === 'critical' ? 'destructive' :
                          rule.priority === 'warning' ? 'warning' : 'secondary'
                        }
                      >
                        {rule.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Configure how alerts are delivered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {notificationChannels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      <Switch checked={channel.enabled} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Escalation Workflow Tab */}
        <TabsContent value="escalation">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Workflow</CardTitle>
              <CardDescription>Automatic escalation path for unresolved alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {escalationWorkflow.map((level, index) => (
                  <div key={level.level} className="flex items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        L{level.level}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{level.role}</p>
                        <p className="text-sm text-muted-foreground">{level.action}</p>
                      </div>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {level.timeframe}
                      </Badge>
                    </div>
                    {index < escalationWorkflow.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium mb-2">How it works</h4>
                <p className="text-sm text-muted-foreground">
                  When an alert is triggered, it's first assigned to the employee's direct manager.
                  If not acknowledged within the specified timeframe, the alert automatically escalates
                  to the next level until resolved.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure when and how you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Alert Types</h4>
                  {[
                    { name: 'Critical Alerts', description: 'High-risk employees requiring immediate action' },
                    { name: 'Warning Alerts', description: 'Moderate risk or concerning patterns' },
                    { name: 'Info Alerts', description: 'General notifications and updates' },
                    { name: 'Resolution Updates', description: 'When alerts are resolved' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch defaultChecked={i < 2} />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Delivery Schedule</h4>
                  <div className="space-y-2">
                    <Label>Notification Frequency</Label>
                    <Select defaultValue="immediate">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="hourly">Hourly Digest</SelectItem>
                        <SelectItem value="daily">Daily Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quiet Hours</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="time" defaultValue="22:00" />
                      <Input type="time" defaultValue="07:00" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Non-critical alerts will be held during quiet hours
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Communication Templates</CardTitle>
              <CardDescription>Pre-defined messages for alert responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {communicationTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 rounded-lg border hover:border-primary/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <Badge variant="outline">{template.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.subject}</p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                      Edit template →
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4">
                <Bell className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
