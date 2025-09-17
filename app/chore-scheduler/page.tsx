'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// UI Components
import { LoadingSpinner } from '@/components/household/loading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  Users,
} from 'lucide-react';

// Hooks and Utils
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useProfile } from '@/hooks/use-profile';
import { createChoreTemplate } from '@/lib/actions/chore-template';
import { createClient } from '@/lib/supabase/client';
import { ChoreTemplate } from '@/lib/supabase/schema.alias';

// Local Components and Types
import {
  ChoreSelector,
  MobileStepNavigation,
  RotationPreview,
  UserAvailability,
} from '@/components/chore-scheduler';
import {
  containerVariants,
  itemVariants,
} from '@/components/chore-scheduler/constants';
import RotationSettingsComponent from '@/components/chore-scheduler/rotation-settings';
import {
  NewCustomChore,
  RotationSettings,
} from '@/components/chore-scheduler/types';
import { useChoreRotation } from '@/hooks/use-chore-rotation';

export default function ChoreSchedulerPage() {
  // Hooks for data fetching
  const { profile, loading: profileLoading } = useProfile();
  const queryClient = useQueryClient();
  const {
    members,
    loading: membersLoading,
    error: membersError,
  } = useHouseholdMembers(profile?.household_id || null);

  // Component state
  const [customChores, setCustomChores] = useState<ChoreTemplate[]>([]);
  const [newCustomChore, setNewCustomChore] = useState<NewCustomChore>({
    name: '',
    description: '',
  });

  const [rotationSettings, setRotationSettings] = useState<RotationSettings>({
    startDate: new Date().toISOString(),
    recurringType: 'weekly',
    recurringInterval: 1,
  });
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Use custom hook for rotation logic
  const {
    selectedChores,
    unavailableUsers,
    memberOrder,
    rotationPreview,
    isGenerating,
    isCreatingChores,
    activeStep,
    setMemberOrder,
    generateRotationPreview,
    createRotationChores,
    toggleChoreSelection,
    toggleUserAvailability,
    shuffleMemberOrder,
    canProceed,
    nextStep,
    prevStep,
    setActiveStep,
  } = useChoreRotation(profile, members);

  // Fetch chore templates
  const {
    data: choreTemplates = [],
    isLoading: choreTemplatesLoading,
    error: choreTemplatesError,
  } = useQuery<ChoreTemplate[]>({
    queryKey: ['chore_templates', profile?.household_id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('chore_templates')
        .select('*')
        .eq('is_active', true)
        .or(
          `household_id.is.null,household_id.eq.${profile?.household_id || ''}`
        )
        .order('is_custom', { ascending: true })
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.household_id,
  });

  const isLoading = profileLoading || membersLoading || choreTemplatesLoading;

  // Initialize member order when members load
  useEffect(() => {
    if (members.length > 0 && memberOrder.length === 0) {
      setMemberOrder(members);
    }
  }, [members, memberOrder.length, setMemberOrder]);

  // Handler functions
  const addCustomChore = async () => {
    try {
      await createChoreTemplate({
        name: newCustomChore.name.trim(),
        description: newCustomChore.description.trim() || null,
      });

      queryClient.invalidateQueries({
        queryKey: ['chore_templates', profile?.household_id],
      });
      toast.success('Template created!');
      setNewCustomChore({ name: '', description: '' });
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const removeCustomChore = (choreId: string): void => {
    setCustomChores(customChores.filter((chore) => chore.id !== choreId));
  };

  const handleGeneratePreview = () => {
    const allChores = [...choreTemplates, ...customChores];
    const choresToRotate = allChores.filter((chore) =>
      selectedChores.includes(chore.id)
    );

    generateRotationPreview(choresToRotate, rotationSettings);
    setShowPreview(true);
  };

  const handleCreateChores = async () => {
    await createRotationChores(rotationSettings);
    setShowPreview(false);
  };

  const handleNextStep = () => {
    if (activeStep === 'settings') {
      handleGeneratePreview();
    } else {
      nextStep();
    }
  };

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (membersError) {
    return (
      <motion.div
        className="container mx-auto p-4 max-w-4xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading household members: {membersError.message}
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  // Show no household state
  if (!profile?.household_id || members.length === 0) {
    return (
      <motion.div
        className="container mx-auto p-4 max-w-4xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be part of a household with other members to create
            chore rotations.
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  // Props for child components
  const choreSelectionProps = {
    choreTemplates,
    customChores,
    selectedChores,
    newCustomChore,
    setNewCustomChore,
    toggleChoreSelection,
    addCustomChore,
    removeCustomChore,
  };

  const userAvailabilityProps = {
    members,
    unavailableUsers,
    memberOrder,
    setMemberOrder,
    toggleUserAvailability,
    shuffleMemberOrder,
  };

  const rotationSettingsProps = {
    rotationSettings,
    setRotationSettings,
    timezone: profile?.timezone || 'Asia/Ho_Chi_Minh',
  };

  const rotationPreviewProps = {
    rotationPreview,
    isCreatingChores,
    createRotationChores: handleCreateChores,
    rotationLength: members.length,
  };

  return (
    <motion.div
      className="container mx-auto p-4 max-w-4xl space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Chore Rotation</h1>
          <p className="text-muted-foreground text-sm">
            Create automatic chore assignments for your household
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {members.length} members
        </div>
      </motion.div>

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Chore Selection */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  Select Chores
                </CardTitle>
                <CardDescription className="text-sm">
                  Choose which chores to include in the rotation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ChoreSelector {...choreSelectionProps} />
              </CardContent>
            </Card>
          </motion.div>

          {/* User Availability & Order */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Member Availability & Order
                </CardTitle>
                <CardDescription className="text-sm">
                  Select members and arrange their rotation order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserAvailability {...userAvailabilityProps} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Rotation Settings */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5" />
                  Rotation Settings
                </CardTitle>
                <CardDescription className="text-sm">
                  Configure when and how often chores rotate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RotationSettingsComponent {...rotationSettingsProps} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Preview */}
        <div>
          <motion.div variants={itemVariants}>
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-lg">
                    <RotateCcw className="w-5 h-5" />
                    Rotation Preview
                  </span>
                  <Button
                    onClick={handleGeneratePreview}
                    disabled={isGenerating || selectedChores.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    {isGenerating && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Generate
                  </Button>
                </CardTitle>
                <CardDescription className="text-sm">
                  Preview how chores will be assigned
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RotationPreview {...rotationPreviewProps} />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <MobileStepNavigation
          activeStep={activeStep}
          setActiveStep={setActiveStep}
          canProceed={canProceed}
          nextStep={handleNextStep}
          prevStep={prevStep}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          choreSelectionProps={choreSelectionProps}
          userAvailabilityProps={userAvailabilityProps}
          rotationSettingsProps={rotationSettingsProps}
          rotationPreviewProps={rotationPreviewProps}
        />
      </div>
    </motion.div>
  );
}
