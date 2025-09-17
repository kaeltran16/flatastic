import { ActiveStep, RotationAssignment, RotationSettings } from '@/components/chore-scheduler/types';
import { createChore } from '@/lib/actions/chore';
import { ChoreInsert, Profile } from '@/lib/supabase/schema.alias';
import { toISOEndOfDayInTZ } from '@/utils';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export const useChoreRotation = (profile: any, members: Profile[]) => {
  const [selectedChores, setSelectedChores] = useState<string[]>([]);
  const [unavailableUsers, setUnavailableUsers] = useState<string[]>([]);
  const [memberOrder, setMemberOrder] = useState<Profile[]>([]);
  const [rotationPreview, setRotationPreview] = useState<RotationAssignment[]>(
    []
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCreatingChores, setIsCreatingChores] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<ActiveStep>('select');

  const generateRotationAssignments = useCallback(
    (
      choresToRotate: any[],
      availableUsers: Profile[],
      rotationSettings: RotationSettings
    ): RotationAssignment[] => {
      const assignments: RotationAssignment[] = [];
      const startDate = rotationSettings.startDate;
      const intervalDays =
        rotationSettings.recurringType === 'daily'
          ? 1
          : rotationSettings.recurringType === 'weekly'
          ? 7
          : 30;

      for (let period = 0; period < 8; period++) {
        choresToRotate.forEach((chore, choreIndex) => {
          const userIndex = (choreIndex + period) % availableUsers.length;
          const assignedUser = availableUsers[userIndex];

          const assignmentDate = new Date(startDate);
          assignmentDate.setDate(
            new Date(startDate).getDate() + period * intervalDays
          );

          const dueDate = toISOEndOfDayInTZ(
            assignmentDate,
            profile?.timezone || 'Asia/Ho_Chi_Minh'
          );

          assignments.push({
            chore: chore,
            assignedUser: assignedUser,
            assignmentDate: assignmentDate.toISOString(),
            dueDate: dueDate,
            period: period + 1,
          });
        });
      }

      return assignments;
    },
    [profile?.timezone]
  );

  const generateRotationPreview = useCallback(
    (choresToRotate: any[], rotationSettings: RotationSettings) => {
      setIsGenerating(true);

      const availableUsers = memberOrder.filter(
        (user) => !unavailableUsers.includes(user.id)
      );

      if (availableUsers.length === 0) {
        toast.error('At least one user must be available for rotation');
        setIsGenerating(false);
        return;
      }

      if (choresToRotate.length === 0) {
        toast.error('Please select at least one chore for rotation');
        setIsGenerating(false);
        return;
      }

      const assignments = generateRotationAssignments(
        choresToRotate,
        availableUsers,
        rotationSettings
      );

      setRotationPreview(assignments);
      setIsGenerating(false);
      setActiveStep('preview');
    },
    [memberOrder, unavailableUsers, generateRotationAssignments]
  );

  const createRotationChores = useCallback(
    async (rotationSettings: RotationSettings): Promise<void> => {
      if (!profile?.household_id) {
        toast.error('No household found. Please join a household first.');
        return;
      }

      setIsCreatingChores(true);

      try {
        const createdChores = [];
        const choresToCreate = rotationPreview.filter(
          (assignment) => assignment.period <= members.length
        );

        for (const assignment of choresToCreate) {
          const choreData: ChoreInsert = {
            name: assignment.chore.name,
            description: assignment.chore.description,
            assigned_to: assignment.assignedUser.id,
            due_date: assignment.dueDate,
            recurring_type: rotationSettings.recurringType,
            recurring_interval: rotationSettings.recurringInterval,
            household_id: profile.household_id,
            created_by: profile.id,
            status: 'pending',
          };

          const newChore = await createChore(choreData);
          createdChores.push(newChore);
        }

        toast.success(
          `Successfully created ${createdChores.length} chores in rotation!`
        );

        // Reset state
        resetRotation();
      } catch (error: any) {
        console.error('Error creating chores:', error);
        toast.error(`Failed to create chores: ${error.message}`);
      } finally {
        setIsCreatingChores(false);
      }
    },
    [profile, rotationPreview, members.length]
  );

  const resetRotation = useCallback(() => {
    setSelectedChores([]);
    setRotationPreview([]);
    setUnavailableUsers([]);
    setActiveStep('select');
  }, []);

  const toggleChoreSelection = useCallback((choreId: string): void => {
    setSelectedChores((prev) =>
      prev.includes(choreId)
        ? prev.filter((id) => id !== choreId)
        : [...prev, choreId]
    );
  }, []);

  const toggleUserAvailability = useCallback((userId: string): void => {
    setUnavailableUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }, []);

  const shuffleMemberOrder = useCallback((): void => {
    const availableMembers = memberOrder.filter(
      (member) => !unavailableUsers.includes(member.id)
    );
    const shuffled = [...availableMembers].sort(() => Math.random() - 0.5);
    const unavailableMembers = memberOrder.filter((member) =>
      unavailableUsers.includes(member.id)
    );
    setMemberOrder([...shuffled, ...unavailableMembers]);
    toast.success('Member order shuffled!');
  }, [memberOrder, unavailableUsers]);

  const canProceed = useCallback((): boolean => {
    if (activeStep === 'select') return selectedChores.length > 0;
    if (activeStep === 'availability')
      return members.filter((u) => !unavailableUsers.includes(u.id)).length > 0;
    if (activeStep === 'settings') return true;
    return false;
  }, [activeStep, selectedChores.length, members, unavailableUsers]);

  const nextStep = useCallback((): void => {
    if (activeStep === 'select') setActiveStep('availability');
    else if (activeStep === 'availability') setActiveStep('settings');
    // generateRotationPreview should be called from component with choresToRotate
  }, [activeStep]);

  const prevStep = useCallback((): void => {
    if (activeStep === 'availability') setActiveStep('select');
    else if (activeStep === 'settings') setActiveStep('availability');
    else if (activeStep === 'preview') setActiveStep('settings');
  }, [activeStep]);

  return {
    // State
    selectedChores,
    unavailableUsers,
    memberOrder,
    rotationPreview,
    isGenerating,
    isCreatingChores,
    activeStep,

    // Setters
    setSelectedChores,
    setUnavailableUsers,
    setMemberOrder,
    setRotationPreview,
    setActiveStep,

    // Actions
    generateRotationPreview,
    createRotationChores,
    resetRotation,
    toggleChoreSelection,
    toggleUserAvailability,
    shuffleMemberOrder,

    // Navigation
    canProceed,
    nextStep,
    prevStep,
  };
};
