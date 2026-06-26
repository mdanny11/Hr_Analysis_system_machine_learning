import { KPICard } from './KPICard';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, useAlerts } from '@/hooks/useApi';
import { Users, AlertTriangle, Heart, TrendingDown, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const engagementTrend = [
  { month: 'Jul', score: 7.2 }, { month: 'Aug', score: 7.0 },
  { month: 'Sep', score: 7.4 }, { month: 'Oct', score: 7.1 },
  { month: 'Nov', score: 7.6 }, { month: 'Dec', score: 7.8 },
];

const absenteeTrend = [
  { month: 'Jul', days: 12 }, { month: 'Aug', days: 15 },
  { month: 'Sep', days: 9 }, { month: 'Oct', days: 14 },
  { month: 'Nov', days: 11 }, { month: 'Dec', days: 8 },
];

const riskColors: Record<string, string> = {
  high: 'bg-rose-500/20 text-rose-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-emerald-500/20 text-emerald-400',
  critical: 'bg-rose-500/20 text-rose-400',
};

export function DeptHeadDashboard() {
  const { user } = useAuth();
  const dept = user?.department || 'Engineering';
  const { data: employeeData } = useEmployees({ department: dept, limit: 200 });
  const { data: alerts = [] } = useAlerts();

  const teamEmployees = employeeData?.items ?? [];
  const highRisk = teamEmployees.filter(e => e.attritionRisk === 'high');
  const avgPerf = teamEmployees.length > 0
    ? (teamEmployees.reduce((s, e) => s + e.performanceScore, 0) / teamEmployees.length).toFixed(1)
    : '0';

  const teamRiskList = teamEmployees
    .filter(e => e.attritionRisk !== 'low')
    .sort((a, b) => b.attritionProbability - a.attritionProbability)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">{dept} Department</h1>
        <p className="text-white/50">Team attrition risk, engagement, and alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <KPICard title="Team Size" value={teamEmployees.length.toString()} icon={Users} trend={{ value: 2, label: 'this quarter' }} />
        <KPICard title="High Risk" value={highRisk.length.toString()} icon={AlertTriangle} variant="danger" trend={{ value: highRisk.length > 3 ? 1 : -1, label: 'vs last month' }} />
        <KPICard title="Engagement Score" value="7.8" icon={Heart} variant="success" trend={{ value: 0.3, label: 'this month' }} />
        <KPICard title="Avg Performance" value={avgPerf} icon={TrendingDown} trend={{ value: 0.2, label: 'this quarter' }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Engagement Score Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={engagementTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <YAxis domain={[6.5, 8.5]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(250,30%,15%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Line type="monotone" dataKey="score" stroke="hsl(142,71%,45%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Absentee Days (Team Total)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={absenteeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(250,30%,15%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Bar dataKey="days" fill="hsl(38,92%,50%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Team Risk List</h3>
          <div className="space-y-2">
            {teamRiskList.map((emp) => (
              <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-white">
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-white/40">{emp.position}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${riskColors[emp.attritionRisk]}`}>
                  {emp.attritionProbability}%
                </div>
              </div>
            ))}
            {teamRiskList.length === 0 && <p className="text-sm text-white/40 text-center py-4">No at-risk employees</p>}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-white/60" />
            <h3 className="text-sm font-medium text-white/60">Recent Alerts</h3>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 4).map((alert: Record<string, unknown>, i: number) => {
              const employee = alert.employee as Record<string, string> | null;
              return (
                <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${riskColors[String(alert.type)] || riskColors.medium}`}>
                      {String(alert.type)}
                    </span>
                  </div>
                  <p className="text-xs text-white/50">{String(alert.reason)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
