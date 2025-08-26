'use client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { LoadingSpinner } from '@/components/household/loading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useHouseholdMembers, useProfile } from '@/hooks/use-supabase-data';
import { addChore } from '@/lib/actions/chore';
import { createChoreTemplate } from '@/lib/actions/chore-template';
import { createClient } from '@/lib/supabase/client';
import {
  ChoreInsert,
  ChoreTemplate,
  Profile,
} from '@/lib/supabase/schema.alias';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertCircle,
  CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
  Users,
  UserX,
} from 'lucide-react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

const choreCardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  selected: {
    opacity: 1,
    transition: { duration: 0.1 },
  },
};

// Interfaces

interface RotationSettings {
  startDate: Date;
  recurringType: 'daily' | 'weekly' | 'monthly';
  recurringInterval: number;
}

interface RotationAssignment {
  chore: ChoreTemplate;
  assignedUser: Profile;
  assignmentDate: Date;
  dueDate: Date;
  period: number;
}

// Predefined chore templates

export default function ChoreRotationPage() {
  // Hooks for data fetching
  const { profile, loading: profileLoading } = useProfile();
  const queryClient = useQueryClient();
  const {
    members,
    loading: membersLoading,
    error: membersError,
  } = useHouseholdMembers(profile?.household_id || null);

  // Component state
  const [selectedChores, setSelectedChores] = useState<string[]>([]);
  const [customChores, setCustomChores] = useState<ChoreTemplate[]>([]);
  const [newCustomChore, setNewCustomChore] = useState({
    name: '',
    description: '',
  });

  const [rotationSettings, setRotationSettings] = useState<RotationSettings>({
    startDate: new Date(),
    recurringType: 'weekly',
    recurringInterval: 1,
  });
  const [unavailableUsers, setUnavailableUsers] = useState<string[]>([]);
  const [memberOrder, setMemberOrder] = useState<Profile[]>([]);
  const [rotationPreview, setRotationPreview] = useState<RotationAssignment[]>(
    []
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCreatingChores, setIsCreatingChores] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<
    'select' | 'availability' | 'settings' | 'preview'
  >('select');

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
  }, [members, memberOrder.length]);

  // Update member order when availability changes
  const updateMemberOrder = () => {
    const availableMembers = members.filter(
      (member) => !unavailableUsers.includes(member.id)
    );
    setMemberOrder(availableMembers);
  };

  // Add custom chore
  const addCustomChore = async () => {
    try {
      await createChoreTemplate({
        name: newCustomChore.name.trim(),
        description: newCustomChore.description.trim() || null,
      });

      // Manually refetch the query
      queryClient.invalidateQueries({
        queryKey: ['chore_templates', profile?.household_id],
      });
      toast.success('Template created!');
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  // Remove custom chore
  const removeCustomChore = (choreId: string): void => {
    setCustomChores(customChores.filter((chore) => chore.id !== choreId));
    setSelectedChores(selectedChores.filter((id) => id !== choreId));
  };

  // Toggle chore selection
  const toggleChoreSelection = (choreId: string): void => {
    setSelectedChores((prev) =>
      prev.includes(choreId)
        ? prev.filter((id) => id !== choreId)
        : [...prev, choreId]
    );
  };

  // Toggle user availability
  const toggleUserAvailability = (userId: string): void => {
    setUnavailableUsers((prev) => {
      const newUnavailable = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];

      return newUnavailable;
    });
  };

  // Shuffle member order
  const shuffleMemberOrder = (): void => {
    const shuffled = [...memberOrder].sort(() => Math.random() - 0.5);
    setMemberOrder(shuffled);
    toast.success('Member order shuffled!');
  };

  // Generate rotation preview
  const generateRotationPreview = (): void => {
    setIsGenerating(true);

    // Get available users in the specified order
    const availableUsers = memberOrder.filter(
      (user) => !unavailableUsers.includes(user.id)
    );

    if (availableUsers.length === 0) {
      toast.error('At least one user must be available for rotation');
      setIsGenerating(false);
      return;
    }

    // Get all selected chores (templates + custom)
    const allChores = [...choreTemplates, ...customChores];
    const choresToRotate = allChores.filter((chore) =>
      selectedChores.includes(chore.id)
    );

    if (choresToRotate.length === 0) {
      toast.error('Please select at least one chore for rotation');
      setIsGenerating(false);
      return;
    }

    // Generate rotation assignments using the custom order
    const assignments: RotationAssignment[] = [];
    const startDate = new Date(rotationSettings.startDate);
    const intervalDays =
      rotationSettings.recurringType === 'daily'
        ? 1
        : rotationSettings.recurringType === 'weekly'
        ? 7
        : 30;

    for (let period = 0; period < 8; period++) {
      // Generate 8 periods
      choresToRotate.forEach((chore, choreIndex) => {
        // Round-robin assignment using the custom order
        const userIndex = (choreIndex + period) % availableUsers.length;
        const assignedUser = availableUsers[userIndex];

        const assignmentDate = new Date(startDate);
        assignmentDate.setDate(startDate.getDate() + period * intervalDays);

        const dueDate = new Date(assignmentDate);
        dueDate.setDate(assignmentDate.getDate() + (intervalDays - 1));

        assignments.push({
          chore: chore,
          assignedUser: assignedUser,
          assignmentDate: assignmentDate,
          dueDate: dueDate,
          period: period + 1,
        });
      });
    }

    setRotationPreview(assignments);
    setIsGenerating(false);
    setActiveStep('preview');
    setShowPreview(true);
  };

  // Create all chores in rotation
  const createRotationChores = async (): Promise<void> => {
    if (!profile?.household_id) {
      toast.error('No household found. Please join a household first.');
      return;
    }

    setIsCreatingChores(true);

    try {
      const createdChores = [];

      // Create chores for the first 4 periods only (to avoid overwhelming)
      const choresToCreate = rotationPreview.filter(
        (assignment) => assignment.period <= members.length
      );

      for (const assignment of choresToCreate) {
        const choreData: ChoreInsert = {
          name: assignment.chore.name,
          description: assignment.chore.description || null,
          assigned_to: assignment.assignedUser.id,
          due_date: assignment.dueDate.toISOString().split('T')[0],
          recurring_type: rotationSettings.recurringType,
          recurring_interval: rotationSettings.recurringInterval,
          household_id: profile.household_id,
          created_by: profile.id,
          status: 'pending',
        };

        const newChore = await addChore(choreData);
        createdChores.push(newChore);
      }

      toast.success(
        `Successfully created ${createdChores.length} chores in rotation!`
      );

      // Reset form
      setSelectedChores([]);
      setRotationPreview([]);
      setUnavailableUsers([]);
      setActiveStep('select');
      setShowPreview(false);
    } catch (error: any) {
      console.error('Error creating chores:', error);
      toast.error(`Failed to create chores: ${error.message}`);
    } finally {
      setIsCreatingChores(false);
    }
  };

  // Mobile step navigation
  const nextStep = (): void => {
    if (activeStep === 'select') setActiveStep('availability');
    else if (activeStep === 'availability') setActiveStep('settings');
    else if (activeStep === 'settings') generateRotationPreview();
  };

  const prevStep = (): void => {
    if (activeStep === 'availability') setActiveStep('select');
    else if (activeStep === 'settings') setActiveStep('availability');
    else if (activeStep === 'preview') setActiveStep('settings');
  };

  const canProceed = (): boolean => {
    if (activeStep === 'select') return selectedChores.length > 0;
    if (activeStep === 'availability')
      return members.filter((u) => !unavailableUsers.includes(u.id)).length > 0;
    if (activeStep === 'settings') return true;
    return false;
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
            Error loading household members: {membersError}
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

      {/* Mobile Step Indicator */}
      <motion.div
        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg lg:hidden"
        variants={itemVariants}
      >
        <div className="flex items-center gap-2">
          {['select', 'availability', 'settings', 'preview'].map(
            (step, index) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${
                  activeStep === step ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            )
          )}
        </div>
        <div className="text-sm font-medium capitalize">
          {activeStep === 'select' && 'Select Chores'}
          {activeStep === 'availability' && 'Member Availability & Order'}
          {activeStep === 'settings' && 'Settings'}
          {activeStep === 'preview' && 'Preview'}
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
                <ChoreSelectionContent
                  choreTemplates={choreTemplates}
                  customChores={customChores}
                  selectedChores={selectedChores}
                  newCustomChore={newCustomChore}
                  setNewCustomChore={setNewCustomChore}
                  toggleChoreSelection={toggleChoreSelection}
                  addCustomChore={addCustomChore}
                  removeCustomChore={removeCustomChore}
                />
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
                <UserAvailabilityContent
                  members={members}
                  unavailableUsers={unavailableUsers}
                  memberOrder={memberOrder}
                  setMemberOrder={setMemberOrder}
                  toggleUserAvailability={toggleUserAvailability}
                  shuffleMemberOrder={shuffleMemberOrder}
                />
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
                <RotationSettingsContent
                  rotationSettings={rotationSettings}
                  setRotationSettings={setRotationSettings}
                  showDatePicker={showDatePicker}
                  setShowDatePicker={setShowDatePicker}
                />
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
                    onClick={generateRotationPreview}
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
                <RotationPreviewContent
                  rotationPreview={rotationPreview}
                  isCreatingChores={isCreatingChores}
                  createRotationChores={createRotationChores}
                  rotationLength={members.length}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <AnimatePresence mode="wait">
          {activeStep === 'select' && (
            <motion.div
              key="select"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Select Chores
                  </CardTitle>
                  <CardDescription>
                    Choose which chores to include
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <ChoreSelectionContent
                    choreTemplates={choreTemplates}
                    customChores={customChores}
                    selectedChores={selectedChores}
                    newCustomChore={newCustomChore}
                    setNewCustomChore={setNewCustomChore}
                    toggleChoreSelection={toggleChoreSelection}
                    addCustomChore={addCustomChore}
                    removeCustomChore={removeCustomChore}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeStep === 'availability' && (
            <motion.div
              key="availability"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Member Availability & Order
                  </CardTitle>
                  <CardDescription>
                    Select and arrange member order
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <UserAvailabilityContent
                    members={members}
                    unavailableUsers={unavailableUsers}
                    memberOrder={memberOrder}
                    setMemberOrder={setMemberOrder}
                    toggleUserAvailability={toggleUserAvailability}
                    shuffleMemberOrder={shuffleMemberOrder}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeStep === 'settings' && (
            <motion.div
              key="settings"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Rotation Settings
                  </CardTitle>
                  <CardDescription>Configure rotation timing</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <RotationSettingsContent
                    rotationSettings={rotationSettings}
                    setRotationSettings={setRotationSettings}
                    showDatePicker={showDatePicker}
                    setShowDatePicker={setShowDatePicker}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Navigation */}
        <motion.div
          className="flex items-center justify-between gap-3 mt-6"
          variants={itemVariants}
        >
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={activeStep === 'select'}
            className="flex-1"
          >
            Back
          </Button>

          {activeStep !== 'preview' ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex-1"
            >
              {activeStep === 'settings' ? 'Generate Preview' : 'Next'}
            </Button>
          ) : (
            <Sheet open={showPreview} onOpenChange={setShowPreview}>
              <SheetTrigger asChild>
                <Button className="flex-1">
                  <Eye className="w-4 h-4 mr-2" />
                  View Preview
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Rotation Preview</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <RotationPreviewContent
                    rotationPreview={rotationPreview}
                    isCreatingChores={isCreatingChores}
                    createRotationChores={createRotationChores}
                    rotationLength={members.length}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// Component for chore selection content
interface ChoreSelectionProps {
  choreTemplates: ChoreTemplate[];
  customChores: ChoreTemplate[];
  selectedChores: string[];
  newCustomChore: { name: string; description: string };
  setNewCustomChore: React.Dispatch<
    React.SetStateAction<{ name: string; description: string }>
  >;
  toggleChoreSelection: (choreId: string) => void;
  addCustomChore: () => void;
  removeCustomChore: (choreId: string) => void;
}

function ChoreSelectionContent({
  choreTemplates,
  customChores,
  selectedChores,
  newCustomChore,
  setNewCustomChore,
  toggleChoreSelection,
  addCustomChore,
  removeCustomChore,
}: ChoreSelectionProps) {
  const [isCustomChoresOpen, setIsCustomChoresOpen] = useState<boolean>(false);

  return (
    <div className="space-y-2">
      {/* Predefined Chores */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Available Chores
        </Label>
        <ScrollArea className="h-40 pr-2 ">
          <div className="space-y-2">
            {choreTemplates.map((chore) => (
              <motion.div
                key={chore.id}
                variants={choreCardVariants}
                initial="hidden"
                animate={
                  selectedChores.includes(chore.id) ? 'selected' : 'visible'
                }
                whileTap={{ scale: 0.98 }}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedChores.includes(chore.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleChoreSelection(chore.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{chore.name}</h4>
                    {chore.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {chore.description}
                      </p>
                    )}
                  </div>
                  {selectedChores.includes(chore.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex-shrink-0 ml-2"
                    >
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Custom Chores - Collapsible */}
      <Collapsible
        open={isCustomChoresOpen}
        onOpenChange={setIsCustomChoresOpen}
        className="mt-8"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto font-medium text-sm"
          >
            <span>
              Custom Chores{' '}
              {customChores.length > 0 && `(${customChores.length})`}
            </span>
            {isCustomChoresOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 mt-3">
          {/* Add Custom Chore Form */}
          <motion.div
            className="space-y-2 p-3 border rounded-lg bg-gray-50"
            variants={itemVariants}
          >
            <Input
              placeholder="Chore name"
              value={newCustomChore.name}
              onChange={(e) =>
                setNewCustomChore((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
            <Textarea
              placeholder="Description (optional)"
              value={newCustomChore.description}
              onChange={(e) =>
                setNewCustomChore((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
            />
            <Button
              onClick={addCustomChore}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!newCustomChore.name.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Chore
            </Button>
          </motion.div>

          {/* Custom Chores List */}
          <AnimatePresence>
            {customChores.length > 0 && (
              <div className="space-y-2">
                {customChores.map((chore) => (
                  <motion.div
                    key={chore.id}
                    variants={choreCardVariants}
                    initial="hidden"
                    animate={
                      selectedChores.includes(chore.id) ? 'selected' : 'visible'
                    }
                    exit="hidden"
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedChores.includes(chore.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleChoreSelection(chore.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{chore.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            Custom
                          </Badge>
                        </div>
                        {chore.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {chore.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {selectedChores.includes(chore.id) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                          </motion.div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomChore(chore.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Component for user availability content
interface UserAvailabilityProps {
  members: Profile[];
  unavailableUsers: string[];
  memberOrder: Profile[];
  setMemberOrder: (order: Profile[]) => void;
  toggleUserAvailability: (userId: string) => void;
  shuffleMemberOrder: () => void;
}

function UserAvailabilityContent({
  members,
  unavailableUsers,
  memberOrder,
  setMemberOrder,
  toggleUserAvailability,
  shuffleMemberOrder,
}: UserAvailabilityProps) {
  const availableMembers = memberOrder.filter(
    (member) => !unavailableUsers.includes(member.id)
  );

  return (
    <div className="space-y-4">
      {/* All Members with Availability Toggle and Drag-and-Drop */}
      <div className="space-y-3">
        {availableMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Select available members to arrange rotation order
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">
                Available Members ({availableMembers.length})
              </Label>
              <Button
                onClick={shuffleMemberOrder}
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={availableMembers.length < 2}
              >
                <Shuffle className="w-3 h-3 mr-1" />
                Shuffle
              </Button>
            </div>

            <div className="text-xs text-muted-foreground mb-3">
              Toggle availability and drag to reorder. First member gets first
              chore assignment.
            </div>

            <Reorder.Group
              axis="y"
              values={availableMembers}
              onReorder={(newOrder) => {
                // Preserve unavailable members at their original positions
                const unavailableMembers = memberOrder.filter((member) =>
                  unavailableUsers.includes(member.id)
                );
                setMemberOrder([...newOrder, ...unavailableMembers]);
              }}
              className="space-y-2"
            >
              {availableMembers.map((member, index) => (
                <Reorder.Item
                  key={member.id}
                  value={member}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                >
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                  <Badge variant="outline" className="text-xs">
                    {index + 1}
                  </Badge>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {member.full_name || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={!unavailableUsers.includes(member.id)}
                    onCheckedChange={() => toggleUserAvailability(member.id)}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </>
        )}
      </div>

      {/* Unavailable Members */}
      {unavailableUsers.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">
              Unavailable Members ({unavailableUsers.length})
            </Label>
            <div className="space-y-2">
              {members
                .filter((member) => unavailableUsers.includes(member.id))
                .map((member) => (
                  <motion.div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 opacity-60"
                    variants={itemVariants}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <UserX className="w-4 h-4 text-red-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.full_name || 'Unnamed User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={false}
                      onCheckedChange={() => toggleUserAvailability(member.id)}
                    />
                  </motion.div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Component for rotation settings content
interface RotationSettingsProps {
  rotationSettings: RotationSettings;
  setRotationSettings: (settings: RotationSettings) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
}

function RotationSettingsContent({
  rotationSettings,
  setRotationSettings,
  showDatePicker,
  setShowDatePicker,
}: RotationSettingsProps) {
  return (
    <div className="space-y-4">
      <motion.div variants={itemVariants}>
        <Label>Start Date</Label>
        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left mt-1"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(rotationSettings.startDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={rotationSettings.startDate}
              onSelect={(date) => {
                if (date) {
                  setRotationSettings({ ...rotationSettings, startDate: date });
                  setShowDatePicker(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Label>Rotation Frequency</Label>
        <Select
          value={rotationSettings.recurringType}
          onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
            setRotationSettings({ ...rotationSettings, recurringType: value })
          }
        >
          <SelectTrigger className="mt-1 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Label>Interval</Label>
        <Select
          value={rotationSettings.recurringInterval.toString()}
          onValueChange={(value) =>
            setRotationSettings({
              ...rotationSettings,
              recurringInterval: parseInt(value),
            })
          }
        >
          <SelectTrigger className="mt-1 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">
              Every 1 {rotationSettings.recurringType.slice(0, -2)}
            </SelectItem>
            <SelectItem value="2">
              Every 2 {rotationSettings.recurringType}
            </SelectItem>
            <SelectItem value="3">
              Every 3 {rotationSettings.recurringType}
            </SelectItem>
            <SelectItem value="4">
              Every 4 {rotationSettings.recurringType}
            </SelectItem>
          </SelectContent>
        </Select>
      </motion.div>
    </div>
  );
}

// Component for rotation preview content
interface RotationPreviewProps {
  rotationPreview: RotationAssignment[];
  isCreatingChores: boolean;
  createRotationChores: () => void;
  rotationLength: number;
}

function RotationPreviewContent({
  rotationPreview,
  isCreatingChores,
  createRotationChores,
  rotationLength,
}: RotationPreviewProps) {
  if (rotationPreview.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">
          Configure settings and generate preview to see the rotation
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <ScrollArea className="h-96 pr-2">
        {/* Group assignments by period */}
        {Array.from(new Set(rotationPreview.map((a) => a.period)))
          .slice(0, rotationLength)
          .map((period) => (
            <motion.div
              key={period}
              className="border rounded-lg p-4 mb-4"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <h4 className="font-semibold mb-3 flex items-center gap-2 flex-wrap">
                <Badge variant="outline">Period {period}</Badge>
                <span className="text-sm text-muted-foreground">
                  {format(
                    rotationPreview.find((a) => a.period === period)
                      ?.assignmentDate || new Date(),
                    'MMM d'
                  )}{' '}
                  -{' '}
                  {format(
                    rotationPreview.find((a) => a.period === period)?.dueDate ||
                      new Date(),
                    'MMM d'
                  )}
                </span>
              </h4>
              <div className="space-y-2">
                {rotationPreview
                  .filter((assignment) => assignment.period === period)
                  .map((assignment, idx) => (
                    <motion.div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-gray-50 rounded gap-2"
                      variants={itemVariants}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {assignment.chore.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Due: {format(assignment.dueDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs w-fit">
                        {assignment.assignedUser.full_name ||
                          assignment.assignedUser.email}
                      </Badge>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          ))}
      </ScrollArea>

      <motion.div className="pt-4 border-t" variants={itemVariants}>
        <Button
          onClick={createRotationChores}
          disabled={isCreatingChores}
          className="w-full"
          size="lg"
        >
          {isCreatingChores ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Chores...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Create Rotation Chores (First {rotationLength} Periods)
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          This will create{' '}
          {rotationPreview.filter((a) => a.period <= rotationLength).length}{' '}
          chores
        </p>
      </motion.div>
    </div>
  );
}
