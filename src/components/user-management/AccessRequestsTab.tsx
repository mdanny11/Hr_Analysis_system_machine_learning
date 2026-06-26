import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@/contexts/AuthContext';
import { api, AccessRequest } from '@/services/api';
import { queryKeys } from '@/hooks/useApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  ClipboardList,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

const requestStatusConfig = {
  pending: { label: 'Pending', icon: AlertCircle, color: 'bg-warning/20 text-warning border-warning/30' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'bg-success/20 text-success border-success/30' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'bg-destructive/20 text-destructive border-destructive/30' },
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  'hr-manager': 'HR Manager',
  'hr-analyst': 'HR Analyst',
  'department-head': 'Department Head',
};

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

interface AccessRequestsTabProps {
  onPendingCountChange?: (count: number) => void;
}

export default function AccessRequestsTab({ onPendingCountChange }: AccessRequestsTabProps) {
  const queryClient = useQueryClient();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [approveTarget, setApproveTarget] = useState<AccessRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AccessRequest | null>(null);
  const [approveRole, setApproveRole] = useState<UserRole>('hr-analyst');
  const [approvePassword, setApprovePassword] = useState('');
  const [approveConfirmPassword, setApproveConfirmPassword] = useState('');
  const [showApprovePassword, setShowApprovePassword] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const refreshRequests = useCallback(async () => {
    try {
      setLoading(true);
      const status = statusFilter === 'all' ? undefined : (statusFilter as 'pending' | 'approved' | 'rejected');
      const data = await api.accessRequests.list(status);
      setRequests(data);
      if (statusFilter === 'pending' || statusFilter === 'all') {
        const pending = statusFilter === 'all'
          ? data.filter((r) => r.status === 'pending').length
          : data.length;
        onPendingCountChange?.(pending);
      }
    } catch {
      toast.error('Failed to load access requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, onPendingCountChange]);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  const filteredRequests = requests.filter((request) => {
    const query = searchQuery.toLowerCase();
    return (
      request.name.toLowerCase().includes(query) ||
      request.email.toLowerCase().includes(query) ||
      request.referenceId.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openApproveDialog = (request: AccessRequest) => {
    setApproveTarget(request);
    setApproveRole(request.requestedRole);
    setApprovePassword('');
    setApproveConfirmPassword('');
    setShowApprovePassword(false);
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    const passwordError = validatePassword(approvePassword, approveConfirmPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setActionLoading(true);
    try {
      await api.accessRequests.approve(approveTarget.id, {
        role: approveRole,
        password: approvePassword,
      });
      await refreshRequests();
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setApproveTarget(null);
      toast.success('Access request approved', {
        description: `User account created for ${approveTarget.email}`,
      });
    } catch {
      toast.error('Failed to approve access request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await api.accessRequests.reject(rejectTarget.id, { reason: rejectReason || undefined });
      await refreshRequests();
      setRejectTarget(null);
      setRejectReason('');
      toast.success('Access request rejected');
    } catch {
      toast.error('Failed to reject access request');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search by name, email, or reference ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Access Requests
          </CardTitle>
          <CardDescription className="text-white/60">
            {loading ? 'Loading...' : `${filteredRequests.length} requests found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Request ID</TableHead>
                  <TableHead className="text-white/60">Full Name</TableHead>
                  <TableHead className="text-white/60">Email</TableHead>
                  <TableHead className="text-white/60">Department</TableHead>
                  <TableHead className="text-white/60">Requested Role</TableHead>
                  <TableHead className="text-white/60">Submission Date</TableHead>
                  <TableHead className="text-white/60">Status</TableHead>
                  <TableHead className="text-white/60 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-white/50 py-8">
                      No access requests found
                    </TableCell>
                  </TableRow>
                )}
                {filteredRequests.map((request) => {
                  const StatusIcon = requestStatusConfig[request.status].icon;
                  return (
                    <TableRow key={request.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-white/80 font-mono text-sm">{request.referenceId}</TableCell>
                      <TableCell className="text-white">{request.name}</TableCell>
                      <TableCell className="text-white/70">{request.email}</TableCell>
                      <TableCell className="text-white/70">{request.department}</TableCell>
                      <TableCell className="text-white/70">{roleLabels[request.requestedRole]}</TableCell>
                      <TableCell className="text-white/60 text-sm">{formatDate(request.submittedAt)}</TableCell>
                      <TableCell>
                        <Badge className={`${requestStatusConfig[request.status].color} border gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {requestStatusConfig[request.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => openApproveDialog(request)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setRejectTarget(request);
                                setRejectReason('');
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-white/40 text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Approve Access Request</DialogTitle>
            <DialogDescription className="text-white/60">
              Create an active user account for {approveTarget?.name} ({approveTarget?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/80">Assign Role</Label>
              <Select value={approveRole} onValueChange={(v: UserRole) => setApproveRole(v)}>
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
              <Label className="text-white/80">Initial Password</Label>
              <div className="relative">
                <Input
                  type={showApprovePassword ? 'text' : 'password'}
                  value={approvePassword}
                  onChange={(e) => setApprovePassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="bg-white/5 border-white/10 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApprovePassword(!showApprovePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showApprovePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Confirm Password</Label>
              <Input
                type="password"
                value={approveConfirmPassword}
                onChange={(e) => setApproveConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveTarget(null)} className="text-white/60">
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={actionLoading} className="bg-primary hover:bg-primary/90">
              {actionLoading ? 'Approving...' : 'Approve & Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Access Request</DialogTitle>
            <DialogDescription className="text-white/60">
              Reject the access request from {rejectTarget?.name} ({rejectTarget?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/80">Rejection Reason (optional)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="bg-white/5 border-white/10 text-white min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)} className="text-white/60">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
