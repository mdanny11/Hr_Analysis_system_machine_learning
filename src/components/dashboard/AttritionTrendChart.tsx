import { useAttritionTrends } from '@/hooks/useApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';

export function AttritionTrendChart() {
  const { data: attritionTrends = [] } = useAttritionTrends();

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Attrition Risk Overview</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl font-bold text-white">18.5%</span>
            <span className="text-sm text-rose-400 flex items-center gap-1">▼ -0.5% this month</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="bg-white/10 text-white hover:bg-white/20 rounded-lg px-4">Overview</Button>
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg px-4">By Department</Button>
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={attritionTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: 'hsl(250,30%,15%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(280, 70%, 60%)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="predicted" name="Predicted" stroke="hsl(200, 90%, 60%)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="hired" name="Hired" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
