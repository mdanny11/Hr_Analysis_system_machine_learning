import { toast } from 'sonner';
import { useRiskSummary, useRiskByTenure, useRiskBySalary, useRiskMatrix, useRiskByDepartment } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { AlertTriangle, TrendingUp, Users, Building, Target, Download } from 'lucide-react';

export default function RiskAnalysis() {
  const { data: summary } = useRiskSummary();
  const { data: riskByTenure = [] } = useRiskByTenure();
  const { data: riskBySalary = [] } = useRiskBySalary();
  const { data: riskMatrix = [] } = useRiskMatrix();
  const { data: deptData = [] } = useRiskByDepartment();

  const deptRadarData = deptData.slice(0, 6).map((d: Record<string, unknown>) => ({
    department: String(d.department || d.fullName || '').split(' ')[0],
    attritionRate: d.attritionRate,
    satisfaction: d.satisfaction,
    headCount: typeof d.headCount === 'number' ? (d.headCount / 150) * 100 : 50,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Analysis</h1>
          <p className="text-muted-foreground">Deep-dive into attrition risk factors and patterns</p>
        </div>
        <Button variant="outline" onClick={() => toast.success('Report export queued')}>
          <Download className="h-4 w-4 mr-2" />Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card"><CardContent className="pt-6"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /><div><p className="text-2xl font-bold">{summary?.highRisk ?? '—'}</p><p className="text-xs text-muted-foreground">High Risk</p></div></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-6"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-warning" /><div><p className="text-2xl font-bold">{summary?.mediumRisk ?? '—'}</p><p className="text-xs text-muted-foreground">Medium Risk</p></div></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-6"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-success" /><div><p className="text-2xl font-bold">{summary?.lowRisk ?? '—'}</p><p className="text-xs text-muted-foreground">Low Risk</p></div></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-6"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{summary?.avgRiskScore ?? '—'}%</p><p className="text-xs text-muted-foreground">Avg Risk Score</p></div></div></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader><CardTitle>Risk by Tenure</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskByTenure}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="tenure" /><YAxis /><Tooltip />
                <Bar dataKey="avgRisk" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><CardTitle>Risk by Salary Band</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskBySalary}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="salary" /><YAxis /><Tooltip />
                <Bar dataKey="avgRisk" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader><CardTitle>Satisfaction vs Performance</CardTitle><CardDescription>Colored by attrition risk probability</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="satisfaction" name="Satisfaction" domain={[5, 10]} />
                <YAxis dataKey="performance" name="Performance" domain={[5, 10]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={riskMatrix} fill="hsl(var(--primary))">
                  {riskMatrix.map((entry, i) => (
                    <Cell key={i} fill={entry.risk > 60 ? 'hsl(var(--destructive))' : entry.risk > 30 ? 'hsl(var(--warning))' : 'hsl(var(--success))'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><CardTitle>Department Risk Radar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={deptRadarData}>
                <PolarGrid /><PolarAngleAxis dataKey="department" /><PolarRadiusAxis />
                <Radar name="Attrition" dataKey="attritionRate" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.2} />
                <Radar name="Satisfaction" dataKey="satisfaction" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Department Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deptData.map((dept: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium truncate">{String(dept.fullName || dept.department)}</div>
                <Progress value={Number(dept.avgRisk) || 0} className="flex-1 h-3" />
                <Badge variant="outline">{String(dept.avgRisk)}%</Badge>
                <span className="text-sm text-muted-foreground w-20 text-right">{String(dept.employeeCount)} emp</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
