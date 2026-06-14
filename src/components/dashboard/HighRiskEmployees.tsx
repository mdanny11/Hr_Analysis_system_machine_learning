import { useHighRiskEmployees } from '@/hooks/useApi';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export function HighRiskEmployees() {
  const { data: employees = [], isLoading } = useHighRiskEmployees();

  const highRiskEmployees = employees
    .filter(emp => emp.attritionRisk === 'high' || emp.attritionRisk === 'medium')
    .slice(0, 4);

  const getRiskBadge = (risk: string) => {
    if (risk === 'high') return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs">● High</Badge>;
    if (risk === 'medium') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">● Medium</Badge>;
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">● Low</Badge>;
  };

  if (isLoading) return <div className="glass-card rounded-2xl p-6 text-white/50">Loading...</div>;

  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
      <div className="p-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Employee Attrition Risk</h3>
      </div>
      <div className="px-5 py-2 grid grid-cols-[1fr_120px_80px_80px_140px] gap-4 text-xs text-white/40 border-b border-white/5">
        <span>Employee</span><span>Department</span><span>Risk</span><span>Score</span><span>Driver</span>
      </div>
      <div className="divide-y divide-white/5">
        {highRiskEmployees.map((employee) => (
          <div key={employee.id} className="px-5 py-3 grid grid-cols-[1fr_120px_80px_80px_140px] gap-4 items-center hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-white/10">
                <AvatarFallback className="bg-gradient-to-br from-primary/50 to-purple-500/50 text-white text-xs font-medium">
                  {employee.firstName[0]}{employee.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-white truncate">{employee.firstName} {employee.lastName}</span>
            </div>
            <span className="text-sm text-white/70 truncate">{employee.department}</span>
            <div>{getRiskBadge(employee.attritionRisk)}</div>
            <span className="text-sm text-white/70">{employee.attritionProbability}%</span>
            <span className="text-sm text-white/50 truncate">
              {employee.attritionProbability > 60 ? 'Lack of recent promotion' : 'Workload imbalance'}
            </span>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 flex justify-end border-t border-white/5">
        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 gap-1" onClick={() => toast.info('View all at-risk employees')}>
          View All<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
