import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  Moon, 
  Sun, 
  LogOut, 
  HelpCircle,
  Bell,
  Shield,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

export function UserSettingsDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      'hr-manager': 'HR Manager',
      'hr-analyst': 'HR Analyst',
      'department-head': 'Department Head',
    };
    return labels[role] || role;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="glass-button h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9 border-2 border-white/20">
            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-primary-foreground text-sm font-medium">
              {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-72 glass-card border-white/10 p-0"
        sideOffset={8}
      >
        {/* User Header */}
        <div className="p-4 bg-gradient-to-br from-primary/20 to-purple-500/20">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-white/30">
              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-primary-foreground text-lg font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-white">{user?.name || 'User'}</p>
              <p className="text-sm text-white/60">{user?.email || 'user@company.com'}</p>
              <p className="text-xs text-primary/80 mt-0.5">{getRoleLabel(user?.role || '')}</p>
            </div>
          </div>
        </div>

        <div className="p-2">
          {/* Quick Settings */}
          <DropdownMenuLabel className="text-xs text-white/50 uppercase tracking-wider px-2">
            Quick Settings
          </DropdownMenuLabel>
          
          <div className="px-2 py-2 flex items-center justify-between hover:bg-white/5 rounded-md">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="h-4 w-4 text-white/60" /> : <Sun className="h-4 w-4 text-white/60" />}
              <span className="text-sm text-white/80">Dark Mode</span>
            </div>
            <Switch 
              checked={darkMode} 
              onCheckedChange={setDarkMode}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="px-2 py-2 flex items-center justify-between hover:bg-white/5 rounded-md">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-white/60" />
              <span className="text-sm text-white/80">Notifications</span>
            </div>
            <Switch 
              checked={notifications} 
              onCheckedChange={setNotifications}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <DropdownMenuSeparator className="bg-white/10 my-2" />

          {/* Navigation Items */}
          <DropdownMenuItem 
            className="px-2 py-2.5 cursor-pointer hover:bg-white/5 focus:bg-white/5"
            onClick={() => navigate('/profile')}
          >
            <User className="h-4 w-4 mr-2 text-white/60" />
            <span className="text-white/80">My Profile</span>
            <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
          </DropdownMenuItem>

          <DropdownMenuItem 
            className="px-2 py-2.5 cursor-pointer hover:bg-white/5 focus:bg-white/5"
            onClick={() => navigate('/settings')}
          >
            <Settings className="h-4 w-4 mr-2 text-white/60" />
            <span className="text-white/80">System Settings</span>
            <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
          </DropdownMenuItem>

          {user?.role === 'admin' && (
            <DropdownMenuItem 
              className="px-2 py-2.5 cursor-pointer hover:bg-white/5 focus:bg-white/5"
              onClick={() => navigate('/user-management')}
            >
              <Shield className="h-4 w-4 mr-2 text-white/60" />
              <span className="text-white/80">User Management</span>
              <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
            </DropdownMenuItem>
          )}

          <DropdownMenuItem 
            className="px-2 py-2.5 cursor-pointer hover:bg-white/5 focus:bg-white/5"
          >
            <HelpCircle className="h-4 w-4 mr-2 text-white/60" />
            <span className="text-white/80">Help & Support</span>
            <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/10 my-2" />

          {/* Logout */}
          <DropdownMenuItem 
            className="px-2 py-2.5 cursor-pointer hover:bg-destructive/20 focus:bg-destructive/20 text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
