import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import isonLogo from '@/assets/ison-logo.png';
import isonBanner from '@/assets/ison-banner.jpg';

const roles: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Administrator', description: 'Full system access' },
  { value: 'hr-manager', label: 'HR Manager', description: 'Dashboards, decisions & reports' },
  { value: 'hr-analyst', label: 'HR Analyst', description: 'Data processing & ML models' },
  { value: 'department-head', label: 'Department Head', description: 'Team-level visibility' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('hr-manager');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const result = await login(email, password, role);
    
    if (result.success) {
      toast.success('Welcome back!', {
        description: `Logged in as ${role.replace('-', ' ')}`,
      });
      navigate('/dashboard');
    } else {
      toast.error('Login failed', {
        description: result.message || 'Please check your credentials and try again',
      });
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { width: 0, color: 'bg-muted', label: '' };
    if (password.length < 6) return { width: 25, color: 'bg-destructive', label: 'Weak' };
    if (password.length < 10) return { width: 50, color: 'bg-amber-500', label: 'Fair' };
    if (password.length < 14) return { width: 75, color: 'bg-secondary', label: 'Good' };
    return { width: 100, color: 'bg-emerald-500', label: 'Strong' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      {/* iSON Banner Background - Full visibility */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${isonBanner})` }}
      />
      
      {/* Gradient overlay - darker on edges, lighter in center for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%),
            linear-gradient(to bottom, rgba(20,30,60,0.4) 0%, rgba(0,0,0,0.5) 100%)
          `
        }}
      />
      
      {/* Subtle animated glow accents */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      
      {/* Very subtle noise texture for premium feel */}
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Glassmorphism Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div 
          className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 md:p-10"
          style={{
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), 0 0 0 1px rgba(255,255,255,0.05) inset'
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={isonLogo} 
              alt="iSON Xperiences" 
              className="h-14 w-auto brightness-0 invert opacity-90"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-white mb-2">
              Welcome back
            </h1>
            <p className="text-white/70 text-sm md:text-base">
              Sign in to access your HR analytics dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90 text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:border-white/40 focus:ring-white/20 transition-all"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90 text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:border-white/40 focus:ring-white/20 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-1.5 pt-1">
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300 rounded-full`}
                      style={{ width: `${strength.width}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/60">
                    Password strength: <span className="font-medium text-white/80">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-white/90 text-sm font-medium">
                Select Role
              </Label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                <SelectTrigger id="role" className="h-12 bg-white/10 border-white/20 text-white rounded-xl focus:border-white/40 focus:ring-white/20 [&>svg]:text-white/60">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(240,30%,20%)] border-white/20 backdrop-blur-xl">
                  {roles.map((r) => (
                    <SelectItem 
                      key={r.value} 
                      value={r.value}
                      className="text-white/90 focus:bg-white/10 focus:text-white"
                    >
                      <div className="flex flex-col py-1">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-white/60">{r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-white/30 data-[state=checked]:bg-white/20 data-[state=checked]:border-white/40"
                />
                <Label htmlFor="remember" className="text-sm font-normal text-white/70 cursor-pointer">
                  Remember me
                </Label>
              </div>
              <button type="button" onClick={() => navigate('/account-recovery')} className="text-sm text-white/70 hover:text-white transition-colors">
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mt-2" 
              size="lg" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* SSO Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/15" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-3 text-white/50 backdrop-blur-sm">or continue with</span>
              </div>
            </div>

            {/* SSO Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button type="button" variant="outline" className="h-11 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-xl" onClick={() => toast.info('SSO: Microsoft Azure AD', { description: 'Enterprise SSO integration (prototype)' })}>
                <svg className="h-5 w-5" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
              </Button>
              <Button type="button" variant="outline" className="h-11 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-xl" onClick={() => toast.info('SSO: Google Workspace', { description: 'Enterprise SSO integration (prototype)' })}>
                <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </Button>
              <Button type="button" variant="outline" className="h-11 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-xl" onClick={() => toast.info('SSO: Okta', { description: 'Enterprise SSO integration (prototype)' })}>
                <span className="text-sm font-bold tracking-tight">Okta</span>
              </Button>
            </div>
          </form>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-white/50">
            By signing in, you agree to our{' '}
            <button className="text-white/70 hover:text-white underline underline-offset-2 transition-colors">
              Terms of Service
            </button>
            {' '}& {' '}
            <button className="text-white/70 hover:text-white underline underline-offset-2 transition-colors">
              Privacy Policy
            </button>
          </p>

          {/* Links */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-sm text-white/60">
              Don't have an account?{' '}
              <button onClick={() => navigate('/access-request')} className="text-white/90 hover:text-white font-medium underline underline-offset-2 transition-colors">
                Request Access
              </button>
            </p>
          </div>
        </div>

        {/* Demo hint - subtle */}
        <p className="mt-4 text-center text-xs text-white/40">
          Demo: admin@ison.com / password123 (role is determined by your account)
        </p>
      </div>
    </div>
  );
}
