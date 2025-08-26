'use client';

import { LoadingSpinner } from '@/components/household/loading';
import AddPenaltyDialog from '@/components/penalty-fund/add-penalty-fund-dialog'; // Import the separated dialog
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

  // Get recent penalties for the household
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
  });

  // Get total fund balance
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
  });

  // Get monthly fund additions
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
  });

  // Get recent chores for the household
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
  });

  const handlePenaltyAdded = () => {
    // Refetch all related data
    queryClient.invalidateQueries({ queryKey: ['fund_penalties'] });
    queryClient.invalidateQueries({ queryKey: ['fund_balance'] });
    queryClient.invalidateQueries({ queryKey: ['fund_monthly'] });
    console.log('Penalty added successfully');
  };

  // Helper function to get user initials
  const getUserInitials = (fullName: string | null, email: string) => {
    if (fullName) {
      return fullName
        .split(' ')
        .map((name) => name.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  // Helper function to get user display name
  const getUserDisplayName = (fullName: string | null, email: string) => {
    return fullName || email.split('@')[0];
  };

  // Helper function to format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    },
  };

  if (!profile) {
    return <LoadingSpinner />;
  }

  if (!profile?.household_id) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not a member of any household.
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  if (membersError || penaltiesError) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load data. Please try again.
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile-Optimized Header */}
      <motion.div
        className="bg-white shadow-sm border-b sticky top-0 z-40"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Household Fund
              </h1>
              <p className="text-sm text-gray-500 mt-1 hidden sm:block">
                Manage penalties and fund balance
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Mobile Optimized */}
      <motion.div
        className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-end">
          {/* Add Penalty Button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-black hover:bg-gray-800 text-white px-3 py-2 rounded-lg font-medium text-sm"
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add Penalty</span>
              <span className="sm:hidden">Penalty</span>
            </Button>
          </motion.div>
        </div>
        {/* Total Fund Balance - Mobile Optimized */}
        <motion.div variants={itemVariants} className="w-full">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl w-full">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-green-100 text-xs sm:text-sm font-medium">
                    Total Fund Balance
                  </p>
                  <motion.div
                    className="text-2xl sm:text-3xl md:text-4xl font-bold mt-1 sm:mt-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                  >
                    {balanceLoading ? (
                      <div className="h-8 sm:h-10 md:h-12 bg-white/20 rounded animate-pulse w-32"></div>
                    ) : (
                      `$${fundBalance.toFixed(2)}`
                    )}
                  </motion.div>
                </div>
                <motion.div
                  className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 ml-3"
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                </motion.div>
              </div>
              <motion.div
                className="flex items-center gap-2 mt-3 sm:mt-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-100 flex-shrink-0" />
                <span className="text-green-100 text-xs sm:text-sm">
                  {monthlyLoading ? (
                    <div className="h-3 bg-white/20 rounded w-20 animate-pulse"></div>
                  ) : (
                    `+$${monthlyAdditions.toFixed(2)} this month`
                  )}
                </span>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity and Issues - Mobile Optimized */}
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
                    {recentPenalties.map((penalty, index) => {
                      const userName = getUserDisplayName(
                        penalty.profiles.full_name,
                        penalty.profiles.email
                      );

                      return (
                        <motion.div
                          key={penalty.id}
                          className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
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
                              {getRelativeTime(penalty.created_at!)}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <motion.div
                    className="text-center py-6 sm:py-8"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <motion.div
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                    >
                      <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    </motion.div>
                    <p className="text-xs sm:text-sm text-gray-500">
                      No penalties yet
                    </p>
                  </motion.div>
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
                    {recentChores.slice(0, 5).map((chore: any, index) => (
                      <motion.div
                        key={chore.id}
                        className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
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
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    className="text-center py-6 sm:py-8"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 }}
                  >
                    <motion.div
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                    >
                      <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                    </motion.div>
                    <p className="text-xs sm:text-sm text-gray-500">
                      No current issues! 🎉
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

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
    </div>
  );
}
