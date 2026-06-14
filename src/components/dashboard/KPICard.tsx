import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-primary/20 text-primary',
    trend: 'text-muted-foreground',
    trendUp: 'text-emerald-400',
    trendDown: 'text-rose-400',
  },
  success: {
    icon: 'bg-emerald-500/20 text-emerald-400',
    trend: 'text-emerald-400',
    trendUp: 'text-emerald-400',
    trendDown: 'text-rose-400',
  },
  warning: {
    icon: 'bg-amber-500/20 text-amber-400',
    trend: 'text-amber-400',
    trendUp: 'text-emerald-400',
    trendDown: 'text-rose-400',
  },
  danger: {
    icon: 'bg-rose-500/20 text-rose-400',
    trend: 'text-rose-400',
    trendUp: 'text-emerald-400',
    trendDown: 'text-rose-400',
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: KPICardProps) {
  const styles = variantStyles[variant];

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? styles.trendUp
      : trend.value < 0
      ? styles.trendDown
      : styles.trend
    : styles.trend;

  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-5 animate-fade-in relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 hover:border-white/20 cursor-default',
        className
      )}
    >
      {/* Subtle gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <p className="text-sm font-medium text-white/60">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
            {variant === 'danger' && (
              <span className="text-amber-400 text-lg">⚠</span>
            )}
          </div>
          
          {trend && TrendIcon && (
            <div className="flex items-center gap-1.5">
              <TrendIcon className={cn('h-4 w-4', trendColor)} />
              <span className={cn('text-sm font-medium', trendColor)}>
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-sm text-white/40">{trend.label}</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={cn('rounded-xl p-3 backdrop-blur-sm', styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
