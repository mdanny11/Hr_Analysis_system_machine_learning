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
  currency: 'USD',
  payFrequency: 'monthly',
};

const departments = [
  'Engineering',
  'Human Resources',
  'Marketing',
  'Sales',
  'Finance',
  'Operations',
  'Customer Support',
  'Research & Development',
];

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
      await api.employees.create({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        hireDate: employee.startDate ? employee.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        salary: Number(employee.salary) || 75000,
        age: employee.dateOfBirth ? new Date().getFullYear() - employee.dateOfBirth.getFullYear() : 30,
        gender: employee.gender || 'Not specified',
        yearsAtCompany: 0,
      });

      toast({
        title: 'Employee Added',
        description: `${employee.firstName} ${employee.lastName} has been successfully added to the system.`,
      });

      onSuccess?.();
      setEmployee(initialEmployee);
      setActiveTab('personal');
      setOpen(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add employee. Please try again.',
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
                <Label className="text-white/80">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="John"
                  value={employee.firstName}
                  onChange={(e) => updateEmployee('firstName', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Doe"
                  value={employee.lastName}
                  onChange={(e) => updateEmployee('lastName', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                placeholder="john.doe@company.com"
                value={employee.email}
                onChange={(e) => updateEmployee('email', e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Phone Number</Label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={employee.phone}
                onChange={(e) => updateEmployee('phone', e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
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
                <Label className="text-white/80">Gender</Label>
                <Select value={employee.gender} onValueChange={(v) => updateEmployee('gender', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
                <Label className="text-white/80">
                  Department <span className="text-destructive">*</span>
                </Label>
                <Select value={employee.department} onValueChange={(v) => updateEmployee('department', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">
                  Position <span className="text-destructive">*</span>
                </Label>
                <Select value={employee.position} onValueChange={(v) => updateEmployee('position', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
              <Label className="text-white/80">Direct Manager</Label>
              <Input
                placeholder="Manager's name"
                value={employee.manager}
                onChange={(e) => updateEmployee('manager', e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Employment Type</Label>
                <Select value={employee.employmentType} onValueChange={(v) => updateEmployee('employmentType', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
                <Label className="text-white/80">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
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
                <Label className="text-white/80">Base Salary</Label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={employee.salary}
                  onChange={(e) => updateEmployee('salary', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Currency</Label>
                <Select value={employee.currency} onValueChange={(v) => updateEmployee('currency', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Pay Frequency</Label>
              <Select value={employee.payFrequency} onValueChange={(v) => updateEmployee('payFrequency', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
