import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Award, Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Skill {
  name: string;
  level: number; // 0-100
  category: 'technical' | 'soft' | 'leadership';
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
  expiry?: string;
  status: 'active' | 'expiring' | 'expired';
}

const mockSkills: Skill[] = [
  { name: 'Data Analysis', level: 85, category: 'technical' },
  { name: 'Python', level: 72, category: 'technical' },
  { name: 'Communication', level: 90, category: 'soft' },
  { name: 'Team Leadership', level: 78, category: 'leadership' },
  { name: 'Project Management', level: 65, category: 'leadership' },
  { name: 'Problem Solving', level: 88, category: 'soft' },
];

const mockCertifications: Certification[] = [
  { name: 'SHRM-CP', issuer: 'SHRM', date: '2023-03-15', expiry: '2026-03-15', status: 'active' },
  { name: 'HR Analytics Certificate', issuer: 'AIHR', date: '2023-08-20', status: 'active' },
  { name: 'PMP', issuer: 'PMI', date: '2021-06-01', expiry: '2024-06-01', status: 'expiring' },
];

const categoryColors = {
  technical: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  soft: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  leadership: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const statusColors = {
  active: 'bg-emerald-500/20 text-emerald-300',
  expiring: 'bg-amber-500/20 text-amber-300',
  expired: 'bg-destructive/20 text-destructive',
};

export function SkillsTracker() {
  const [skills] = useState(mockSkills);
  const [certifications] = useState(mockCertifications);

  return (
    <div className="space-y-6">
      {/* Skills */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Skills
          </h4>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-white/50 hover:text-white" onClick={() => toast.info('Add skill dialog (prototype)')}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {skills.map(skill => (
            <div key={skill.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/80">{skill.name}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColors[skill.category]}`}>{skill.category}</Badge>
                </div>
                <span className="text-xs text-white/50">{skill.level}%</span>
              </div>
              <Progress value={skill.level} className="h-1.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Certifications
          </h4>
        </div>
        <div className="space-y-2">
          {certifications.map(cert => (
            <div key={cert.name} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/90">{cert.name}</span>
                <Badge className={`text-[10px] ${statusColors[cert.status]}`}>{cert.status}</Badge>
              </div>
              <p className="text-xs text-white/50 mt-1">{cert.issuer} · Issued {new Date(cert.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
              {cert.expiry && <p className="text-xs text-white/40">Expires {new Date(cert.expiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}