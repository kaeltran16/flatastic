'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import UserAvatar from '@/components/user-avatar';
import { useProfile } from '@/hooks/use-profile';
import {
    getExpenseAuditLog,
    getUnsettledExpensesSummary,
    sendSettlementReminders,
} from '@/lib/actions/admin-expense';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    ArrowRight,
    Bell,
    CheckCircle2,
    DollarSign,
    Loader2,
    Receipt
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function AdminExpenseTab() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  // Fetch unsettled expenses summary
  const { data: summaryResult, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-expense-summary', profile?.household_id],
    queryFn: () => getUnsettledExpensesSummary(profile!.household_id!),
    enabled: !!profile?.household_id,
  });

  // Fetch expense audit log
  const { data: auditResult, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-expense-audit', profile?.household_id],
    queryFn: () => getExpenseAuditLog(profile!.household_id!, 20),
    enabled: !!profile?.household_id,
  });

  // Send reminders mutation
  const sendRemindersMutation = useMutation({
    mutationFn: () => sendSettlementReminders(profile!.household_id!),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Sent ${result.data?.notificationsSent} reminder(s)`);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else {
        toast.error(result.error || 'Failed to send reminders');
      }
    },
    onError: () => {
      toast.error('Failed to send reminders');
    },
  });

  const summary = summaryResult?.data;
  const auditLog = auditResult?.data || [];

  if (summaryLoading) {
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
              <CardTitle className="text-sm font-medium">
                Total Unsettled
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${summary?.totalUnsettled.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all balances
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unsettled Splits
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.unsettledCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Individual expense splits
              </p>
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
              <CardTitle className="text-sm font-medium">
                Active Balances
              </CardTitle>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.balances.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Between members
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage expense settlements for your household
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              onClick={() => sendRemindersMutation.mutate()}
              disabled={sendRemindersMutation.isPending || !summary?.balances.length}
            >
              {sendRemindersMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bell className="mr-2 h-4 w-4" />
              )}
              Send Settlement Reminders
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Balance Summary */}
      {summary?.balances && summary.balances.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Balances</CardTitle>
              <CardDescription>
                Who owes whom in your household
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.balances.map((balance) => (
                  <div
                    key={`${balance.fromUserId}-${balance.toUserId}`}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          user={{
                            full_name: balance.fromUserName,
                            email: balance.fromUserEmail,
                            avatar_url: null,
                          }}
                          shouldShowName={false}
                        />
                        <span className="font-medium">{balance.fromUserName}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          user={{
                            full_name: balance.toUserName,
                            email: balance.toUserEmail,
                            avatar_url: null,
                          }}
                          shouldShowName={false}
                        />
                        <span className="font-medium">{balance.toUserName}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg">
                      ${balance.amount.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Expense Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Expense Activity</CardTitle>
            <CardDescription>
              Latest expenses in your household
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : auditLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No recent expenses</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {expense.description}
                      </TableCell>
                      <TableCell>${expense.amount.toFixed(2)}</TableCell>
                      <TableCell>{expense.paidByName}</TableCell>
                      <TableCell>
                        {format(new Date(expense.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {expense.settledCount === expense.splitCount ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Settled
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {expense.settledCount}/{expense.splitCount} settled
                          </Badge>
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

      {/* No balances message */}
      {summary?.balances.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            All expenses are settled! No outstanding balances.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
