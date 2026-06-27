import { DollarSign, TrendingUp, Gift, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Employee } from '@/lib/types';

interface Props {
  employee: Employee;
}

import { DEFAULT_CURRENCY, formatCurrency } from '@/lib/currency';

function formatMoney(amount: number, currency = DEFAULT_CURRENCY): string {
  return formatCurrency(amount, currency);
}

export function CompensationSection({ employee }: Props) {
  const { salary, currency = 'RWF', department, yearsAtCompany } = employee;
  const bonus = Math.round(salary * 0.12);
  const stockOptions = yearsAtCompany >= 3 ? Math.round(salary * 0.08) : 0;
  const totalComp = salary + bonus + stockOptions;
  const marketMedian = Math.round(salary * 0.95);
  const compaRatio = marketMedian > 0 ? Math.round((salary / marketMedian) * 100) : 100;

  const items = [
    { icon: DollarSign, label: 'Base Salary', value: formatMoney(salary, currency), sub: 'Annual', color: 'text-emerald-400' },
    { icon: TrendingUp, label: 'Performance Bonus', value: formatMoney(bonus, currency), sub: '12% target', color: 'text-primary' },
    {
      icon: Gift,
      label: 'Stock Options',
      value: stockOptions ? formatMoney(stockOptions, currency) : 'Not eligible',
      sub: stockOptions ? '8% vesting' : 'Requires 3+ years',
      color: stockOptions ? 'text-purple-400' : 'text-white/30',
    },
    { icon: Wallet, label: 'Total Compensation', value: formatMoney(totalComp, currency), sub: 'All-in annual', color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-xs text-white/50">{item.label}</span>
            </div>
            <p className="text-sm font-semibold text-white/90">{item.value}</p>
            <p className="text-[10px] text-white/40">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/60">Market Compa-Ratio</span>
          <Badge variant="outline" className={`text-[10px] ${compaRatio >= 100 ? 'text-emerald-300 border-emerald-500/30' : 'text-amber-300 border-amber-500/30'}`}>
            {compaRatio}%
          </Badge>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${compaRatio >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(compaRatio, 130)}%`, maxWidth: '100%' }}
          />
        </div>
        <p className="text-[10px] text-white/40 mt-1">
          Market median for {department}: {formatMoney(marketMedian, currency)}
        </p>
      </div>
    </div>
  );
}
