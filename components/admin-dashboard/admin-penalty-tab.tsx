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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import UserAvatar from '@/components/user-avatar';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useProfile } from '@/hooks/use-profile';
import {
    deletePenalty,
    getPenaltyHistory,
    getPenaltySummaryByMember,
    updatePenaltyAmount,
} from '@/lib/actions/admin-penalty';
import { formatDateRelatively } from '@/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Award,
    DollarSign,
    Edit,
    Loader2,
    PiggyBank,
    Trash2,
    TrendingDown,
    User
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface EditPenaltyState {
  id: string;
  currentAmount: number;
  reason: string;
  isReward: boolean;
}

export function AdminPenaltyTab() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [editPenalty, setEditPenalty] = useState<EditPenaltyState | null>(null);
  const [newAmount, setNewAmount] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { members } = useHouseholdMembers(profile?.household_id || null);

  // Fetch penalty summary by member
  const { data: summaryResult, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-penalty-summary', profile?.household_id],
    queryFn: () => getPenaltySummaryByMember(profile!.household_id!),
    enabled: !!profile?.household_id,
  });

  // Fetch penalty history
  const { data: historyResult, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-penalty-history', profile?.household_id, selectedMember],
    queryFn: () =>
      getPenaltyHistory(
        profile!.household_id!,
        selectedMember === 'all' ? undefined : selectedMember,
        30
      ),
    enabled: !!profile?.household_id,
  });

  // Update penalty mutation
  const updateMutation = useMutation({
    mutationFn: ({
      penaltyId,
      amount,
      reason,
    }: {
      penaltyId: string;
      amount: number;
      reason?: string;
    }) => updatePenaltyAmount(penaltyId, amount, reason),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Penalty updated successfully');
        setEditPenalty(null);
        setNewAmount('');
        setAdjustmentReason('');
        queryClient.invalidateQueries({ queryKey: ['admin-penalty-summary'] });
        queryClient.invalidateQueries({ queryKey: ['admin-penalty-history'] });
        queryClient.invalidateQueries({ queryKey: ['fund_penalties'] });
        queryClient.invalidateQueries({ queryKey: ['fund_balance'] });
      } else {
        toast.error(result.error || 'Failed to update penalty');
      }
    },
    onError: () => {
      toast.error('Failed to update penalty');
    },
  });

  // Delete penalty mutation
  const deleteMutation = useMutation({
    mutationFn: (penaltyId: string) => deletePenalty(penaltyId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Transaction deleted successfully');
        setDeleteConfirmId(null);
        queryClient.invalidateQueries({ queryKey: ['admin-penalty-summary'] });
        queryClient.invalidateQueries({ queryKey: ['admin-penalty-history'] });
        queryClient.invalidateQueries({ queryKey: ['fund_penalties'] });
        queryClient.invalidateQueries({ queryKey: ['fund_balance'] });
      } else {
        toast.error(result.error || 'Failed to delete transaction');
      }
    },
    onError: () => {
      toast.error('Failed to delete transaction');
    },
  });

  const summaries = summaryResult?.data || [];
  const history = historyResult?.data || [];
  const totalFund = summaries.reduce((sum, s) => sum + s.netBalance, 0);

  const handleEditClick = (penalty: {
    id: string;
    amount: number;
    reason: string;
    isReward: boolean;
  }) => {
    setEditPenalty({
      id: penalty.id,
      currentAmount: penalty.amount,
      reason: penalty.reason,
      isReward: penalty.isReward,
    });
    setNewAmount(penalty.amount.toString());
  };

  const handleSaveEdit = () => {
    if (!editPenalty) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    // For rewards, store as negative
    const finalAmount = editPenalty.isReward ? -amount : amount;
    updateMutation.mutate({
      penaltyId: editPenalty.id,
      amount: finalAmount,
      reason: adjustmentReason || undefined,
    });
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fund Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fund Balance</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalFund.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total penalties minus rewards
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Member Summaries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Member Summaries</CardTitle>
            <CardDescription>
              Penalty and reward totals per household member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summaries.map((member) => (
                <Card key={member.userId} className="border">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <UserAvatar
                        user={{
                          full_name: member.userName,
                          email: member.userEmail,
                          avatar_url: member.avatarUrl,
                        }}
                        shouldShowName={false}
                      />
                      <div>
                        <p className="font-medium">{member.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.userEmail}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-red-50 dark:bg-red-950 rounded">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingDown className="h-3 w-3 text-red-600" />
                          <span className="text-xs text-red-600">Penalties</span>
                        </div>
                        <p className="font-semibold text-red-600">
                          ${member.totalPenalties.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.penaltyCount} total
                        </p>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                        <div className="flex items-center justify-center gap-1">
                          <Award className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600">Rewards</span>
                        </div>
                        <p className="font-semibold text-green-600">
                          ${member.totalRewards.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.rewardCount} total
                        </p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <div className="flex items-center justify-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="text-xs">Net</span>
                        </div>
                        <p
                          className={`font-semibold ${
                            member.netBalance >= 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          ${Math.abs(member.netBalance).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.netBalance >= 0 ? 'owes' : 'credit'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  All penalties and rewards with edit capability
                </CardDescription>
              </div>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="w-[180px]">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No transactions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.userName}</TableCell>
                      <TableCell>
                        {item.isReward ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            <Award className="h-3 w-3 mr-1" />
                            Reward
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Penalty
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className={`font-semibold ${
                          item.isReward ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {item.isReward ? '+' : '-'}${item.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.reason}
                        {item.choreName && (
                          <span className="text-xs text-muted-foreground block">
                            Chore: {item.choreName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateRelatively(item.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleEditClick({
                                id: item.id,
                                amount: item.amount,
                                reason: item.reason,
                                isReward: item.isReward,
                              })
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirmId(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Penalty Dialog */}
      <Dialog open={!!editPenalty} onOpenChange={() => setEditPenalty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editPenalty?.isReward ? 'Reward' : 'Penalty'} Amount
            </DialogTitle>
            <DialogDescription>
              Adjust the amount for: {editPenalty?.reason}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">New Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Enter new amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Adjustment (optional)</Label>
              <Input
                id="reason"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Admin correction"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPenalty(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
