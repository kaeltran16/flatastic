'use client';

import { LoadingSpinner } from '@/components/household/loading';
import AddPenaltyDialog from '@/components/penalty-fund/add-penalty-fund-dialog';
import AddRewardDialog from '@/components/penalty-fund/add-reward-dialog';
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
  CheckCircle,
  CircleSlash2,
  DollarSign,
  FileText,
  TrendingDown,
  TrendingUp,
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
    data: recentPenalties = [],
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
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data as unknown as FundPenaltyWithRelations[]) || [];
    },
    enabled: !!profile?.household_id,
    staleTime: 30000,
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

  // Current user's balance (penalties minus rewards)
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

  const getUserDisplayName = (fullName: string | null, email: string) => {
    return fullName || email.split('@')[0];
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 sm:mb-8">
          {/* Household Fund Balance Card */}
          <motion.div variants={itemVariants} className="w-full">
            <Card className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-xl border-0 w-full hover-lift">
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full"></div>
              </div>

              <div className="absolute inset-0 bg-black/10 rounded-lg"></div>

              <CardContent className="relative p-6 sm:p-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm sm:text-base font-semibold mb-2 drop-shadow-sm">
                      Household Fund Balance
                    </p>
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold mt-2">
                      {balanceLoading ? (
                        <LoadingSpinner />
                      ) : (
                        <span
                          className="text-white drop-shadow-xl font-extrabold"
                          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                        >
                          ${fundBalance.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-4 sm:mt-6">
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 hover:bg-white/25 transition-colors border border-white/10">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow-sm" />
                        <span className="text-white text-sm sm:text-base font-semibold drop-shadow-sm">
                          {monthlyLoading ? (
                            <div className="h-4 bg-white/20 rounded w-24 animate-pulse"></div>
                          ) : (
                            `${
                              monthlyAdditions >= 0 ? '+' : ''
                            }${monthlyAdditions.toFixed(2)} this month`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex-shrink-0 ml-4">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 bg-yellow-500 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 hover:bg-yellow-400 transition-colors shadow-lg">
                      <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white drop-shadow-lg" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Your Balance Card */}
          <motion.div variants={itemVariants} className="w-full">
            <Card className="relative bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600 text-white shadow-xl border-0 w-full hover-lift">
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full"></div>
              </div>

              <div className="absolute inset-0 bg-black/10 rounded-lg"></div>

              <CardContent className="relative p-6 sm:p-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm sm:text-base font-semibold mb-2 drop-shadow-sm">
                      Your Balance
                    </p>
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold mt-2">
                      {userBalanceLoading ? (
                        <LoadingSpinner />
                      ) : (
                        <span
                          className={`drop-shadow-xl font-extrabold text-white`}
                          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                        >
                          ${(userBalance?.net || 0).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-3 mt-4 sm:mt-6 flex-col md:flex-row">
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 hover:bg-white/25 transition-colors border border-white/10">
                        <CircleSlash2 className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow-sm" />
                        <span className="text-white text-sm sm:text-base font-semibold drop-shadow-sm">
                          {userBalanceLoading ? (
                            <div className="h-4 bg-white/20 rounded w-24 animate-pulse"></div>
                          ) : (
                            `${(userBalance?.penalties || 0).toFixed(
                              2
                            )} penalties`
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 hover:bg-white/25 transition-colors border border-white/10">
                        <Award className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow-sm" />
                        <span className="text-white text-sm sm:text-base font-semibold drop-shadow-sm">
                          {userBalanceLoading ? (
                            <div className="h-4 bg-white/20 rounded w-24 animate-pulse"></div>
                          ) : (
                            `${(userBalance?.rewards || 0).toFixed(2)} rewards`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex-shrink-0 ml-4">
                    <div
                      className={`h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 transition-colors shadow-lg ${
                        (userBalance?.net || 0) > 0
                          ? 'bg-red-500 hover:bg-red-400'
                          : 'bg-green-500 hover:bg-green-400'
                      }`}
                    >
                      {(userBalance?.net || 0) > 0 ? (
                        <Award className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white drop-shadow-lg" />
                      ) : (
                        <TrendingDown className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white drop-shadow-lg" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity and Issues */}
        <div className="space-y-4 sm:space-y-6 w-full">
          {/* Recent Transactions */}
          <motion.div variants={itemVariants} className="w-full">
            <Card className="shadow-lg w-full">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  Recent Transactions
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Latest penalties and rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                ) : recentPenalties.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {recentPenalties.map((penalty) => {
                      const userName = getUserDisplayName(
                        penalty.profiles.full_name,
                        penalty.profiles.email
                      );
                      const isReward = Number(penalty.amount) < 0;
                      const amount = Math.abs(Number(penalty.amount));

                      return (
                        <div
                          key={penalty.id}
                          className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full cursor-pointer"
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
                                    className="bg-green-50 text-green-700 border-green-200"
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
                          <div className="text-right ml-2 sm:ml-4 flex-shrink-0">
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
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <p className="text-xs sm:text-sm text-gray-500">
                      No transactions yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Current Issues */}
          <motion.div variants={itemVariants} className="w-full">
            <Card className="shadow-lg w-full">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                  Current Issues
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Chores that may need penalties
                </CardDescription>
              </CardHeader>
              <CardContent>
                {choresLoading ? (
                  <div className="space-y-2 sm:space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="p-3 sm:p-4 border rounded-lg animate-pulse"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-2 sm:h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                          <div className="h-5 w-12 sm:h-6 sm:w-16 bg-gray-200 rounded ml-2 sm:ml-4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentChores.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {recentChores.slice(0, 5).map((chore: any) => (
                      <div
                        key={chore.id}
                        className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full cursor-pointer"
                      >
                        <div className="flex-1 min-w-0 pr-2 sm:pr-4">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {chore.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            Assigned to:{' '}
                            {chore.profiles?.full_name || 'Unknown'}
                          </p>
                          {chore.due_date && (
                            <p className="text-xs text-gray-500 truncate">
                              Due:{' '}
                              {new Date(chore.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            chore.status === 'overdue'
                              ? 'destructive'
                              : chore.status === 'incomplete'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-xs flex-shrink-0"
                        >
                          {chore.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                    <p className="text-xs sm:text-sm text-gray-500">
                      No current issues! 🎉
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Dialogs */}
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

      <style jsx>{`
        .hover-lift:hover {
          transform: translateY(-2px);
          transition: transform 0.2s ease;
        }
      `}</style>
    </motion.div>
  );
}
