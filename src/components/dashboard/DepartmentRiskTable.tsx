import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';

const attritionFactors = [
  { name: 'Workload imbalance', value: 35, color: 'hsl(280, 70%, 55%)' },
  { name: 'Lack of Recognition', value: 25, color: 'hsl(200, 90%, 55%)' },
  { name: 'Limited Growth', value: 20, color: 'hsl(142, 71%, 45%)' },
  { name: 'Compensation issues', value: 20, color: 'hsl(38, 92%, 50%)' },
];

export function DepartmentRiskTable() {
  return (
    <div className="glass-card rounded-2xl p-6 overflow-hidden animate-fade-in">
      <h3 className="text-lg font-semibold text-white mb-4">Attrition Factors</h3>
      
      <div className="h-[180px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={attritionFactors}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {attritionFactors.map((entry, index) => (
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
          <span className="text-lg font-semibold text-white">3%</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="space-y-2 mt-4">
        {attritionFactors.map((factor, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: factor.color }}
            />
            <span className="text-sm text-white/70">{factor.name}</span>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-white/40 mt-4">
        All recoser clonss mats<br/>
        intre:/ncessi.kord.
      </p>
      
      <Button 
        className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl"
        variant="outline"
      >
        View Suggestions
      </Button>
    </div>
  );
}
