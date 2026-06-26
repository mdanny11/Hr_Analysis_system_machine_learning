import { KPICard } from './KPICard';
import { AttritionTrendChart } from './AttritionTrendChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import { HighRiskEmployees } from './HighRiskEmployees';
import { DepartmentRiskTable } from './DepartmentRiskTable';
import { FeatureSlider } from './FeatureSlider';
import { useKpis } from '@/hooks/useApi';
import {
  Users, TrendingDown, AlertTriangle, DollarSign,
  Target, CheckCircle2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

const strategyProgress = [
  { strategy: 'Mentoring Program', progress: 78, target: 90 },
  { strategy: 'Flexible Work Policy', progress: 92, target: 95 },
  { strategy: 'Compensation Review', progress: 45, target: 80 },
  { strategy: 'Career Pathing', progress: 60, target: 85 },
];

const roiData = [
  { initiative: 'Mentoring', cost: 45, savings: 120 },
  { initiative: 'Flex Work', cost: 20, savings: 85 },
  { initiative: 'Training', cost: 60, savings: 95 },
  { initiative: 'Wellness', cost: 30, savings: 70 },
];

export function HRManagerDashboard() {
  const { data: kpiMetrics } = useKpis();

  return (
    <div className="space-y-6">
      <FeatureSlider />

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">HR Manager Dashboard</h1>
        <p className="text-white/50">Strategic overview — attrition, risk, and retention</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <KPICard title="Attrition Rate" value="18.5%" icon={TrendingDown} variant="warning" trend={{ value: -0.5, label: 'this month' }} />
        <KPICard title="High-Risk Employees" value="45" icon={AlertTriangle} variant="danger" trend={{ value: 3.1, label: 'this month' }} />
        <KPICard title="Retention ROI" value="$2.4M" icon={DollarSign} variant="success" trend={{ value: 12, label: 'annualized' }} />
        <KPICard title="Interventions Active" value="18" icon={Target} trend={{ value: 5, label: 'this quarter' }} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><AttritionTrendChart /></div>
        <RiskDistributionChart data={{
          lowRisk: kpiMetrics?.lowRiskCount ?? 0,
          mediumRisk: kpiMetrics?.mediumRiskCount ?? 0,
          highRisk: kpiMetrics?.highRiskCount ?? 0,
        }} />
      </div>

      {/* Strategy & ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Progress */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Retention Strategy Progress</h3>
          <div className="space-y-4">
            {strategyProgress.map((s, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-white">{s.strategy}</span>
                  <span className="text-white/60">{s.progress}% / {s.target}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(s.progress / s.target) * 100}%`,
                      background: s.progress >= s.target ? 'hsl(142,71%,45%)' : s.progress >= s.target * 0.7 ? 'hsl(38,92%,50%)' : 'hsl(4,79%,55%)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Retention ROI Analysis ($K)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roiData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <YAxis dataKey="initiative" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} width={70} />
              <Tooltip contentStyle={{ background: 'hsl(250,30%,15%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Bar dataKey="cost" fill="hsl(4,79%,55%)" name="Cost" radius={[0, 4, 4, 0]} />
              <Bar dataKey="savings" fill="hsl(142,71%,45%)" name="Savings" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><HighRiskEmployees /></div>
        <DepartmentRiskTable />
      </div>
    </div>
  );
}
