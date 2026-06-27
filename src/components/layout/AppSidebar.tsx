import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Brain,
  BarChart3,
  FileText,
  Shield,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  Target,
  MessageSquare,
  Scale,
  Activity,
  UserCog,
} from 'lucide-react';
import isonLogo from '@/assets/ison-logo.png';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  permission?: string;
}

// Role-specific navigation configurations
import { UserRole } from '@/contexts/AuthContext';

interface NavGroup {
  label: string;
  items: NavItem[];
}

const roleNavGroups: Record<UserRole, NavGroup[]> = {
  admin: [
    {
      label: 'Overview', items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
      ]
    },
    {
      label: 'Management', items: [
        { title: 'User Management', href: '/user-management', icon: UserCog, permission: 'users.manage' },
        { title: 'Employee Data', href: '/employees', icon: Users, permission: 'employees.view' },
        { title: 'Data Processing', href: '/data-processing', icon: Database, permission: 'data.preprocess' },
      ]
    },
    {
      label: 'Analytics & Risk', items: [
        { title: 'Predictions', href: '/predictions', icon: Brain, permission: 'predictions.view' },
        { title: 'Risk Analysis', href: '/risk-analysis', icon: BarChart3, permission: 'risk.view' },
        { title: 'Decisions', href: '/decisions', icon: Target, permission: 'decisions.view' },
        { title: 'Engagement', href: '/engagement', icon: MessageSquare, permission: 'engagement.view' },
        { title: 'Alerts', href: '/alerts', icon: Bell, permission: 'alerts.view' },
      ]
    },
    {
      label: 'Security & Compliance', items: [
        { title: 'Benchmarking', href: '/benchmarks', icon: Scale, permission: 'benchmarks.view' },
        { title: 'Reports', href: '/reports', icon: FileText, permission: 'reports.view' },
        { title: 'Model Performance', href: '/model-performance', icon: Activity, permission: 'models.view' },
        { title: 'Audit Logs', href: '/audit', icon: Shield, permission: 'audit.view' },
      ]
    },
    {
      label: 'System', items: [
        { title: 'Settings', href: '/settings', icon: Settings, permission: 'settings.view' },
      ]
    },
  ],
  'hr-manager': [
    {
      label: 'Overview', items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
      ]
    },
    {
      label: 'Analytics', items: [
        { title: 'Employees', href: '/employees', icon: Users, permission: 'employees.view' },
        { title: 'Predictions', href: '/predictions', icon: Brain, permission: 'predictions.view' },
        { title: 'Risk Insights', href: '/risk-analysis', icon: BarChart3, permission: 'risk.view' },
      ]
    },
    {
      label: 'Actions', items: [
        { title: 'Interventions', href: '/decisions', icon: Target, permission: 'decisions.view' },
        { title: 'Engagement', href: '/engagement', icon: MessageSquare, permission: 'engagement.view' },
        { title: 'Benchmarking', href: '/benchmarks', icon: Scale, permission: 'benchmarks.view' },
      ]
    },
    {
      label: 'Reporting', items: [
        { title: 'Reports', href: '/reports', icon: FileText, permission: 'reports.view' },
      ]
    },
  ],
  'hr-analyst': [
    {
      label: 'Overview', items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
      ]
    },
    {
      label: 'Data Lab', items: [
        { title: 'Employees', href: '/employees', icon: Users, permission: 'employees.view' },
        { title: 'Preprocessing', href: '/data-processing', icon: Database, permission: 'data.preprocess' },
      ]
    },
    {
      label: 'ML Models', items: [
        { title: 'Model Training', href: '/predictions', icon: Brain, permission: 'predictions.view' },
        { title: 'Risk Analysis', href: '/risk-analysis', icon: BarChart3, permission: 'risk.view' },
      ]
    },
    {
      label: 'Output', items: [
        { title: 'Exports', href: '/reports', icon: FileText, permission: 'reports.view' },
        { title: 'Evaluation', href: '/model-performance', icon: Activity, permission: 'models.view' },
      ]
    },
  ],
  'department-head': [
    {
      label: 'Overview', items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
      ]
    },
    {
      label: 'My Team', items: [
        { title: 'Team Members', href: '/employees', icon: Users, permission: 'employees.view' },
        { title: 'Engagement', href: '/engagement', icon: MessageSquare, permission: 'engagement.view' },
        { title: 'Alerts', href: '/alerts', icon: Bell, permission: 'alerts.view' },
      ]
    },
    {
      label: 'Feedback', items: [
        { title: 'Reports', href: '/reports', icon: FileText, permission: 'reports.view' },
      ]
    },
  ],
};

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const role = user?.role || 'hr-manager';
  const navGroups = roleNavGroups[role].map(group => ({
    ...group,
    items: group.items.filter(item => !item.permission || hasPermission(item.permission)),
  })).filter(group => group.items.length > 0);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen glass-sidebar transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] flex flex-col border-r border-white/5',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Header with Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img
              src={isonLogo}
              alt="iSON Xperiences"
              className="h-8 w-auto brightness-0 invert"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <div className="space-y-5 px-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-white/15 text-white shadow-lg backdrop-blur-sm'
                            : 'text-white/60 hover:text-white hover:bg-white/8'
                        )}
                      >
                        <div className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                          isActive ? 'bg-primary/80 text-white' : 'bg-transparent'
                        )}>
                          <Icon className="h-5 w-5 shrink-0" />
                        </div>
                        <span className={cn(
                          'flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap',
                          collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
                        )}>
                          {item.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer with User */}
      <div className="border-t border-white/5 p-4">
        {!collapsed && user && (
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-primary-foreground text-sm font-medium">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-white/50 capitalize truncate">
                {user.role.replace('-', ' ')}
              </p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={logout}
          className={cn(
            'text-white/60 hover:text-white hover:bg-white/10 transition-all',
            !collapsed && 'w-full justify-start gap-3'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Log out</span>}
        </Button>
      </div>
    </aside>
  );
}
