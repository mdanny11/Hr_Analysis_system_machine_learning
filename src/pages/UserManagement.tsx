import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { ApiError } from '@/lib/apiClient';
import { queryKeys } from '@/hooks/useApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Mail,
  Calendar,
  Clock,
  Filter,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  EyeOff,
  KeyRound,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccessRequestsTab from '@/components/user-management/AccessRequestsTab';

const MIN_PASSWORD_LENGTH = 6;

function validatePassword(password: string, confirmPassword: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
}

interface SystemUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLogin: string;
  createdAt: string;
  mfaEnabled: boolean;
}



const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
  'admin': { label: 'Administrator', icon: ShieldAlert, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  'hr-manager': { label: 'HR Manager', icon: ShieldCheck, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  'hr-analyst': { label: 'HR Analyst', icon: Shield, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  'department-head': { label: 'Dept. Head', icon: UserCog, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
};

const statusConfig = {
  'active': { label: 'Active', icon: CheckCircle, color: 'bg-success/20 text-success border-success/30' },
  'inactive': { label: 'Inactive', icon: XCircle, color: 'bg-muted/20 text-muted-foreground border-muted/30' },
  'suspended': { label: 'Suspended', icon: AlertCircle, color: 'bg-destructive/20 text-destructive border-destructive/30' },
  'pending': { label: 'Pending', icon: AlertCircle, color: 'bg-warning/20 text-warning border-warning/30' },
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'hr-analyst' as UserRole,
    department: '',
    password: '',
    confirmPassword: '',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<SystemUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingAccessRequests, setPendingAccessRequests] = useState(0);
  const [activeTab, setActiveTab] = useState('users');

  // Refresh users list
  const refreshUsers = async () => {
    try {
      const fetchedUsers = await api.users.list();
      setUsers(fetchedUsers.map(u => ({
        ...u,
        department: u.department || '',
        status: (u.status as SystemUser['status']) || 'active',
        mfaEnabled: u.mfaEnabled ?? false,
        createdAt: new Date().toISOString(),
        lastLogin: u.lastLogin || '',
      })));
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  // Check admin permission
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-white/60">You don't have permission to access User Management. Only administrators can manage system users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = users.filter((user) => {
    // Safety check for user and user.name
    if (!user || !user.name) return false;

    // Safety check for user.email, default to empty string if missing
    const email = user.email || '';

    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleExportUsers = async () => {
    setIsExporting(true);
    try {
      await api.users.export();
      toast.success('Users exported', { description: 'Downloaded users_export.csv' });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Export failed';
      toast.error('Export failed', { description: message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    const passwordError = validatePassword(newUser.password, newUser.confirmPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    try {
      await api.users.create({
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
        role: newUser.role,
        department: newUser.department,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.email}`,
      });
      await refreshUsers();
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setIsCreateDialogOpen(false);
      setNewUser({ name: '', email: '', role: 'hr-analyst', department: '', password: '', confirmPassword: '' });
      toast.success('User created successfully', { description: `${newUser.name} can now sign in with the assigned password` });
    } catch {
      toast.error('Failed to create user');
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    const passwordError = validatePassword(resetPassword, resetConfirmPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setResetLoading(true);
    try {
      await api.users.resetPassword(resetTarget.id, resetPassword);
      setIsResetDialogOpen(false);
      setResetTarget(null);
      setResetPassword('');
      setResetConfirmPassword('');
      toast.success('Password reset successfully', { description: `${resetTarget.name} can now sign in with the new password` });
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      await api.users.update(selectedUser.id, {
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        department: selectedUser.department,
      });
      await refreshUsers();
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast.success('User updated successfully');
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    try {
      await api.users.delete(userId);
      await refreshUsers();
      toast.success('User deleted successfully');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (user: SystemUser) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.users.update(user.id, { status: nextStatus });
      await refreshUsers();
      toast.success(`User ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    pending: pendingAccessRequests,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="text-white/60 mt-1">Manage system users, roles, and access permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Create New User</DialogTitle>
              <DialogDescription className="text-white/60">
                Add a new user to the HR Analytics System. They will receive an invitation email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-white/80">Full Name</Label>
                <Input
                  placeholder="John Doe"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Email Address</Label>
                <Input
                  type="email"
                  placeholder="john@ison.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Role</Label>
                <Select value={newUser.role} onValueChange={(v: UserRole) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="hr-manager">HR Manager</SelectItem>
                    <SelectItem value="hr-analyst">HR Analyst</SelectItem>
                    <SelectItem value="department-head">Department Head</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Department</Label>
                <Input
                  placeholder="Human Resources"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Password *</Label>
                <div className="relative">
                  <Input
                    type={showCreatePassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="bg-white/5 border-white/10 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    type={showCreateConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    className="bg-white/5 border-white/10 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateConfirmPassword(!showCreateConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showCreateConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="text-white/60">
                Cancel
              </Button>
              <Button onClick={handleCreateUser} className="bg-primary hover:bg-primary/90">
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card border-white/10 p-1">
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-white/10">
            <Users className="h-4 w-4" />
            System Users
          </TabsTrigger>
          <TabsTrigger value="access-requests" className="gap-2 data-[state=active]:bg-white/10">
            <ClipboardList className="h-4 w-4" />
            Access Requests
            {pendingAccessRequests > 0 && (
              <Badge className="ml-1 bg-warning/20 text-warning border-warning/30">{pendingAccessRequests}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6 mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Total Users</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Active Users</p>
                <p className="text-3xl font-bold text-success">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Pending Requests</p>
                <p className="text-3xl font-bold text-warning">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Administrators</p>
                <p className="text-3xl font-bold text-red-400">{stats.admins}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="hr-manager">HR Manager</SelectItem>
                <SelectItem value="hr-analyst">HR Analyst</SelectItem>
                <SelectItem value="department-head">Department Head</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="gap-2 border-white/10 text-white/70 hover:text-white"
              disabled={isExporting}
              onClick={handleExportUsers}
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            System Users
          </CardTitle>
          <CardDescription className="text-white/60">
            {filteredUsers.length} users found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">User</TableHead>
                  <TableHead className="text-white/60">Role</TableHead>
                  <TableHead className="text-white/60">Department</TableHead>
                  <TableHead className="text-white/60">Status</TableHead>
                  <TableHead className="text-white/60">MFA</TableHead>
                  <TableHead className="text-white/60">Last Login</TableHead>
                  <TableHead className="text-white/60 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const RoleIcon = roleConfig[user.role].icon;
                  const StatusIcon = statusConfig[user.status].icon;

                  return (
                    <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-white/10">
                            <AvatarFallback className="bg-gradient-to-br from-primary/50 to-purple-500/50 text-white text-sm">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{user.name}</p>
                            <p className="text-sm text-white/50 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleConfig[user.role].color} border gap-1`}>
                          <RoleIcon className="h-3 w-3" />
                          {roleConfig[user.role].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/70">{user.department}</TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig[user.status].color} border gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[user.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.mfaEnabled ? (
                          <Badge className="bg-success/20 text-success border-success/30 border">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge className="bg-muted/20 text-muted-foreground border-muted/30 border">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-white/60 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(user.lastLogin)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                            <DropdownMenuItem
                              className="text-white/80 focus:text-white focus:bg-white/10 gap-2"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-white/80 focus:text-white focus:bg-white/10 gap-2"
                              onClick={() => {
                                setResetTarget(user);
                                setResetPassword('');
                                setResetConfirmPassword('');
                                setShowResetPassword(false);
                                setIsResetDialogOpen(true);
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-white/80 focus:text-white focus:bg-white/10 gap-2"
                              onClick={() => handleToggleStatus(user)}
                            >
                              <RefreshCw className="h-4 w-4" />
                              {user.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Session Management & Bulk Import */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Sessions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Active Sessions
            </CardTitle>
            <CardDescription className="text-white/60">Currently logged-in users across devices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { user: 'System Administrator', device: 'Chrome · Windows', ip: '192.168.1.100', icon: Monitor, active: '2 min ago' },
              { user: 'Sarah Johnson', device: 'Safari · macOS', ip: '192.168.1.101', icon: Monitor, active: '15 min ago' },
              { user: 'Emily Davis', device: 'Mobile · iOS', ip: '10.0.0.45', icon: Smartphone, active: '1 hr ago' },
              { user: 'Robert Taylor', device: 'Firefox · Linux', ip: '192.168.1.103', icon: Globe, active: '3 hrs ago' },
            ].map((session, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <session.icon className="h-4 w-4 text-white/40" />
                  <div>
                    <p className="text-sm font-medium text-white/90">{session.user}</p>
                    <p className="text-xs text-white/50">{session.device} · {session.ip}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{session.active}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => toast.success(`Session terminated for ${session.user}`)}>
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bulk Import */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Bulk User Import
            </CardTitle>
            <CardDescription className="text-white/60">Import users from HRIS or CSV/Excel files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer" onClick={() => toast.info('File picker would open', { description: 'Upload CSV or Excel file with user data' })}>
              <Upload className="h-10 w-10 text-white/30 mx-auto mb-3" />
              <p className="text-sm text-white/70 font-medium">Drop file here or click to upload</p>
              <p className="text-xs text-white/40 mt-1">Supports CSV, XLSX · Max 1000 users</p>
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full gap-2 border-white/10 text-white/70 hover:text-white" onClick={() => toast.info('Template downloaded', { description: 'user_import_template.csv saved' })}>
                <Download className="h-4 w-4" />
                Download Import Template
              </Button>
              <Button variant="outline" className="w-full gap-2 border-white/10 text-white/70 hover:text-white" onClick={() => toast.info('HRIS connector', { description: 'Would open HRIS integration settings (Workday, SAP, BambooHR)' })}>
                <RefreshCw className="h-4 w-4" />
                Sync from HRIS
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="access-requests" className="space-y-6 mt-6">
          <AccessRequestsTab onPendingCountChange={setPendingAccessRequests} />
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User</DialogTitle>
            <DialogDescription className="text-white/60">
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-white/80">Full Name</Label>
                <Input
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Email Address</Label>
                <Input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(v: UserRole) => setSelectedUser({ ...selectedUser, role: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="hr-manager">HR Manager</SelectItem>
                    <SelectItem value="hr-analyst">HR Analyst</SelectItem>
                    <SelectItem value="department-head">Department Head</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Department</Label>
                <Input
                  value={selectedUser.department}
                  onChange={(e) => setSelectedUser({ ...selectedUser, department: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Status</Label>
                <Select
                  value={selectedUser.status}
                  onValueChange={(v: SystemUser['status']) => setSelectedUser({ ...selectedUser, status: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="text-white/60">
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} className="bg-primary hover:bg-primary/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Reset Password</DialogTitle>
            <DialogDescription className="text-white/60">
              Set a new password for {resetTarget?.name} ({resetTarget?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/80">New Password</Label>
              <div className="relative">
                <Input
                  type={showResetPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Confirm Password</Label>
              <Input
                type="password"
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsResetDialogOpen(false)} className="text-white/60">
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetLoading} className="bg-primary hover:bg-primary/90">
              {resetLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
