import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus, User, Briefcase, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { ApiError } from '@/lib/apiClient';
import { useDepartments } from '@/hooks/useApi';
import { toast } from '@/hooks/use-toast';

interface AddEmployeeDialogProps {
  onSuccess?: () => void;
}

interface NewEmployee {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date | undefined;
  gender: string;
  department: string;
  position: string;
  manager: string;
  employmentType: string;
  startDate: Date | undefined;
  salary: string;
  currency: string;
  payFrequency: string;
  satisfactionScore: string;
  performanceScore: string;
  workLifeBalance: string;
  lastPromotionYears: string;
  trainingHours: string;
  overtimeHours: string;
}

const initialEmployee: NewEmployee = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: undefined,
  gender: '',
  department: '',
  position: '',
  manager: '',
  employmentType: '',
  startDate: undefined,
  salary: '',
  currency: 'RWF',
  payFrequency: 'monthly',
  satisfactionScore: '7',
  performanceScore: '7',
  workLifeBalance: '7',
  lastPromotionYears: '0',
  trainingHours: '0',
  overtimeHours: '0',
};

const positions = [
  'Junior Developer',
  'Senior Developer',
  'Team Lead',
  'Manager',
  'Director',
  'Analyst',
  'Specialist',
  'Coordinator',
];

