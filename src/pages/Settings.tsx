import { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Bell, 
  Database, 
  Globe, 
  Palette,
  Clock,
  Key,
  Mail,
  Server,
  Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Security Settings
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState([30]);
  const [passwordMinLength, setPasswordMinLength] = useState(12);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(5);

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);

  // System Settings
  const [dataRetention, setDataRetention] = useState('90');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

  const handleSave = (section: string) => {
    toast({
      title: 'Settings Saved',
      description: `${section} settings have been updated successfully.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage system configuration and preferences</p>
      </div>

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

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* MFA Settings */}
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
            </CardContent>
          </Card>

          {/* Password Policy */}
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
                  onValueChange={([v]) => setPasswordMinLength(v)}
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
                  onValueChange={(v) => setLoginAttempts(Number(v))}
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

              <Button onClick={() => handleSave('Password Policy')} disabled={!isAdmin} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Save Password Policy
              </Button>
            </CardContent>
          </Card>

          {/* Session Management */}
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
                  Users will be automatically logged out after {sessionTimeout[0]} minutes of inactivity
                </p>
              </div>

              <Button onClick={() => handleSave('Session')} disabled={!isAdmin} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Save Session Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Email Notifications</p>
                  <p className="text-sm text-white/60">Receive notifications via email</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">High Risk Alerts</p>
                  <p className="text-sm text-white/60">Immediate alerts for high attrition risk</p>
                </div>
                <Switch
                  checked={riskAlerts}
                  onCheckedChange={setRiskAlerts}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Weekly Digest</p>
                  <p className="text-sm text-white/60">Summary of weekly analytics</p>
                </div>
                <Switch
                  checked={weeklyDigest}
                  onCheckedChange={setWeeklyDigest}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">System Updates</p>
                  <p className="text-sm text-white/60">Platform updates and maintenance</p>
                </div>
                <Switch
                  checked={systemUpdates}
                  onCheckedChange={setSystemUpdates}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <Button onClick={() => handleSave('Notification')} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Save Notification Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
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

              <Button onClick={() => handleSave('Regional')} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Save Regional Settings
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
                  Audit logs and historical data will be retained for {dataRetention === 'unlimited' ? 'indefinitely' : `${dataRetention} days`}
                </p>
              </div>

              <Button onClick={() => handleSave('Data Management')} disabled={!isAdmin} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Save Data Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Connected Integrations</CardTitle>
              <CardDescription className="text-white/60">
                Manage external system integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Database className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">HRIS System</p>
                    <p className="text-sm text-white/60">Employee data synchronization</p>
                  </div>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Email Service</p>
                    <p className="text-sm text-white/60">Notification delivery</p>
                  </div>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Server className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">SSO Provider</p>
                    <p className="text-sm text-white/60">Single sign-on authentication</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/5">
                  Configure
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Slack Integration</p>
                    <p className="text-sm text-white/60">Team notifications</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/5">
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
