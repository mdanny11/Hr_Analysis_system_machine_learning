import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Shield, CheckCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import isonLogo from '@/assets/ison-logo.png';
import isonBanner from '@/assets/ison-banner.jpg';

type Step = 'email' | 'verify' | 'reset' | 'success';

export default function AccountRecovery() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.auth.forgotPassword(email);
      if (result.devCode) {
        toast.info('Development mode', { description: `Verification code: ${result.devCode}` });
      }
      toast.success('Verification code sent', { description: `Check ${email} for the 6-digit code` });
      setStep('verify');
    } catch {
      toast.error('Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.auth.verifyCode(email, verificationCode);
      if (!result.valid) {
        toast.error('Invalid or expired verification code');
        return;
      }
      toast.success('Identity verified');
      setStep('reset');
    } catch {
      toast.error('Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await api.auth.resetPassword(email, verificationCode, newPassword);
      setStep('success');
      toast.success('Password reset successfully');
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const result = await api.auth.forgotPassword(email);
      if (result.devCode) {
        toast.info('Development mode', { description: `New code: ${result.devCode}` });
      }
      toast.success('New verification code sent');
    } catch {
      toast.error('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105" style={{ backgroundImage: `url(${isonBanner})` }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%), linear-gradient(to bottom, rgba(20,30,60,0.4) 0%, rgba(0,0,0,0.5) 100%)' }} />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 md:p-10" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}>
          <div className="flex justify-center mb-6">
            <img src={isonLogo} alt="iSON Xperiences" className="h-14 w-auto brightness-0 invert opacity-90" />
          </div>

          {step === 'email' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <KeyRound className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold text-white mb-2">Account Recovery</h1>
                <p className="text-white/70 text-sm">Enter your email to receive a verification code</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white/90">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
                </div>
              </div>
              <Button onClick={handleSendCode} disabled={isLoading} className="w-full h-12 rounded-xl">
                {isLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Verification Code'}
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold text-white mb-2">Verify Identity</h1>
                <p className="text-white/70 text-sm">Enter the 6-digit code sent to {email}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white/90">Verification Code</Label>
                <Input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} className="h-12 bg-white/10 border-white/20 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-white/40 rounded-xl" />
              </div>
              <Button onClick={handleVerifyCode} disabled={isLoading} className="w-full h-12 rounded-xl">
                {isLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify Code'}
              </Button>
              <button onClick={handleResendCode} disabled={isLoading} className="w-full text-sm text-white/60 hover:text-white transition-colors">Resend code</button>
            </div>
          )}

          {step === 'reset' && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-white mb-2">Set New Password</h1>
                <p className="text-white/70 text-sm">Choose a strong password for your account</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/90">New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/90">Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl" />
                </div>
              </div>
              <Button onClick={handleResetPassword} disabled={isLoading} className="w-full h-12 rounded-xl">
                {isLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Reset Password'}
              </Button>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-semibold text-white">Password Reset Complete</h1>
              <p className="text-white/70 text-sm">Your password has been updated successfully. You can now sign in with your new credentials.</p>
              <Button onClick={() => navigate('/login')} className="w-full h-12 rounded-xl">Back to Sign In</Button>
            </div>
          )}

          {step !== 'success' && (
            <button onClick={() => step === 'email' ? navigate('/login') : setStep('email')} className="mt-6 flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mx-auto">
              <ArrowLeft className="h-4 w-4" /> Back {step === 'email' ? 'to Sign In' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
