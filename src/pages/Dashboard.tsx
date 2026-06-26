import { useAuth } from '@/contexts/AuthContext';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { HRManagerDashboard } from '@/components/dashboard/HRManagerDashboard';
import { HRAnalystDashboard } from '@/components/dashboard/HRAnalystDashboard';
import { DeptHeadDashboard } from '@/components/dashboard/DeptHeadDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'hr-manager':
      return <HRManagerDashboard />;
    case 'hr-analyst':
      return <HRAnalystDashboard />;
    case 'department-head':
      return <DeptHeadDashboard />;
    default:
      return <HRManagerDashboard />;
  }
}
