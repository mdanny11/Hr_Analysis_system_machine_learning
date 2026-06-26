import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserPlus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import isonLogo from '@/assets/ison-logo.png';
import isonBanner from '@/assets/ison-banner.jpg';

export default function AccessRequest() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', department: '', jobTitle: '', requestedRole: '' as UserRole | '', justification: '', managerEmail: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.department || !form.requestedRole || !form.jobTitle || !form.justification || !form.managerEmail) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.auth.submitAccessRequest({
        name: form.fullName,
        email: form.email,
        department: form.department,
        jobTitle: form.jobTitle,
        requestedRole: form.requestedRole as UserRole,
        justification: form.justification,
        managerEmail: form.managerEmail,
      });
      setReferenceId(result.referenceId);
      setSubmitted(true);
      toast.success('Access request submitted successfully');
    } catch {
      toast.error('Failed to submit access request', {
        description: 'Please check your details and try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden py-8">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105" style={{ backgroundImage: `url(${isonBanner})` }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%), linear-gradient(to bottom, rgba(20,30,60,0.4) 0%, rgba(0,0,0,0.5) 100%)' }} />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] animate-pulse" />

      <div className="relative z-10 w-full max-w-lg mx-4 animate-fade-in">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}>
          <div className="flex justify-center mb-6">
            <img src={isonLogo} alt="iSON Xperiences" className="h-14 w-auto brightness-0 invert opacity-90" />
          </div>

          {submitted ? (
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-semibold text-white">Request Submitted</h1>
              <p className="text-white/70 text-sm">Your access request has been submitted for review. You will receive an email notification once approved by your administrator.</p>
              <p className="text-white/50 text-xs">Reference ID: {referenceId}</p>
              <Button onClick={() => navigate('/login')} className="w-full h-12 rounded-xl">Back to Sign In</Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <UserPlus className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold text-white mb-2">Request Access</h1>
                <p className="text-white/70 text-sm">Submit your details for HR Analytics System access</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/90">Full Name *</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} placeholder="John Doe" className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/90">Email *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="name@ison.com" className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/90">Department *</Label>
                    <Input value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} placeholder="Human Resources" className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/90">Job Title *</Label>
                    <Input value={form.jobTitle} onChange={(e) => setForm({...form, jobTitle: e.target.value})} placeholder="HR Coordinator" className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90">Requested Role *</Label>
                  <Select value={form.requestedRole} onValueChange={(v: UserRole) => setForm({...form, requestedRole: v})}>
                    <SelectTrigger className="h-11 bg-white/10 border-white/20 text-white rounded-xl [&>svg]:text-white/60">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[hsl(240,30%,20%)] border-white/20 backdrop-blur-xl">
                      <SelectItem value="hr-manager" className="text-white/90 focus:bg-white/10 focus:text-white">HR Manager</SelectItem>
                      <SelectItem value="hr-analyst" className="text-white/90 focus:bg-white/10 focus:text-white">HR Analyst</SelectItem>
                      <SelectItem value="department-head" className="text-white/90 focus:bg-white/10 focus:text-white">Department Head</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90">Manager Email *</Label>
                  <Input type="email" value={form.managerEmail} onChange={(e) => setForm({...form, managerEmail: e.target.value})} placeholder="manager@ison.com" className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90">Justification *</Label>
                  <Textarea value={form.justification} onChange={(e) => setForm({...form, justification: e.target.value})} placeholder="Why do you need access to this system?" className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl min-h-[80px]" />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl mt-2">
                  {isLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Request'}
                </Button>
              </form>

              <button onClick={() => navigate('/login')} className="mt-6 flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mx-auto">
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
