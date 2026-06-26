import { KPICard } from './KPICard';
import { useModels, useFeatureImportance } from '@/hooks/useApi';
import {
  Database, Brain, Target, Activity,
  CheckCircle2, AlertTriangle, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, LineChart, Line
} from 'recharts';

const dataQuality = [
  { metric: 'Completeness', score: 94 },
  { metric: 'Accuracy', score: 91 },
  { metric: 'Consistency', score: 88 },
  { metric: 'Timeliness', score: 96 },
  { metric: 'Validity', score: 92 },
];

const trainingHistory = [
  { run: 'Run 1', accuracy: 82.1, f1: 80.5 },
  { run: 'Run 2', accuracy: 84.7, f1: 83.2 },
  { run: 'Run 3', accuracy: 86.3, f1: 85.1 },
  { run: 'Run 4', accuracy: 87.2, f1: 86.7 },
  { run: 'Run 5', accuracy: 89.4, f1: 89.1 },
];

const confusionMatrix = [
  { predicted: 'Stay', stayActual: 412, leaveActual: 23 },
  { predicted: 'Leave', stayActual: 18, leaveActual: 87 },
];

const pipelineStages = [
  { name: 'Data Ingestion', status: 'success', duration: '2.3s' },
  { name: 'Feature Extraction', status: 'success', duration: '4.1s' },
  { name: 'Normalization', status: 'success', duration: '1.2s' },
  { name: 'Model Inference', status: 'running', duration: '...' },
  { name: 'Post-processing', status: 'pending', duration: '—' },
];

const statusColors: Record<string, string> = {
  success: 'bg-emerald-500/20 text-emerald-400',
  running: 'bg-amber-500/20 text-amber-400',
  pending: 'bg-white/10 text-white/40',
};

export function HRAnalystDashboard() {
  const { data: predictionModels = [] } = useModels();
  const bestModel = predictionModels.length
    ? predictionModels.reduce((a, b) => a.accuracy > b.accuracy ? a : b)
    : null;
  const { data: featureImportance = [] } = useFeatureImportance(bestModel?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">HR Analyst Dashboard</h1>
        <p className="text-white/50">Data science — models, pipelines, and quality</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <KPICard title="Dataset Records" value="12,450" icon={Database} trend={{ value: 2.1, label: 'new this week' }} />
        <KPICard title="Best Model Accuracy" value={bestModel ? `${(bestModel.accuracy * 100).toFixed(1)}%` : '—'} icon={Brain} variant="success" trend={{ value: 1.2, label: 'vs baseline' }} />
        <KPICard title="Data Quality Score" value="92.2%" icon={Target} trend={{ value: 0.8, label: 'this month' }} />
        <KPICard title="Pipeline Health" value="4/5" icon={Activity} variant="warning" trend={{ value: -1, label: 'stage pending' }} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feature Importance */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Feature Importance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={featureImportance.slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} />
              <YAxis dataKey="feature" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} width={110} />
              <Tooltip contentStyle={{ background: 'hsl(250,30%,15%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Bar dataKey="importance" fill="hsl(235,60%,55%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Training History */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Training History</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trainingHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="run" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <YAxis domain={[78, 92]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(250,30%,15%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Line type="monotone" dataKey="accuracy" stroke="hsl(235,60%,55%)" strokeWidth={2} dot={{ r: 4 }} name="Accuracy %" />
              <Line type="monotone" dataKey="f1" stroke="hsl(142,71%,45%)" strokeWidth={2} dot={{ r: 4 }} name="F1 Score %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Data Quality Radar */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Data Quality Radar</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={dataQuality}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
              <PolarRadiusAxis domain={[70, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <Radar name="Score" dataKey="score" stroke="hsl(235,60%,55%)" fill="hsl(235,60%,55%)" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Confusion Matrix (Best Model)</h3>
          <div className="grid grid-cols-3 gap-1 max-w-xs mx-auto text-center">
            <div />
            <div className="text-xs text-white/50 py-2">Actual Stay</div>
            <div className="text-xs text-white/50 py-2">Actual Leave</div>
            {confusionMatrix.map((row, i) => (
              <>
                <div key={`label-${i}`} className="text-xs text-white/50 flex items-center justify-end pr-2">Pred. {row.predicted}</div>
                <div key={`stay-${i}`} className={`rounded-lg p-4 text-lg font-bold ${i === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{row.stayActual}</div>
                <div key={`leave-${i}`} className={`rounded-lg p-4 text-lg font-bold ${i === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{row.leaveActual}</div>
              </>
            ))}
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Pipeline Status</h3>
          <div className="space-y-3">
            {pipelineStages.map((stage, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[stage.status]}`}>
                  {stage.status.toUpperCase()}
                </div>
                <span className="text-sm text-white flex-1">{stage.name}</span>
                <span className="text-xs text-white/40 font-mono">{stage.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
