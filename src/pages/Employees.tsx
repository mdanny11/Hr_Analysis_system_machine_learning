import { useRef, useState } from 'react';
import type { Employee } from '@/lib/types';
import { useEmployees, useEmployeeStats, useDepartments, useInvalidateEmployees } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddEmployeeDialog } from '@/components/employees/AddEmployeeDialog';
import { EmploymentTimeline } from '@/components/employees/EmploymentTimeline';
import { SkillsTracker } from '@/components/employees/SkillsTracker';
import { CompensationSection } from '@/components/employees/CompensationSection';
import { toast } from 'sonner';
import {
  Search, Download, Upload, ChevronLeft, ChevronRight, MoreHorizontal, Mail, Building, Calendar,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ITEMS_PER_PAGE = 10;

export default function Employees() {
  const { hasPermission } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const canImport = hasPermission('employees.edit');

  const { data: employeeData, isLoading } = useEmployees({
    search: searchQuery || undefined,
    department: departmentFilter !== 'all' ? departmentFilter : undefined,
    risk: riskFilter !== 'all' ? riskFilter : undefined,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });
  const { data: stats } = useEmployeeStats();
  const { data: departments = [] } = useDepartments();
  const invalidateEmployees = useInvalidateEmployees();

  const employees = employeeData?.items ?? [];
  const total = employeeData?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const exportFilters = {
    search: searchQuery || undefined,
    department: departmentFilter !== 'all' ? departmentFilter : undefined,
    risk: riskFilter !== 'all' ? riskFilter : undefined,
  };

  const handleExport = async (format: 'csv' | 'xlsx' = 'csv') => {
    setIsExporting(true);
    try {
      await api.employees.export({ ...exportFilters, format });
      toast.success('Employee data exported', {
        description: format === 'xlsx' ? 'employees_export.xlsx downloaded' : 'employees_export.csv downloaded',
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Export failed';
      toast.error('Export failed', { description: message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().match(/\.(csv|xlsx)$/)) {
      toast.error('Invalid file', { description: 'Please upload a CSV or Excel (.xlsx) file' });
      return;
    }

    setIsImporting(true);
    try {
      const result = await api.employees.import(file);
      invalidateEmployees();
      if (result.created > 0) {
        toast.success('Import complete', {
          description: `${result.created} employee(s) added${result.skipped ? `, ${result.skipped} skipped` : ''}`,
        });
      } else {
        toast.warning('No employees imported', {
          description: result.errors.slice(0, 2).map((e) => `Row ${e.row}: ${e.message}`).join(' · ') || 'All rows were skipped',
        });
      }
      if (result.errors.length > 0) {
        toast.info(`${result.errors.length} row issue(s)`, {
          description: result.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`).join(' · '),
          duration: 10000,
        });
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Import failed';
      toast.error('Import failed', { description: message });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      await api.employees.importTemplate(format);
      toast.success('Template downloaded', {
        description: format === 'xlsx' ? 'employee_import_template.xlsx saved' : 'employee_import_template.csv saved',
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Download failed';
      toast.error('Download failed', { description: message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage and monitor your workforce</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleImportFile}
          />
          {canImport && (
            <Button
              variant="outline"
              size="sm"
              disabled={isImporting}
              onClick={handleImportClick}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import CSV/Excel'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>Export Excel (.xlsx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canImport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')}>CSV template</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadTemplate('xlsx')}>Excel template</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canImport && <AddEmployeeDialog onSuccess={invalidateEmployees} />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats?.total ?? '—'}</p></CardContent></Card>
        <Card className="glass-card"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats?.active ?? '—'}</p></CardContent></Card>
        <Card className="glass-card"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">High Risk</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{stats?.highRisk ?? '—'}</p></CardContent></Card>
        <Card className="glass-card"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Satisfaction</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats?.avgSatisfaction ?? '—'}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees..." className="pl-10" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
        </div>
        <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Loading employees...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Employee</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Department</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Performance</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Risk</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-border/30 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9"><AvatarFallback>{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{emp.department}</td>
                      <td className="p-4"><Progress value={emp.performanceScore * 10} className="h-2 w-20" /></td>
                      <td className="p-4">
                        <Badge variant={emp.attritionRisk === 'high' ? 'destructive' : emp.attritionRisk === 'medium' ? 'secondary' : 'outline'}>
                          {emp.attritionProbability}%
                        </Badge>
                      </td>
                      <td className="p-4"><Badge variant="outline">{emp.status}</Badge></td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedEmployee(emp)}>View Profile</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info('Edit coming soon')}>Edit</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing {employees.length} of {total} employees</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="icon" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {selectedEmployee && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{selectedEmployee.firstName} {selectedEmployee.lastName}</CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedEmployee.email}</span>
              <span className="flex items-center gap-1"><Building className="h-3 w-3" />{selectedEmployee.department}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Since {selectedEmployee.hireDate}</span>
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="history">History</TabsTrigger><TabsTrigger value="skills">Skills</TabsTrigger><TabsTrigger value="compensation">Compensation</TabsTrigger></TabsList>
              <TabsContent value="overview" className="grid md:grid-cols-3 gap-4 mt-4">
                <div><p className="text-sm text-muted-foreground">Performance</p><p className="text-xl font-bold">{selectedEmployee.performanceScore}/10</p></div>
                <div><p className="text-sm text-muted-foreground">Satisfaction</p><p className="text-xl font-bold">{selectedEmployee.satisfactionScore}/10</p></div>
                <div><p className="text-sm text-muted-foreground">Attrition Risk</p><p className="text-xl font-bold text-destructive">{selectedEmployee.attritionProbability}%</p></div>
              </TabsContent>
              <TabsContent value="history"><EmploymentTimeline employee={selectedEmployee} /></TabsContent>
              <TabsContent value="skills"><SkillsTracker employee={selectedEmployee} /></TabsContent>
              <TabsContent value="compensation"><CompensationSection employee={selectedEmployee} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
