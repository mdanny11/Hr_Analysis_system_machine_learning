import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RiskDistributionChartProps {
  data: {
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  };
}

const COLORS = {
  Sales: 'hsl(280, 70%, 55%)',
  'Customer Support': 'hsl(200, 90%, 55%)',
  IT: 'hsl(142, 71%, 45%)',
  HR: 'hsl(38, 92%, 50%)',
};

const departmentData = [
  { name: 'Sales', value: 30.5, color: 'hsl(280, 70%, 55%)' },
  { name: 'Customer Support', value: 22.5, color: 'hsl(200, 90%, 55%)' },
  { name: 'IT', value: 17, color: 'hsl(142, 71%, 45%)' },
  { name: 'IT2', value: 816, color: 'hsl(38, 92%, 50%)' },
];

export function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">High-Risk Departments</h3>
        <div className="flex flex-col gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <p className="text-sm text-white/50 mb-4">This Month</p>
      
      <div className="h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={departmentData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {departmentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="glass-card rounded-lg p-3 text-white shadow-xl border border-white/10">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-2xl font-bold">{data.value}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm text-white/60">22.5%</span>
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="flex justify-between mt-4 text-center text-xs">
        <div>
          <p className="text-white font-semibold">30.5%</p>
          <p className="text-white/50">Sales</p>
        </div>
        <div>
          <p className="text-white font-semibold">22.5%</p>
          <p className="text-white/50">Customer<br/>Support</p>
        </div>
        <div>
          <p className="text-white font-semibold">17%</p>
          <p className="text-white/50">IT</p>
        </div>
        <div>
          <p className="text-white font-semibold text-amber-400">22.8%</p>
          <p className="text-white/50">816%<br/>IT</p>
        </div>
      </div>
    </div>
  );
}
