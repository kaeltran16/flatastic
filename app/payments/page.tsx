'use client';

import { LoadingSpinner } from '@/components/household/loading';
import {
  BalanceCard,
  PaymentsSidebar,
  SettlementCard,
  SettlementDialog,
  StatsCards,
} from '@/components/payment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettlements } from '@/hooks/use-settlement';
import type { Balance } from '@/lib/supabase/types';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Receipt,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function PaymentsPage() {
  const {
    balances,
    completedSettlements,
    householdMembers,
    currentUser,
    loading,
    error,
    settlePayment,
  } = useSettlements();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<Balance | null>(null);

  const handleSettlePayment = async (
    balance: Balance,
    amount: number,
    note: string
  ) => {
    await settlePayment(balance, amount, note);
    setSelectedBalance(null);
  };

  const openSettleDialog = (balance: Balance) => {
    setSelectedBalance(balance);
    setDialogOpen(true);
  };

  // Filter balances to only show those involving current user
  const userBalances = balances.filter(
    (balance) =>
      balance.from_user_id === currentUser?.id ||
      balance.to_user_id === currentUser?.id
  );

  // Filter completed settlements to only show those involving current user
  const userCompletedSettlements = completedSettlements.filter(
    (settlement) =>
      settlement.from_user_id === currentUser?.id ||
      settlement.to_user_id === currentUser?.id
  );

  const pendingCount = userBalances.length;
  const completedCount = userCompletedSettlements.length;

  // Calculate total amounts
  const totalOwed = userBalances
    .filter((balance) => balance.to_user_id === currentUser?.id)
    .reduce((sum, balance) => sum + balance.amount, 0);

  const totalOwing = userBalances
    .filter((balance) => balance.from_user_id === currentUser?.id)
    .reduce((sum, balance) => sum + balance.amount, 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Payments & Settlements
          </h1>
          <p className="text-muted-foreground">
            Track and manage payment settlements from shared expenses
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards
          totalOwed={totalOwed}
          totalOwing={totalOwing}
          balances={userBalances}
          currentUserId={currentUser?.id}
          completedCount={completedCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="pending" className="space-y-6">
              <TabsList className="w-full">
                <TabsTrigger value="pending">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedCount})
                </TabsTrigger>
                <TabsTrigger value="all">All Settlements</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-6">
                {userBalances.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        All settled up!
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        No outstanding balances between household members
                      </p>
                      <Link href="/expenses">
                        <Button>Back to Expenses</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Net Balances Summary */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-xl font-semibold">Net Balances</h2>
                        <Badge variant="secondary">
                          {userBalances.length} pending
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {userBalances.map((balance, index) => (
                          <BalanceCard
                            key={`balance-${balance.from_user_id}-${balance.to_user_id}-${index}`}
                            balance={balance}
                            currentUserId={currentUser?.id}
                            onSettle={openSettleDialog}
                            variant="net"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Individual Expense Splits */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-xl font-semibold">
                          Individual Expense Splits
                        </h2>
                        <Badge variant="outline">
                          {userBalances.reduce(
                            (sum, b) => sum + b.related_splits.length,
                            0
                          )}{' '}
                          splits
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {userBalances.map((balance, balanceIndex) => (
                          <BalanceCard
                            key={`individual-${balance.from_user_id}-${balance.to_user_id}-${balanceIndex}`}
                            balance={balance}
                            currentUserId={currentUser?.id}
                            onSettle={openSettleDialog}
                            variant="individual"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {userCompletedSettlements.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No completed payments
                      </h3>
                      <p className="text-muted-foreground">
                        Completed settlements will appear here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  userCompletedSettlements.map((settlement) => (
                    <SettlementCard
                      key={settlement.id}
                      settlement={settlement}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="all" className="space-y-4">
                {userBalances.length === 0 &&
                userCompletedSettlements.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No settlements yet
                      </h3>
                      <p className="text-muted-foreground">
                        Add some expenses to start tracking settlements.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Show pending balances */}
                    {userBalances.map((balance, index) => (
                      <BalanceCard
                        key={`pending-${balance.from_user_id}-${balance.to_user_id}-${index}`}
                        balance={balance}
                        currentUserId={currentUser?.id}
                        onSettle={openSettleDialog}
                        variant="all"
                      />
                    ))}

                    {/* Show completed settlements */}
                    {userCompletedSettlements.map((settlement) => (
                      <SettlementCard
                        key={settlement.id}
                        settlement={settlement}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <PaymentsSidebar
            userBalances={userBalances}
            householdMembers={householdMembers}
            currentUserId={currentUser?.id}
            onRecordPayment={() =>
              userBalances.length > 0 && openSettleDialog(userBalances[0])
            }
          />
        </div>

        {/* Settlement Dialog */}
        <SettlementDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          selectedBalance={selectedBalance}
          currentUserId={currentUser?.id}
          onSettle={handleSettlePayment}
        />
      </div>
    </div>
  );
}
