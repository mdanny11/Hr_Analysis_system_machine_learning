import { Briefcase, TrendingUp, Award, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'hired' | 'promotion' | 'transfer' | 'award';
  title: string;
  description: string;
  department?: string;
}

const iconMap = {
  hired: Briefcase,
  promotion: TrendingUp,
  transfer: ArrowUpRight,
  award: Award,
};

const colorMap = {
  hired: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  promotion: 'bg-primary/20 text-primary border-primary/30',
  transfer: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  award: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface Props {
  employeeName: string;
  hireDate: string;
  department: string;
  position: string;
  yearsAtCompany: number;
}

export function EmploymentTimeline({ employeeName, hireDate, department, position, yearsAtCompany }: Props) {
  // Generate realistic timeline events based on employee data
  const events: TimelineEvent[] = [];
  const hireYear = new Date(hireDate).getFullYear();

  events.push({
    id: '1', date: hireDate, type: 'hired',
    title: 'Joined the Company',
    description: `Started as a junior team member in ${department}`,
    department,
  });

  if (yearsAtCompany >= 2) {
    events.push({
      id: '2', date: `${hireYear + 1}-06-15`, type: 'award',
      title: 'Top Performer Award',
      description: 'Recognized for exceptional Q2 performance',
    });
  }

  if (yearsAtCompany >= 3) {
    events.push({
      id: '3', date: `${hireYear + 2}-03-01`, type: 'promotion',
      title: 'Promoted to Senior',
      description: `Advanced to senior role in ${department}`,
      department,
    });
  }

  if (yearsAtCompany >= 5) {
    events.push({
      id: '4', date: `${hireYear + 4}-01-10`, type: 'transfer',
      title: 'Department Transfer',
      description: `Moved to ${department} leadership track`,
      department,
    });
  }

  if (yearsAtCompany >= 6) {
    events.push({
      id: '5', date: `${hireYear + 5}-09-01`, type: 'promotion',
      title: `Promoted to ${position}`,
      description: 'Current role assignment',
      department,
    });
  }

  return (
    <div className="space-y-1">
      {events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((event, idx) => {
        const Icon = iconMap[event.type];
        return (
          <div key={event.id} className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${colorMap[event.type]} shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
              {idx < events.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
            </div>
            <div className="pb-6">
              <p className="text-xs text-white/50">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
              <p className="font-medium text-white/90 text-sm">{event.title}</p>
              <p className="text-xs text-white/50">{event.description}</p>
              {event.department && <Badge variant="outline" className="mt-1 text-[10px] border-white/10 text-white/50">{event.department}</Badge>}
            </div>
          </div>
        );
      })}
    </div>
  );
}