'use client';

import { LoadingSpinner } from '@/components/household/loading';
import AddPenaltyDialog from '@/components/penalty-fund/add-penalty-fund-dialog';
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
import { useHouseholdMembers, useProfile } from '@/hooks/use-supabase-data';
import { createClient } from '@/lib/supabase/client';
import { ChoreStatus, FundPenalty } from '@/lib/supabase/schema.alias';
import { formatDateRelatively } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  Plus,
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { profile } = useProfile();

  // Use the custom hook to get household members
  const {
    members: householdMembers = [],
    loading: membersLoading,
    error: membersError,
  } = useHouseholdMembers(profile?.household_id || null);

  // Optimized queries with staleTime to reduce unnecessary refetches
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
    staleTime: 30000, // 30 seconds
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
    staleTime: 60000, // 1 minute
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
        .eq('household_id', profile?.household_id || null)
        .in('status', EXPIRED_CHORE_STATUS)
        .order('due_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.household_id,
    staleTime: 60000,
  });

  const handlePenaltyAdded = () => {
    // Refetch all related data
    queryClient.invalidateQueries({ queryKey: ['fund_penalties'] });
    queryClient.invalidateQueries({ queryKey: ['fund_balance'] });
    queryClient.invalidateQueries({ queryKey: ['fund_monthly'] });
    console.log('Penalty added successfully');
  };

  const getUserDisplayName = (fullName: string | null, email: string) => {
    return fullName || email.split('@')[0];
  };

  // Simplified animation variants
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
        {/* Header */}
        <motion.div className="mb-6 sm:mb-8" variants={itemVariants}>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            Household Fund
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Manage penalties and fund balance
          </p>
        </motion.div>

        {/* Add Penalty Button */}
        <motion.div className="mb-4" variants={itemVariants}>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Penalty
          </Button>
        </motion.div>

        {/* Optimized Fund Balance Card */}
        <motion.div variants={itemVariants} className="w-full mb-6 sm:mb-8">
          <Card className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-xl border-0 w-full hover-lift">
            {/* Simplified background decoration */}
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full"></div>
            </div>

            {/* Dark overlay for better contrast */}
            <div className="absolute inset-0 bg-black/10 rounded-lg"></div>

            <CardContent className="relative p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm sm:text-base font-semibold mb-2 drop-shadow-sm">
                    Total Fund Balance
                  </p>
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mt-2">
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

                  {/* Monthly indicator */}
                  <div className="flex items-center gap-3 mt-4 sm:mt-6">
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 hover:bg-white/25 transition-colors border border-white/10">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow-sm" />
                      <span className="text-white text-sm sm:text-base font-semibold drop-shadow-sm">
                        {monthlyLoading ? (
                          <div className="h-4 bg-white/20 rounded w-24 animate-pulse"></div>
                        ) : (
                          `+${monthlyAdditions.toFixed(2)} this month`
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simplified icon */}
                <div className="relative flex-shrink-0 ml-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 hover:bg-white/25 transition-colors shadow-lg bg-yellow-500">
                    <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white drop-shadow-lg " />
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {!monthlyLoading && monthlyAdditions > 0 && (
                <div className="mt-6 pt-4 border-t border-white/30">
                  <div className="flex justify-between items-center text-sm text-white/90 mb-2 font-medium">
                    <span className="drop-shadow-sm">Monthly Progress</span>
                    <span className="drop-shadow-sm">
                      {((monthlyAdditions / (fundBalance || 1)) * 100).toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className="bg-white/80 h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                      style={{
                        width: `${Math.min(
                          (monthlyAdditions / (fundBalance || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity and Issues */}
        <div className="space-y-4 sm:space-y-6 w-full">
          {/* Recent Penalties */}
          <motion.div variants={itemVariants} className="w-full">
            <Card className="shadow-lg w-full">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  Recent Penalties
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Latest fund additions and penalties
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
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {userName}
                              </p>
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
                            <p className="text-xs sm:text-sm font-semibold text-red-600">
                              -${Number(penalty.amount).toFixed(2)}
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
                      No penalties yet
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

      {/* Add Penalty Dialog */}
      <AddPenaltyDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        householdId={profile.household_id}
        householdMembers={householdMembers}
        recentChores={recentChores}
        currentUser={profile}
        isLoading={membersLoading}
        onPenaltyAdded={handlePenaltyAdded}
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
