'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { Household, Profile } from '@/lib/supabase/schema.alias';
import { getInitials } from '@/utils';
import {
  Calendar,
  Edit,
  Mail,
  Menu,
  Plus,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('Authentication error');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          setError(error.message || 'Failed to load profile');
        } else {
          setProfile(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return { profile, loading, error };
}

function useHousehold(householdId: string | null) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHousehold() {
      if (!householdId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
          .from('households')
          .select('*')
          .eq('id', householdId)
          .single();

        if (error) {
          setError(error.message || 'Failed to load household');
        } else {
          setHousehold(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHousehold();
  }, [householdId]);

  return { household, loading, error };
}

function useHouseholdMembers(householdId: string | null) {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      if (!householdId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();

        await supabase
          .from('profiles')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: true })
          .then(({ data, error }) => {
            if (error) {
              setError(error.message || 'Failed to load members');
            } else {
              setMembers(data || []);
            }
          });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [householdId]);

  return { members, loading, error };
}

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const cardVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  hover: { y: -4, transition: { duration: 0.2 } },
};

const memberVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function HouseholdPage() {
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useProfile();
  const {
    household,
    loading: householdLoading,
    error: householdError,
  } = useHousehold(profile?.household_id || null);
  const {
    members,
    loading: membersLoading,
    error: membersError,
  } = useHouseholdMembers(profile?.household_id || null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loading = profileLoading || householdLoading || membersLoading;
  const error = profileError || householdError || membersError;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleInviteMember = async () => {
    // TODO: Implement invite functionality
    console.log('Inviting member:', {
      email: inviteEmail,
      message: inviteMessage,
    });
    setInviteEmail('');
    setInviteMessage('');
    setIsInviteOpen(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    // TODO: Implement remove member functionality
    console.log('Removing member:', memberId);
  };

  const copyInviteCode = () => {
    if (household?.invite_code) {
      navigator.clipboard.writeText(household.invite_code);
      // TODO: Show toast notification
    }
  };

  if (loading) {
    return (
      <motion.div
        className="min-h-screen bg-background flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <motion.div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Loading household...
          </motion.p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-screen bg-background flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="text-center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </motion.div>
      </motion.div>
    );
  }

  if (!profile?.household_id) {
    return (
      <motion.div
        className="min-h-screen bg-background flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold mb-4">No Household Found</h2>
          <p className="text-muted-foreground mb-6">
            You're not part of any household yet.
          </p>
          <Button>Create or Join Household</Button>
        </motion.div>
      </motion.div>
    );
  }

  const currentUser = members.find((m) => m.id === profile.id);

  return (
    <motion.div
      className="min-h-screen bg-background"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.5 }}
    >
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold">Flatastic</span>
              <span className="ml-2 sm:ml-4 text-muted-foreground">/</span>
              <span className="ml-2 sm:ml-4 font-medium truncate">
                Household
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile menu button */}
              <div className="sm:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Desktop invite button */}
              <div className="hidden sm:block">
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                  <DialogTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="hidden md:inline">Invite Member</span>
                        <span className="md:hidden">Invite</span>
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="mx-4 sm:mx-0">
                    <DialogHeader>
                      <DialogTitle>Invite New Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation to join your household
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">
                          Personal Message (Optional)
                        </Label>
                        <Textarea
                          id="message"
                          value={inviteMessage}
                          onChange={(e) => setInviteMessage(e.target.value)}
                          placeholder="Add a personal message..."
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="text-sm font-medium">
                          Or share this invite code:
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            value={household?.invite_code || ''}
                            readOnly
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyInviteCode}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsInviteOpen(false)}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleInviteMember}
                        className="w-full sm:w-auto"
                      >
                        Send Invitation
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                className="sm:hidden border-t bg-card"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4">
                  <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="mx-4 sm:mx-0">
                      <DialogHeader>
                        <DialogTitle>Invite New Member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to join your household
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="mobile-email">Email Address</Label>
                          <Input
                            id="mobile-email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Enter email address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="mobile-message">
                            Personal Message (Optional)
                          </Label>
                          <Textarea
                            id="mobile-message"
                            value={inviteMessage}
                            onChange={(e) => setInviteMessage(e.target.value)}
                            placeholder="Add a personal message..."
                            className="min-h-[80px]"
                          />
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <Label className="text-sm font-medium">
                            Or share this invite code:
                          </Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              value={household?.invite_code || ''}
                              readOnly
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={copyInviteCode}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="flex-col gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsInviteOpen(false)}
                          className="w-full"
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleInviteMember} className="w-full">
                          Send Invitation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Household Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your household members and settings
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <motion.div
            className="lg:col-span-2 space-y-4 sm:space-y-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Household Info */}
            <motion.div variants={cardVariants} whileHover="hover">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                      Household Information
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Basic information about your household
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Name
                    </Label>
                    <p className="text-base sm:text-lg font-semibold">
                      {household?.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Created
                    </Label>
                    <p className="text-sm sm:text-base">
                      {formatDate(household?.created_at || '')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Members List */}
            <motion.div variants={cardVariants} whileHover="hover">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    Household Members ({members.length})
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Manage who has access to your household
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div
                    className="space-y-3 sm:space-y-4"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    <AnimatePresence>
                      {members.map((member, index) => (
                        <motion.div
                          key={member.id}
                          variants={memberVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ delay: index * 0.05 }}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0"
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                              <AvatarImage
                                src={member.avatar_url || '/placeholder.svg'}
                              />
                              <AvatarFallback>
                                {getInitials(member.full_name || member.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm sm:text-base truncate">
                                  {member.full_name}
                                </h3>
                                {member.id === profile.id && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {member.email}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span className="whitespace-nowrap">
                                    Joined {formatDate(member.created_at || '')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end sm:justify-start">
                            {member.id !== profile.id &&
                              member.id === household?.admin_id && (
                                <>
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button variant="outline" size="sm">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </motion.div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700 bg-transparent"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </motion.div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="mx-4 sm:mx-0">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Remove Member
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to remove{' '}
                                          {member.full_name} from the household?
                                          This action cannot be undone and they
                                          will lose access to all household
                                          data.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                        <AlertDialogCancel className="w-full sm:w-auto">
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                                          onClick={() =>
                                            handleRemoveMember(member.id)
                                          }
                                        >
                                          Remove Member
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            className="space-y-4 sm:space-y-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Quick Stats */}
            <motion.div variants={cardVariants} whileHover="hover">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm sm:text-base">
                      Total Members
                    </span>
                    <span className="font-semibold text-sm sm:text-base">
                      {members.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm sm:text-base">
                      Active Since
                    </span>
                    <span className="font-semibold text-sm sm:text-base">
                      {formatDate(household?.created_at || '')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Invite Code */}
            <motion.div variants={cardVariants} whileHover="hover">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">
                    Invite Code
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Share this code for quick invites
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={household?.invite_code || ''}
                        readOnly
                        className="text-xs sm:text-sm"
                      />
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyInviteCode}
                        >
                          Copy
                        </Button>
                      </motion.div>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent text-sm"
                      >
                        Generate New Code
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Household Settings */}
            <motion.div variants={cardVariants} whileHover="hover">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent text-sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Notification Settings
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent text-sm"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Privacy Settings
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:text-red-700 bg-transparent text-sm"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Leave Household
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
