'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { useSettlements } from '@/hooks/use-settlement';
import type { ExpenseSplit } from '@/lib/supabase/types';
import {
  ArrowLeft,
  CheckCircle,
  DollarSign,
  Receipt,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
interface Balance {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
  related_splits: ExpenseSplit[];
}

export default function SettlePaymentsPage() {
  const {
    balances,
    householdMembers,
    currentUser,
    loading,
    error,
    settlePayment,
  } = useSettlements();

  const [settlingPayment, setSettlingPayment] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<Balance | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const handleSettlePayment = async () => {
    if (!selectedBalance || !paymentAmount) return;

    try {
      setSettlingPayment(true);
      const amount = parseFloat(paymentAmount);

      if (amount <= 0 || amount > selectedBalance.amount) {
        toast.error('Invalid amount', {
          description:
            'Payment amount must be between $0 and the total owed amount.',
        });
        return;
      }

      // Use the hook's settlePayment function
      await settlePayment(selectedBalance, amount, paymentNote);

      toast.success('Payment settled!', {
        description: `${amount.toFixed(2)} payment recorded successfully.`,
      });

      // Close dialog and reset form
      setDialogOpen(false);
      setSelectedBalance(null);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (err) {
      console.error('Error settling payment:', err);
      toast.error('Error settling payment', {
        description: 'Failed to record payment. Please try again.',
      });
    } finally {
      setSettlingPayment(false);
    }
  };

  const openSettleDialog = (balance: Balance) => {
    setSelectedBalance(balance);
    setPaymentAmount(balance.amount.toString());
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading payment data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/expenses"
                className="flex items-center text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span>Back to Expenses</span>
              </Link>
              <span className="ml-4 text-muted-foreground">/</span>
              <span className="ml-4 font-medium">Settle Payments</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Settle Payments
          </h1>
          <p className="text-muted-foreground">
            Record payments between household members to settle outstanding
            balances
          </p>
        </div>

        {/* Outstanding Balances */}
        <div className="space-y-6">
          {balances.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All settled up!</h3>
                <p className="text-muted-foreground mb-4">
                  No outstanding balances between household members
                </p>
                <Link href="/expenses">
                  <Button>Back to Expenses</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Outstanding Balances</h2>
                <Badge variant="secondary">{balances.length} pending</Badge>
              </div>

              {balances.map((balance, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {balance.from_user_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {balance.from_user_id === currentUser?.id
                                ? 'You'
                                : balance.from_user_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              owes
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              ${balance.amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {balance.related_splits.length} expense
                              {balance.related_splits.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                        </div>

                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium">
                              {balance.to_user_id === currentUser?.id
                                ? 'You'
                                : balance.to_user_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              is owed
                            </p>
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {balance.to_user_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSettleDialog(balance)}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Record Payment
                        </Button>
                      </div>
                    </div>

                    {/* Related expenses preview */}
                    <div className="mt-4 pt-4 border-t">
                      <details className="group">
                        <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                          <Receipt className="h-4 w-4" />
                          Related expenses ({balance.related_splits.length})
                          <span className="group-open:rotate-180 transition-transform">
                            ▼
                          </span>
                        </summary>
                        <div className="mt-2 space-y-1">
                          {balance.related_splits.map((split, splitIndex) => (
                            <div
                              key={splitIndex}
                              className="text-sm flex justify-between items-center py-1"
                            >
                              <span className="text-muted-foreground">
                                {split.expenses.description}
                              </span>
                              <span className="font-medium">
                                ${split.amount_owed.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Settlement Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                {selectedBalance && (
                  <>
                    Record a payment from{' '}
                    <strong>
                      {selectedBalance.from_user_id === currentUser?.id
                        ? 'you'
                        : selectedBalance.from_user_name}
                    </strong>{' '}
                    to{' '}
                    <strong>
                      {selectedBalance.to_user_id === currentUser?.id
                        ? 'you'
                        : selectedBalance.to_user_name}
                    </strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Payment Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedBalance?.amount || 0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum: ${selectedBalance?.amount.toFixed(2) || '0.00'}
                </p>
              </div>

              <div>
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Add a note about this payment..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSettlePayment}
                disabled={!paymentAmount || settlingPayment}
              >
                {settlingPayment ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
