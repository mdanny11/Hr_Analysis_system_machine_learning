import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="p-6 rounded-full bg-destructive/10 border border-destructive/20">
        <ShieldX className="h-16 w-16 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          Your role <span className="font-semibold text-foreground capitalize">({user?.role?.replace('-', ' ')})</span> does not have permission to access this module.
        </p>
      </div>
      <Button onClick={() => navigate('/dashboard')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>
    </div>
  );
}