export function AddEmployeeDialog({ onSuccess }: AddEmployeeDialogProps) {
  const { data: departmentList = [] } = useDepartments();
  const departmentNames = departmentList.length > 0 ? departmentList.map((d) => d.name) : [
    'Engineering', 'Human Resources', 'Marketing', 'Sales', 'Finance', 'Operations', 'Customer Support', 'Research & Development',
  ];
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [employee, setEmployee] = useState<NewEmployee>(initialEmployee);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateEmployee = (field: keyof NewEmployee, value: string | Date | undefined) => {
    setEmployee((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!employee.firstName || !employee.lastName || !employee.email) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (First Name, Last Name, Email)',
        variant: 'destructive',
      });
      setActiveTab('personal');
      return;
    }

    if (!employee.department || !employee.position) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in Department and Position',
        variant: 'destructive',
      });
      setActiveTab('job');
      return;
    }

    setIsSubmitting(true);

    try {
      const yearsAtCompany = employee.startDate
        ? Math.max(0, new Date().getFullYear() - employee.startDate.getFullYear())
        : 0;

      await api.employees.create({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        hireDate: employee.startDate ? employee.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        salary: Number(employee.salary) || 0,
        currency: employee.currency,
        payFrequency: employee.payFrequency,
        age: employee.dateOfBirth ? new Date().getFullYear() - employee.dateOfBirth.getFullYear() : 30,
        gender: employee.gender || 'Not specified',
        yearsAtCompany,
        satisfactionScore: Number(employee.satisfactionScore) || 7,
        performanceScore: Number(employee.performanceScore) || 7,
        workLifeBalance: Number(employee.workLifeBalance) || 7,
        lastPromotionYears: Number(employee.lastPromotionYears) || 0,
        trainingHours: Number(employee.trainingHours) || 0,
        overtimeHours: Number(employee.overtimeHours) || 0,
      });

      toast({
        title: 'Employee Added',
        description: `${employee.firstName} ${employee.lastName} has been successfully added to the system.`,
      });

      onSuccess?.();
      setEmployee(initialEmployee);
      setActiveTab('personal');
      setOpen(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to add employee. Please try again.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmployee(initialEmployee);
      setActiveTab('personal');
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Add New Employee</DialogTitle>
          <DialogDescription className="text-white/60">
            Enter the employee's information across the sections below.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 bg-white/5 border border-white/10">
            <TabsTrigger
              value="personal"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <User className="h-4 w-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger
              value="job"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Briefcase className="h-4 w-4" />
              Job Details
            </TabsTrigger>
            <TabsTrigger
              value="compensation"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <DollarSign className="h-4 w-4" />
              Compensation
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-employee-firstName" className="text-white/80">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-employee-firstName"
                  placeholder="John"
                  value={employee.firstName}
                  onChange={(e) => updateEmployee('firstName', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-lastName" className="text-white/80">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-employee-lastName"
                  placeholder="Doe"
                  value={employee.lastName}
                  onChange={(e) => updateEmployee('lastName', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-employee-email" className="text-white/80">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-employee-email"
                type="email"
                placeholder="john.doe@company.com"
                value={employee.email}
                onChange={(e) => updateEmployee('email', e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-employee-phone" className="text-white/80">Phone Number</Label>
              <Input
                id="add-employee-phone"
                placeholder="+1 (555) 000-0000"
                value={employee.phone}
                onChange={(e) => updateEmployee('phone', e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-employee-dateOfBirth" className="text-white/80">Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="add-employee-dateOfBirth"
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10',
                        !employee.dateOfBirth && 'text-white/40'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {employee.dateOfBirth ? format(employee.dateOfBirth, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10" align="start">
                    <Calendar
                      mode="single"
                      selected={employee.dateOfBirth}
                      onSelect={(date) => updateEmployee('dateOfBirth', date)}
                      disabled={(date) => date > new Date() || date < new Date('1940-01-01')}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-gender" className="text-white/80">Gender</Label>
                <Select value={employee.gender} onValueChange={(v) => updateEmployee('gender', v)}>
                  <SelectTrigger id="add-employee-gender" className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Job Details Tab */}
          <TabsContent value="job" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-employee-department" className="text-white/80">
                  Department <span className="text-destructive">*</span>
                </Label>
                <Select value={employee.department} onValueChange={(v) => updateEmployee('department', v)}>
                  <SelectTrigger id="add-employee-department" className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {departmentNames.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-position" className="text-white/80">
                  Position <span className="text-destructive">*</span>
                </Label>
                <Select value={employee.position} onValueChange={(v) => updateEmployee('position', v)}>
                  <SelectTrigger id="add-employee-position" className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-employee-manager" className="text-white/80">Direct Manager</Label>
              <Input
                id="add-employee-manager"
                placeholder="Manager's name"
                value={employee.manager}
                onChange={(e) => updateEmployee('manager', e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-employee-employmentType" className="text-white/80">Employment Type</Label>
                <Select value={employee.employmentType} onValueChange={(v) => updateEmployee('employmentType', v)}>
                  <SelectTrigger id="add-employee-employmentType" className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-startDate" className="text-white/80">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="add-employee-startDate"
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10',
                        !employee.startDate && 'text-white/40'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {employee.startDate ? format(employee.startDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10" align="start">
                    <Calendar
                      mode="single"
                      selected={employee.startDate}
                      onSelect={(date) => updateEmployee('startDate', date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </TabsContent>

          {/* Compensation Tab */}
          <TabsContent value="compensation" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-employee-salary" className="text-white/80">Base Salary</Label>
                <Input
                  id="add-employee-salary"
                  type="number"
                  placeholder="50000"
                  value={employee.salary}
                  onChange={(e) => updateEmployee('salary', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-currency" className="text-white/80">Currency</Label>
                <Select value={employee.currency} onValueChange={(v) => updateEmployee('currency', v)}>
                  <SelectTrigger id="add-employee-currency" className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="RWF">RWF (RWF)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-employee-payFrequency" className="text-white/80">Pay Frequency</Label>
              <Select value={employee.payFrequency} onValueChange={(v) => updateEmployee('payFrequency', v)}>
                <SelectTrigger id="add-employee-payFrequency" className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-employee-satisfactionScore" className="text-white/80">Satisfaction Score (1-10)</Label>
                <Input id="add-employee-satisfactionScore" type="number" min="1" max="10" step="0.1" value={employee.satisfactionScore} onChange={(e) => updateEmployee('satisfactionScore', e.target.value)} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-performanceScore" className="text-white/80">Performance Score (1-10)</Label>
                <Input id="add-employee-performanceScore" type="number" min="1" max="10" step="0.1" value={employee.performanceScore} onChange={(e) => updateEmployee('performanceScore', e.target.value)} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-workLifeBalance" className="text-white/80">Work-Life Balance (1-10)</Label>
                <Input id="add-employee-workLifeBalance" type="number" min="1" max="10" step="0.1" value={employee.workLifeBalance} onChange={(e) => updateEmployee('workLifeBalance', e.target.value)} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-lastPromotionYears" className="text-white/80">Years Since Promotion</Label>
                <Input id="add-employee-lastPromotionYears" type="number" min="0" value={employee.lastPromotionYears} onChange={(e) => updateEmployee('lastPromotionYears', e.target.value)} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-trainingHours" className="text-white/80">Training Hours</Label>
                <Input id="add-employee-trainingHours" type="number" min="0" value={employee.trainingHours} onChange={(e) => updateEmployee('trainingHours', e.target.value)} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employee-overtimeHours" className="text-white/80">Overtime Hours</Label>
                <Input id="add-employee-overtimeHours" type="number" min="0" value={employee.overtimeHours} onChange={(e) => updateEmployee('overtimeHours', e.target.value)} className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="text-sm font-medium text-white/80 mb-2">Summary</h4>
              <div className="space-y-1 text-sm">
                <p className="text-white/60">
                  Employee: <span className="text-white">{employee.firstName || '—'} {employee.lastName || '—'}</span>
                </p>
                <p className="text-white/60">
                  Department: <span className="text-white">{employee.department || '—'}</span>
                </p>
                <p className="text-white/60">
                  Position: <span className="text-white">{employee.position || '—'}</span>
                </p>
                <p className="text-white/60">
                  Salary:{' '}
                  <span className="text-white">
                    {employee.salary ? `${employee.currency} ${Number(employee.salary).toLocaleString()}` : '—'}
                  </span>
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="border-white/10 text-white/70 hover:bg-white/5">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? 'Adding...' : 'Add Employee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
