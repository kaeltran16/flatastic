'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useProfile } from '@/hooks/use-profile';
import {
    bulkCompleteChores,
    bulkReassignChores,
    getAdminChoresList,
    getChoreAuditLog,
    getTemplatePerformanceStats,
} from '@/lib/actions/admin-chore';
import { formatDateRelatively } from '@/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock,
    History,
    Loader2,
    RefreshCw,
    User,
    Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';

export function AdminChoreTab() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const { members } = useHouseholdMembers(profile?.household_id || null);
  const [selectedChores, setSelectedChores] = useState<string[]>([]);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  // Fetch admin chores list
  const { data: choresResult, isLoading: choresLoading } = useQuery({
    queryKey: ['admin-chores-list', profile?.household_id],
    queryFn: () => getAdminChoresList(profile!.household_id!),
    enabled: !!profile?.household_id,
  });

  // Fetch chore audit log
  const { data: auditResult, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-chore-audit', profile?.household_id],
    queryFn: () => getChoreAuditLog(profile!.household_id!, 20),
    enabled: !!profile?.household_id,
  });

  // Fetch template performance stats
  const { data: statsResult, isLoading: _statsLoading } = useQuery({
    queryKey: ['admin-template-stats', profile?.household_id],
    queryFn: () => getTemplatePerformanceStats(profile!.household_id!),
    enabled: !!profile?.household_id,
  });

  // Bulk complete mutation
  const bulkCompleteMutation = useMutation({
    mutationFn: (choreIds: string[]) => bulkCompleteChores(choreIds),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Completed ${result.data?.completedCount} chore(s)`);
        setSelectedChores([]);
        invalidateQueries();
      } else {
        toast.error(result.error || 'Failed to complete chores');
      }
    },
    onError: () => {
      toast.error('Failed to complete chores');
    },
  });

  // Bulk reassign mutation
  const bulkReassignMutation = useMutation({
    mutationFn: ({
      choreIds,
      assignToUserId,
    }: {
      choreIds: string[];
      assignToUserId: string;
    }) => bulkReassignChores(choreIds, assignToUserId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Reassigned ${result.data?.reassignedCount} chore(s)`);
        setSelectedChores([]);
        setReassignDialogOpen(false);
        setSelectedAssignee('');
        invalidateQueries();
      } else {
        toast.error(result.error || 'Failed to reassign chores');
      }
    },
    onError: () => {
      toast.error('Failed to reassign chores');
    },
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-chores-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-chore-audit'] });
    queryClient.invalidateQueries({ queryKey: ['admin-template-stats'] });
    queryClient.invalidateQueries({ queryKey: ['chores'] });
  };

  const chores = choresResult?.data || [];
  const auditLog = auditResult?.data || [];
  const templateStats = statsResult?.data || [];

  const overdueCount = chores.filter((c) => c.isOverdue).length;
  const pendingCount = chores.filter((c) => !c.isOverdue).length;

  const handleSelectAll = () => {
    if (selectedChores.length === chores.length) {
      setSelectedChores([]);
    } else {
      setSelectedChores(chores.map((c) => c.id));
    }
  };

  const handleSelectChore = (choreId: string) => {
    setSelectedChores((prev) =>
      prev.includes(choreId)
        ? prev.filter((id) => id !== choreId)
        : [...prev, choreId]
    );
  };

  const handleBulkComplete = () => {
    if (selectedChores.length === 0) {
      toast.error('Please select at least one chore');
      return;
    }
    bulkCompleteMutation.mutate(selectedChores);
  };

  const handleBulkReassign = () => {
    if (!selectedAssignee) {
      toast.error('Please select a member');
      return;
    }
    bulkReassignMutation.mutate({
      choreIds: selectedChores,
      assignToUserId: selectedAssignee,
    });
  };

  if (choresLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Chores to be done</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={overdueCount > 0 ? 'border-red-200 dark:border-red-800' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : ''}`}>
                {overdueCount}
              </div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selected</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedChores.length}</div>
              <p className="text-xs text-muted-foreground">For bulk actions</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bulk Actions */}
      {selectedChores.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary">
            <CardContent className="flex items-center justify-between py-4">
              <span className="font-medium">
                {selectedChores.length} chore(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReassignDialogOpen(true)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reassign
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkComplete}
                  disabled={bulkCompleteMutation.isPending}
                >
                  {bulkCompleteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Mark Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Chores List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending & Overdue Chores</CardTitle>
                <CardDescription>
                  Select chores for bulk actions
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedChores.length === chores.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {chores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No pending or overdue chores!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedChores.length === chores.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Chore</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chores.map((chore) => (
                    <TableRow
                      key={chore.id}
                      className={chore.isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedChores.includes(chore.id)}
                          onCheckedChange={() => handleSelectChore(chore.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{chore.name}</p>
                          {chore.templateName && (
                            <p className="text-xs text-muted-foreground">
                              From: {chore.templateName}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {chore.assigneeId ? (
                            <>
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{chore.assigneeName}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {chore.dueDate
                          ? format(new Date(chore.dueDate), 'MMM d, yyyy')
                          : 'No due date'}
                      </TableCell>
                      <TableCell>
                        {chore.isOverdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Template Performance Stats */}
      {templateStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Template Performance
              </CardTitle>
              <CardDescription>
                Which templates have the most overdue chores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templateStats.slice(0, 5).map((stat) => (
                  <div
                    key={stat.templateId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{stat.templateName}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.totalChores} total chores
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-green-600">
                          {stat.completionRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">Complete</p>
                      </div>
                      <div className="text-center">
                        <p
                          className={`font-semibold ${
                            stat.overdueChores > 0 ? 'text-red-600' : 'text-muted-foreground'
                          }`}
                        >
                          {stat.overdueChores}
                        </p>
                        <p className="text-xs text-muted-foreground">Overdue</p>
                      </div>
                      {stat.avgCompletionTime !== null && (
                        <div className="text-center">
                          <p className="font-semibold">{stat.avgCompletionTime}h</p>
                          <p className="text-xs text-muted-foreground">Avg time</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Chore Audit Log */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Chore Activity
            </CardTitle>
            <CardDescription>
              Latest chore completions and assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : auditLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLog.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          entry.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900'
                            : entry.status === 'overdue'
                            ? 'bg-red-100 dark:bg-red-900'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        {entry.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : entry.status === 'overdue' ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{entry.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.assigneeName}
                          {entry.templateName && ` • From: ${entry.templateName}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          entry.status === 'completed'
                            ? 'default'
                            : entry.status === 'overdue'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {entry.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateRelatively(entry.completedAt || entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Chores</DialogTitle>
            <DialogDescription>
              Assign {selectedChores.length} selected chore(s) to a new member
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger>
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span>{member.full_name || member.email}</span>
                      {member.is_available === false && (
                        <Badge variant="outline" className="text-xs">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkReassign}
              disabled={!selectedAssignee || bulkReassignMutation.isPending}
            >
              {bulkReassignMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
