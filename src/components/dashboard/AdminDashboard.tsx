import { KPICard } from './KPICard';
import { 
  Users, Shield, Activity, Server, 
  Clock, AlertTriangle, Key, Database,
  LogIn, UserCog
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const loginHistory = [
  { day: 'Mon', logins: 42 }, { day: 'Tue', logins: 58 },
  { day: 'Wed', logins: 65 }, { day: 'Thu', logins: 51 },
  { day: 'Fri', logins: 48 }, { day: 'Sat', logins: 12 },
  { day: 'Sun', logins: 8 },
];

const systemUsage = [
  { hour: '08:00', cpu: 35, memory: 52 }, { hour: '10:00', cpu: 62, memory: 68 },
  { hour: '12:00', cpu: 78, memory: 75 }, { hour: '14:00', cpu: 55, memory: 60 },
  { hour: '16:00', cpu: 70, memory: 72 }, { hour: '18:00', cpu: 30, memory: 48 },
];

const userActivity = [
  { name: 'Dashboard Views', value: 1240 },
  { name: 'Report Downloads', value: 340 },
  { name: 'Data Queries', value: 580 },
  { name: 'Model Runs', value: 120 },
];

const COLORS = ['hsl(235,60%,55%)', 'hsl(4,79%,55%)', 'hsl(38,92%,50%)', 'hsl(142,71%,45%)'];

const recentAuditLogs = [
  { user: 'Admin User', action: 'Updated role permissions', time: '2 min ago', severity: 'warning' },
  { user: 'HR Manager', action: 'Exported attrition report', time: '15 min ago', severity: 'info' },
  { user: 'HR Analyst', action: 'Trained XGBoost model', time: '1 hr ago', severity: 'info' },
  { user: 'Unknown IP', action: 'Failed login attempt', time: '2 hrs ago', severity: 'danger' },
  { user: 'System', action: 'Automatic backup completed', time: '4 hrs ago', severity: 'success' },
];

const severityColors: Record<string, string> = {
  info: 'bg-primary/20 text-primary',
  warning: 'bg-amber-500/20 text-amber-400',
  danger: 'bg-rose-500/20 text-rose-400',
  success: 'bg-emerald-500/20 text-emerald-400',
};

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">System Administration</h1>
        <p className="text-white/50">System health, users, and security overview</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <KPICard title="Total Users" value="128" icon={Users} trend={{ value: 4.2, label: 'this month' }} />
        <KPICard title="System Uptime" value="99.97%" icon={Server} variant="success" trend={{ value: 0.02, label: 'vs last month' }} />
        <KPICard title="Security Alerts" value="3" icon={Shield} variant="danger" trend={{ value: 2, label: 'new today' }} />
        <KPICard title="Active Sessions" value="34" icon={Activity} trend={{ value: -5, label: 'vs yesterday' }} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Activity Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">User Activity Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={userActivity} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                {userActivity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend formatter={(v) => <span className="text-xs text-white/70">{v}</span>} />
              <Tooltip contentStyle={{ background: 'hsl(250,30%,15%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Login History */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Login History (7 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={loginHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(250,30%,15%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Bar dataKey="logins" fill="hsl(235,60%,55%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* System Usage */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">System Resource Usage</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={systemUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(250,30%,15%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Area type="monotone" dataKey="cpu" stroke="hsl(4,79%,55%)" fill="hsl(4,79%,55%)" fillOpacity={0.15} name="CPU %" />
              <Area type="monotone" dataKey="memory" stroke="hsl(235,60%,55%)" fill="hsl(235,60%,55%)" fillOpacity={0.15} name="Memory %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audit Log Feed */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/60">Recent Audit Logs</h3>
            <span className="text-xs text-white/40">Last 24 hours</span>
          </div>
          <div className="space-y-3">
            {recentAuditLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${severityColors[log.severity]}`}>
                  {log.severity.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate"><span className="font-medium">{log.user}</span> — {log.action}</p>
                </div>
                <span className="text-xs text-white/40 whitespace-nowrap">{log.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-medium text-white/60">System Status</h3>
          {[
            { label: 'Database', status: 'Healthy', icon: Database, color: 'text-emerald-400' },
            { label: 'Auth Service', status: 'Online', icon: Key, color: 'text-emerald-400' },
            { label: 'ML Pipeline', status: 'Running', icon: Activity, color: 'text-amber-400' },
            { label: 'Backup', status: 'Completed', icon: Server, color: 'text-emerald-400' },
            { label: 'Integrations', status: '2 warnings', icon: AlertTriangle, color: 'text-amber-400' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-sm text-white flex-1">{item.label}</span>
              <span className={`text-xs font-medium ${item.color}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
