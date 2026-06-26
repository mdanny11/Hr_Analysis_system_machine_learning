import { useState } from 'react';
import { toast } from 'sonner';
import { X, Calendar, Mail, Bell, Clock, Users } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ScheduleReportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const existingReports = [
  { id: '1', name: 'Executive Summary' },
  { id: '2', name: 'Attrition Analysis' },
  { id: '3', name: 'Department Comparison' },
  { id: '4', name: 'Cost Impact Report' },
  { id: '5', name: 'Risk Distribution' },
];

const recipients = [
  { id: '1', name: 'John Smith', email: 'john.smith@company.com' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah.j@company.com' },
  { id: '3', name: 'Mike Wilson', email: 'mike.w@company.com' },
  { id: '4', name: 'Emily Davis', email: 'emily.d@company.com' },
  { id: '5', name: 'Chris Brown', email: 'chris.b@company.com' },
];

export function ScheduleReportDrawer({ open, onOpenChange }: ScheduleReportDrawerProps) {
  const [selectedReport, setSelectedReport] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [deliveryMethod, setDeliveryMethod] = useState<string[]>(['email']);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');

  const toggleDeliveryMethod = (method: string) => {
    if (deliveryMethod.includes(method)) {
      if (deliveryMethod.length > 1) {
        setDeliveryMethod(deliveryMethod.filter(m => m !== method));
      }
    } else {
      setDeliveryMethod([...deliveryMethod, method]);
    }
  };

  const toggleRecipient = (id: string) => {
    if (selectedRecipients.includes(id)) {
      setSelectedRecipients(selectedRecipients.filter(r => r !== id));
    } else {
      setSelectedRecipients([...selectedRecipients, id]);
    }
  };

  const handleSchedule = () => {
    if (!selectedReport) {
      toast.error('Please select a report');
      return;
    }
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }
    if (deliveryMethod.includes('email') && selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    const reportName = existingReports.find(r => r.id === selectedReport)?.name;
    toast.success('Report scheduled successfully (prototype)', {
      description: `"${reportName}" will be delivered ${frequency}`
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedReport('');
    setFrequency('weekly');
    setDeliveryMethod(['email']);
    setSelectedRecipients([]);
    setStartDate('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md glass-card border-l border-white/10 p-0 overflow-y-auto data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-white/10">
          <SheetTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Automated Report
          </SheetTitle>
          <SheetDescription className="text-white/60">
            Configure recurring report delivery
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Select Report */}
          <div className="space-y-2">
            <Label className="text-white/80">Select Report</Label>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="glass-input border-white/10 text-white">
                <SelectValue placeholder="Choose a report template" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                {existingReports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-3">
            <Label className="text-white/80 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Frequency
            </Label>
            <RadioGroup value={frequency} onValueChange={setFrequency} className="space-y-2">
              {[
                { value: 'daily', label: 'Daily', desc: 'Every day at 9:00 AM' },
                { value: 'weekly', label: 'Weekly', desc: 'Every Monday at 9:00 AM' },
                { value: 'monthly', label: 'Monthly', desc: 'First day of each month' },
              ].map((option) => (
                <div 
                  key={option.value}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                    frequency === option.value 
                      ? 'glass-card border-primary/50' 
                      : 'glass-button'
                  }`}
                  onClick={() => setFrequency(option.value)}
                >
                  <RadioGroupItem 
                    value={option.value} 
                    id={option.value}
                    className="border-white/30 text-primary"
                  />
                  <div>
                    <Label htmlFor={option.value} className="text-white/80 cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-xs text-white/50">{option.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Delivery Method */}
          <div className="space-y-3">
            <Label className="text-white/80">Delivery Method</Label>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  deliveryMethod.includes('email')
                    ? 'glass-card border-primary/50'
                    : 'glass-button'
                }`}
                onClick={() => toggleDeliveryMethod('email')}
              >
                <Checkbox 
                  checked={deliveryMethod.includes('email')}
                  onCheckedChange={() => toggleDeliveryMethod('email')}
                  className="border-white/30 data-[state=checked]:bg-primary"
                />
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white/80">Email</span>
                </div>
              </div>
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  deliveryMethod.includes('dashboard')
                    ? 'glass-card border-primary/50'
                    : 'glass-button'
                }`}
                onClick={() => toggleDeliveryMethod('dashboard')}
              >
                <Checkbox 
                  checked={deliveryMethod.includes('dashboard')}
                  onCheckedChange={() => toggleDeliveryMethod('dashboard')}
                  className="border-white/30 data-[state=checked]:bg-primary"
                />
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white/80">Dashboard</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recipients (only show if email is selected) */}
          {deliveryMethod.includes('email') && (
            <div className="space-y-3">
              <Label className="text-white/80 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recipients
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {recipients.map((recipient) => (
                  <div 
                    key={recipient.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                      selectedRecipients.includes(recipient.id)
                        ? 'bg-white/10'
                        : 'hover:bg-white/5'
                    }`}
                    onClick={() => toggleRecipient(recipient.id)}
                  >
                    <Checkbox 
                      checked={selectedRecipients.includes(recipient.id)}
                      onCheckedChange={() => toggleRecipient(recipient.id)}
                      className="border-white/30 data-[state=checked]:bg-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{recipient.name}</p>
                      <p className="text-xs text-white/50 truncate">{recipient.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-2">
            <Label className="text-white/80">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="glass-input border-white/10 text-white"
            />
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="p-6 pt-4 border-t border-white/10">
          <div className="flex gap-3 w-full">
            <Button 
              variant="ghost" 
              onClick={() => { onOpenChange(false); resetForm(); }}
              className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSchedule}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              Schedule Report
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
