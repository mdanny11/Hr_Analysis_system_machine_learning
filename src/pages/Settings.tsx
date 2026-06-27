import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/apiClient';
import {
  useSettingsSecurity,
  useSettingsNotifications,
  useSettingsSystem,
  useSettingsIntegrations,
  queryKeys,
} from '@/hooks/useApi';
import { api } from '@/services/api';
import {
  Shield,
  Lock,
  Bell,
  Database,
  Globe,
  Clock,
  Key,
  Mail,
  Server,
  Save,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: securityData, isLoading: securityLoading, refetch: refetchSecurity } = useSettingsSecurity();
  const { data: notificationData, isLoading: notificationsLoading } = useSettingsNotifications();
  const { data: systemData, isLoading: systemLoading } = useSettingsSystem();
  const { data: integrations = [], isLoading: integrationsLoading, refetch: refetchIntegrations } = useSettingsIntegrations();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState([30]);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(5);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);

  const [dataRetention, setDataRetention] = useState('90');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!securityData) return;
    setMfaEnabled(securityData.mfaRequired);
    setPasswordMinLength(securityData.passwordMinLength);
    setRequireSpecialChars(securityData.requireSpecialChars);
    setRequireNumbers(securityData.requireNumbers);
    setLoginAttempts(securityData.maxLoginAttempts);
    setSessionTimeout([securityData.sessionTimeoutMinutes]);
  }, [securityData]);

  useEffect(() => {
    if (!notificationData) return;
    setEmailNotifications(notificationData.emailNotifications);
    setRiskAlerts(notificationData.riskAlerts);
    setWeeklyDigest(notificationData.weeklyDigest);
    setSystemUpdates(notificationData.systemUpdates);
  }, [notificationData]);

  useEffect(() => {
    if (!systemData) return;
    setLanguage(systemData.language);
    setTimezone(systemData.timezone);
    setDateFormat(systemData.dateFormat);
    setDataRetention(systemData.dataRetentionDays);
  }, [systemData]);

  const refreshAll = () => {
    refetchSecurity();
    refetchIntegrations();
    queryClient.invalidateQueries({ queryKey: queryKeys.settingsNotifications });
    queryClient.invalidateQueries({ queryKey: queryKeys.settingsSystem });
  };

  const saveSecurity = async (section: string, payload: Record<string, unknown>) => {
    if (!isAdmin) return;
    setSaving(section);
    try {
      await api.settings.updateSecurity(payload);
      toast.success(`${section} saved`, { description: 'Security settings updated in the database.' });
      queryClient.invalidateQueries({ queryKey: queryKeys.settingsSecurity });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs() });
    } catch (error) {
      toast.error('Save failed', {
        description: error instanceof ApiError ? error.message : 'Could not update security settings',
      });
    } finally {
      setSaving(null);
    }
  };

  const saveNotifications = async () => {
    setSaving('notifications');
    try {
      await api.settings.updateNotifications({
        emailNotifications,
        riskAlerts,
        weeklyDigest,
        systemUpdates,
      });
      toast.success('Notification preferences saved');
      queryClient.invalidateQueries({ queryKey: queryKeys.settingsNotifications });
    } catch (error) {
      toast.error('Save failed', {
        description: error instanceof ApiError ? error.message : 'Could not update notifications',
      });
    } finally {
      setSaving(null);
    }
  };

  const saveSystem = async (section: string, payload: Record<string, unknown>) => {
    if (!isAdmin) return;
    setSaving(section);
    try {
      await api.settings.updateSystem(payload);
      toast.success(`${section} saved`, { description: 'System settings updated in the database.' });
      queryClient.invalidateQueries({ queryKey: queryKeys.settingsSystem });
    } catch (error) {
      toast.error('Save failed', {
        description: error instanceof ApiError ? error.message : 'Could not update system settings',
      });
    } finally {
      setSaving(null);
    }
  };

  const integrationBadge = (status: string) => {
    if (status === 'connected') return <Badge variant="success">Connected</Badge>;
    if (status === 'pending') return <Badge variant="secondary">Pending</Badge>;
    return <Badge variant="destructive">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage system configuration and preferences</p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How this works</AlertTitle>
        <AlertDescription>
          <strong>Security</strong> and <strong>System</strong> settings persist to the database (admin only to save).
          <strong> Notifications</strong> are stored system-wide. <strong>Integrations</strong> show live status — email reflects your SMTP config in <code>backend/.env</code>.
          MFA and password rules are saved for policy tracking; full enforcement is planned for a future release.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="glass-card border-white/10 p-1">
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Server className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Database className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-6">
          {securityLoading ? (
            <p className="text-muted-foreground">Loading security settings...</p>
          ) : (
            <>
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    <CardTitle className="text-white">Multi-Factor Authentication</CardTitle>
                  </div>
                  <CardDescription className="text-white/60">
                    Configure MFA requirements for all users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Require MFA for all users</p>
                      <p className="text-sm text-white/60">Enforce two-factor authentication system-wide</p>
                    </div>
                    <Switch
                      checked={mfaEnabled}
                      onCheckedChange={setMfaEnabled}
                      disabled={!isAdmin}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  {!isAdmin && (
                    <p className="text-xs text-amber-400">Admin access required to modify MFA settings</p>
                  )}
                  <Button
                    onClick={() => saveSecurity('MFA', { mfaRequired: mfaEnabled })}
                    disabled={!isAdmin || saving === 'MFA'}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving === 'MFA' ? 'Saving...' : 'Save MFA Settings'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <CardTitle className="text-white">Password Policy</CardTitle>
                  </div>
                  <CardDescription className="text-white/60">
                    Set password requirements for user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-white">Minimum Password Length</Label>
                      <Badge variant="outline" className="border-primary/50 text-primary">
                        {passwordMinLength} characters
                      </Badge>
                    </div>
                    <Slider
                      value={[passwordMinLength]}
                      onValueChange={([value]) => setPasswordMinLength(value)}
                      min={8}
                      max={24}
                      step={1}
                      disabled={!isAdmin}
                      className="w-full"
                    />
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Require special characters</p>
                      <p className="text-sm text-white/60">!@#$%^&* etc.</p>
                    </div>
                    <Switch
                      checked={requireSpecialChars}
                      onCheckedChange={setRequireSpecialChars}
                      disabled={!isAdmin}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Require numbers</p>
                      <p className="text-sm text-white/60">At least one numeric character</p>
                    </div>
                    <Switch
                      checked={requireNumbers}
                      onCheckedChange={setRequireNumbers}
                      disabled={!isAdmin}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-2">
                    <Label className="text-white">Max Login Attempts</Label>
                    <Select
                      value={String(loginAttempts)}
                      onValueChange={(value) => setLoginAttempts(Number(value))}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="3">3 attempts</SelectItem>
                        <SelectItem value="5">5 attempts</SelectItem>
                        <SelectItem value="10">10 attempts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() =>
                      saveSecurity('Password Policy', {
                        passwordMinLength,
                        requireSpecialChars,
                        requireNumbers,
                        maxLoginAttempts: loginAttempts,
                      })
                    }
                    disabled={!isAdmin || saving === 'Password Policy'}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving === 'Password Policy' ? 'Saving...' : 'Save Password Policy'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle className="text-white">Session Management</CardTitle>
                  </div>
                  <CardDescription className="text-white/60">
                    Configure session timeout and security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-white">Session Timeout (minutes)</Label>
                      <Badge variant="outline" className="border-primary/50 text-primary">
                        {sessionTimeout[0]} min
                      </Badge>
                    </div>
                    <Slider
                      value={sessionTimeout}
                      onValueChange={setSessionTimeout}
                      min={5}
                      max={120}
                      step={5}
                      disabled={!isAdmin}
                      className="w-full"
                    />
                    <p className="text-xs text-white/50">
                      Policy value stored in settings (JWT expiry is configured separately in backend config)
                    </p>
                  </div>

                  <Button
                    onClick={() => saveSecurity('Session', { sessionTimeoutMinutes: sessionTimeout[0] })}
                    disabled={!isAdmin || saving === 'Session'}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving === 'Session' ? 'Saving...' : 'Save Session Settings'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle className="text-white">Email Notifications</CardTitle>
              </div>
              <CardDescription className="text-white/60">
                Configure email notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationsLoading ? (
                <p className="text-muted-foreground">Loading notification settings...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Email Notifications</p>
                      <p className="text-sm text-white/60">Receive notifications via email</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} className="data-[state=checked]:bg-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">High Risk Alerts</p>
                      <p className="text-sm text-white/60">Immediate alerts for high attrition risk</p>
                    </div>
                    <Switch checked={riskAlerts} onCheckedChange={setRiskAlerts} className="data-[state=checked]:bg-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Weekly Digest</p>
                      <p className="text-sm text-white/60">Summary of weekly analytics</p>
                    </div>
                    <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} className="data-[state=checked]:bg-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">System Updates</p>
                      <p className="text-sm text-white/60">Platform updates and maintenance</p>
                    </div>
                    <Switch checked={systemUpdates} onCheckedChange={setSystemUpdates} className="data-[state=checked]:bg-primary" />
                  </div>
                  <Button onClick={saveNotifications} disabled={saving === 'notifications'} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    {saving === 'notifications' ? 'Saving...' : 'Save Notification Preferences'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {systemLoading ? (
            <p className="text-muted-foreground">Loading system settings...</p>
          ) : (
            <>
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <CardTitle className="text-white">Regional Settings</CardTitle>
                  </div>
                  <CardDescription className="text-white/60">
                    Configure language, timezone, and date formats
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="EST">Eastern (EST)</SelectItem>
                          <SelectItem value="PST">Pacific (PST)</SelectItem>
                          <SelectItem value="GMT">GMT</SelectItem>
                          <SelectItem value="WAT">West Africa (WAT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Date Format</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => saveSystem('Regional Settings', { language, timezone, dateFormat })}
                    disabled={!isAdmin || saving === 'Regional Settings'}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving === 'Regional Settings' ? 'Saving...' : 'Save Regional Settings'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <CardTitle className="text-white">Data Management</CardTitle>
                  </div>
                  <CardDescription className="text-white/60">
                    Configure data retention and storage settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Data Retention Period</Label>
                    <Select value={dataRetention} onValueChange={setDataRetention} disabled={!isAdmin}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-white/50">
                      Retention policy stored in settings — automated purge not yet implemented
                    </p>
                  </div>
                  <Button
                    onClick={() => saveSystem('Data Management', { dataRetentionDays: dataRetention })}
                    disabled={!isAdmin || saving === 'Data Management'}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving === 'Data Management' ? 'Saving...' : 'Save Data Settings'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Connected Integrations</CardTitle>
              <CardDescription className="text-white/60">
                Live status from the database and SMTP configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationsLoading ? (
                <p className="text-muted-foreground">Loading integrations...</p>
              ) : integrations.length === 0 ? (
                <p className="text-muted-foreground">No integrations configured.</p>
              ) : (
                integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        {integration.key === 'Email' ? (
                          <Mail className="h-5 w-5 text-primary" />
                        ) : integration.key === 'Slack' ? (
                          <Bell className="h-5 w-5 text-primary" />
                        ) : (
                          <Database className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">{integration.name}</p>
                        <p className="text-sm text-white/60">{integration.description}</p>
                      </div>
                    </div>
                    {integration.configurable ? (
                      <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/5">
                        Configure
                      </Button>
                    ) : (
                      integrationBadge(integration.status)
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
