'use client';

import { LoadingSpinner } from '@/components/household/loading';
import AddPenaltyDialog from '@/components/penalty-fund/add-penalty-fund-dialog';
import AddRewardDialog from '@/components/penalty-fund/add-reward-dialog';
import PenaltyHeroStats from '@/components/penalty-fund/penalty-hero-stats';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import UserAvatar from '@/components/user-avatar';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useProfile } from '@/hooks/use-profile';
import { createClient } from '@/lib/supabase/client';
import { ChoreStatus, FundPenalty } from '@/lib/supabase/schema.alias';
import { formatDateRelatively } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Award,
  DollarSign,
  FileText,
  Search,
  Trash2,
  TrendingDown,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface FundPenaltyWithRelations extends FundPenalty {
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  chores?: {
    id: string;
    name: string;
  } | null;
}

const EXPIRED_CHORE_STATUS: ChoreStatus[] = ['overdue'];

export default function HouseholdFundPage() {
  const [isPenaltyDialogOpen, setIsPenaltyDialogOpen] = useState(false);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { profile } = useProfile();

  const {
    members: householdMembers = [],
    loading: membersLoading,
    error: membersError,
  } = useHouseholdMembers(profile?.household_id, {
    enabled: !!profile?.household_id,
  });

  const {
    data: allPenalties = [],
    isLoading: penaltiesLoading,
    error: penaltiesError,
  } = useQuery({
    queryKey: ['fund_penalties', profile?.household_id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fund_penalties')
        .select(
          `
          id,
          household_id,
          user_id,
          amount,
          reason,
          chore_id,
          description,
          created_at,
          updated_at,
          profiles!fund_penalties_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          chores(
            id,
            name
          )
        `
        )
        .eq('household_id', profile?.household_id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as FundPenaltyWithRelations[]) || [];
    },
    enabled: !!profile?.household_id,
    staleTime: 30000,
  });

  // Get recent penalties (limit to 10)
  const recentPenalties = allPenalties.slice(0, 10);

  // Filter penalties by search term
  const filteredPenalties = allPenalties.filter((penalty) => {
    const userName = penalty.profiles.full_name || penalty.profiles.email;
    const searchTerm = searchFilter.toLowerCase();
    return (
      userName.toLowerCase().includes(searchTerm) ||
      penalty.reason.toLowerCase().includes(searchTerm)
    );
  });

  const { data: fundBalance = 0, isLoading: balanceLoading } = useQuery({
    queryKey: ['fund_balance', profile?.household_id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fund_penalties')
        .select('amount')
        .eq('household_id', profile?.household_id || '');

      if (error) throw error;

      const total =
        data?.reduce((sum, penalty) => sum + Number(penalty.amount), 0) || 0;
      return total;
    },
    enabled: !!profile?.household_id,
    staleTime: 30000,
  });

  const { data: monthlyAdditions = 0, isLoading: monthlyLoading } = useQuery({
    queryKey: ['fund_monthly', profile?.household_id],
    queryFn: async () => {
      const supabase = createClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('fund_penalties')
        .select('amount')
        .eq('household_id', profile?.household_id || '')
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;

      const total =
        data?.reduce((sum, penalty) => sum + Number(penalty.amount), 0) || 0;
      return total;
    },
    enabled: !!profile?.household_id,
    staleTime: 60000,
  });

  const { data: userBalance, isLoading: userBalanceLoading } = useQuery({
    queryKey: ['user_balance', profile?.household_id, profile?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fund_penalties')
        .select('amount')
        .eq('household_id', profile?.household_id || '')
        .eq('user_id', profile?.id || '');

      if (error) throw error;

      const penalties = data?.filter((p) => Number(p.amount) > 0) || [];
      const rewards = data?.filter((p) => Number(p.amount) < 0) || [];

      const totalPenalties = penalties.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const totalRewards = Math.abs(
        rewards.reduce((sum, r) => sum + Number(r.amount), 0)
      );
      const netBalance = totalRewards - totalPenalties;

      return {
        penalties: totalPenalties,
        rewards: totalRewards,
        net: netBalance,
      };
    },
    enabled: !!profile?.household_id && !!profile?.id,
    staleTime: 30000,
  });

  const { data: recentChores = [], isLoading: choresLoading } = useQuery({
    queryKey: ['chores', profile?.household_id, 'recent'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('chores')
        .select(
          `
          *,
          profiles!chores_assigned_to_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        `
        )
        .eq('household_id', profile?.household_id || '')
        .in('status', EXPIRED_CHORE_STATUS)
        .order('due_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.household_id,
    staleTime: 60000,
  });

  const handleTransactionAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['fund_penalties'] });
    queryClient.invalidateQueries({ queryKey: ['fund_balance'] });
    queryClient.invalidateQueries({ queryKey: ['fund_monthly'] });
    queryClient.invalidateQueries({ queryKey: ['user_balance'] });
  };

  const handleDeleteTransaction = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      
      // Find the penalty to get description info
      const penalty = allPenalties.find(p => p.id === deleteConfirmId);
      if (!penalty) throw new Error('Penalty not found');
      console.log(penalty);
      // Delete the penalty record
      const { error: penaltyError } = await supabase
        .from('fund_penalties')
        .delete()
        .eq('id', deleteConfirmId);

      if (penaltyError) throw penaltyError;

      // Delete related expense splits first
      const { error: splitsError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', penalty.id); // This assumes expense_id matches penalty structure

      // Delete related expense
      const { error: expenseError } = await supabase
        .from('expenses')
        .delete()
        .eq('description', `Penalty: ${penalty.reason}${penalty.description ? ` - ${penalty.description}` : ''}`);

      setDeleteConfirmId(null);
      handleTransactionAdded();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getUserDisplayName = (fullName: string | null, email: string) => {
    return fullName || email.split('@')[0];
  };

  const {data: adminId} = useQuery({
    queryKey: ['household_admin', profile?.household_id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('households')
        .select('admin_id')
        .eq('id', profile?.household_id || '')
        .single();

      if (error) throw error;
      return data?.admin_id || null;
    },
    enabled: !!profile?.household_id,
    staleTime: 30000,
  });

  const isAdmin = profile?.id === adminId;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, duration: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  if (!profile) {
    return <LoadingSpinner />;
  }

  if (!profile?.household_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not a member of any household.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (membersError || penaltiesError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const transactionsToDisplay = showAllTransactions ? filteredPenalties : recentPenalties;

  return (
    <motion.div
      className="min-h-screen bg-background"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <motion.div className="mb-6 sm:mb-8" variants={itemVariants}>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            Household Fund
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Manage penalties, rewards, and fund balance
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div className="mb-4 flex gap-3" variants={itemVariants}>
          <Button
            onClick={() => setIsPenaltyDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Add Penalty
          </Button>
          <Button
            onClick={() => setIsRewardDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            <Award className="h-4 w-4 mr-2" />
            Add Reward
          </Button>
        </motion.div>

        {/* Balance Cards Grid */}
        <div className="mb-6 sm:mb-8">
          <PenaltyHeroStats
            fundBalance={fundBalance}
            monthlyAdditions={monthlyAdditions}
            userBalance={userBalance}
            loading={balanceLoading || monthlyLoading || userBalanceLoading}
          />
        </div>

        {/* Recent Transactions */}
        <motion.div variants={itemVariants} className="w-full">
          <Card className="shadow-lg w-full">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    {showAllTransactions ? 'All Transactions' : 'Recent Transactions'}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {showAllTransactions
                      ? `Showing ${filteredPenalties.length} transactions`
                      : 'Latest penalties and rewards'}
                  </CardDescription>
                </div>
                {!showAllTransactions && allPenalties.length > 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllTransactions(true)}
                    className="text-xs sm:text-sm"
                  >
                    View All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {showAllTransactions && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or reason..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-9 text-sm"
                    />
                    {searchFilter && (
                      <button
                        onClick={() => setSearchFilter('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {penaltiesLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-3 sm:p-4 border rounded-lg animate-pulse"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                          <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gray-200 rounded-full"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-2 sm:h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="h-3 sm:h-4 bg-gray-200 rounded w-16"></div>
                          <div className="h-2 sm:h-3 bg-gray-200 rounded w-12"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactionsToDisplay.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {transactionsToDisplay.map((penalty) => {
                    const userName = getUserDisplayName(
                      penalty.profiles.full_name,
                      penalty.profiles.email
                    );
                    const isReward = Number(penalty.amount) < 0;
                    const amount = Math.abs(Number(penalty.amount));

                    return (
                      <div
                        key={penalty.id}
                        className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full group"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          <UserAvatar
                            user={penalty.profiles}
                            shouldShowName={false}
                            showAsYou={penalty.profiles.id === profile.id}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {userName}
                              </p>
                              {isReward && (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200 text-xs"
                                >
                                  <Award className="h-3 w-3 mr-1" />
                                  Reward
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {penalty.reason}
                            </p>
                            {penalty.chores && (
                              <p className="text-xs text-gray-400 truncate">
                                Chore: {penalty.chores.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-2 sm:ml-4 flex-shrink-0 flex items-center gap-2">
                          <div>
                            <p
                              className={`text-xs sm:text-sm font-semibold ${
                                isReward ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {isReward ? '+' : '-'}${amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateRelatively(penalty.created_at!)}
                            </p>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(penalty.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-xs sm:text-sm text-gray-500">
                    {showAllTransactions && searchFilter
                      ? 'No transactions match your search'
                      : 'No transactions yet'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {showAllTransactions && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAllTransactions(false);
                setSearchFilter('');
              }}
            >
              Show Recent
            </Button>
          </div>
        )}
      </div>

      {/* Add Penalty Dialog */}
      <AddPenaltyDialog
        isOpen={isPenaltyDialogOpen}
        onOpenChange={setIsPenaltyDialogOpen}
        householdId={profile.household_id}
        householdMembers={householdMembers}
        recentChores={recentChores}
        currentUser={profile}
        isLoading={membersLoading}
        onPenaltyAdded={handleTransactionAdded}
      />

      {/* Add Reward Dialog */}
      <AddRewardDialog
        isOpen={isRewardDialogOpen}
        onOpenChange={setIsRewardDialogOpen}
        householdId={profile.household_id}
        householdMembers={householdMembers}
        recentChores={recentChores}
        currentUser={profile}
        isLoading={membersLoading}
        onRewardAdded={handleTransactionAdded}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this transaction? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTransaction}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .hover-lift:hover {
          transform: translateY(-2px);
          transition: transform 0.2s ease;
        }
      `}</style>
    </motion.div>
  );
}