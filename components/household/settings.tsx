'use client';

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Copy,
  Edit3,
  LogOut,
  RefreshCw,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const editNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less'),
});

type EditNameData = z.infer<typeof editNameSchema>;

interface HouseholdSettingsProps {
  household: {
    id: string;
    name: string;
    admin_id: string;
    invite_code: string | null;
  };
  currentUserId: string;
  memberCount: number;
  onUpdateName: (name: string) => Promise<void>;
  onRegenerateCode: () => Promise<string>;
  onLeaveHousehold: () => Promise<void>;
}

export function HouseholdSettings({
  household,
  currentUserId,
  memberCount,
  onUpdateName,
  onRegenerateCode,
  onLeaveHousehold,
}: HouseholdSettingsProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState(
    household?.invite_code || ''
  );

  const isAdmin = currentUserId === household.admin_id;

  const form = useForm<EditNameData>({
    resolver: zodResolver(editNameSchema),
    defaultValues: {
      name: household.name,
    },
  });

  const copyInviteCode = () => {
    if (currentInviteCode) {
      navigator.clipboard.writeText(currentInviteCode);
      toast.success('Invite code copied to clipboard!');
    }
  };

  const handleUpdateName = async (data: EditNameData) => {
    try {
      await onUpdateName(data.name);
      setIsEditingName(false);
      toast.success('Household name updated successfully!');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update name'
      );
    }
  };

  const handleRegenerateCode = async () => {
    setIsRegenerating(true);
    try {
      const newCode = await onRegenerateCode();
      setCurrentInviteCode(newCode);
      toast.success('New invite code generated!');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to regenerate code'
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleLeaveHousehold = async () => {
    setIsLeaving(true);
    try {
      await onLeaveHousehold();
      toast.success('Left household successfully');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to leave household'
      );
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Household Settings
        </CardTitle>
        <CardDescription>
          Manage your household preferences and settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Household Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Household Name</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-muted rounded-md">
              {household.name}
            </div>
            {isAdmin && (
              <Dialog open={isEditingName} onOpenChange={setIsEditingName}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Household Name</DialogTitle>
                    <DialogDescription>
                      Update your household name. This will be visible to all
                      members.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleUpdateName)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Household Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter household name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditingName(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Save Changes</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Member Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Members</Label>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
            <Users className="w-4 h-4" />
            <span>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Invite Code */}
        {isAdmin && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Invite Code</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-md font-mono">
                {currentInviteCode || 'No invite code'}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyInviteCode}
                disabled={!currentInviteCode}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRegenerateCode}
                disabled={isRegenerating}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this code with others to invite them to your household
            </p>
          </div>
        )}

        {/* Admin Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Role</Label>
          <div className="px-3 py-2 bg-muted rounded-md">
            {isAdmin ? 'Administrator' : 'Member'}
          </div>
        </div>

        {/* Leave Household */}
        <div className="pt-4 border-t">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Leave Household
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  Leave Household
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to leave this household?
                  {isAdmin && memberCount > 1 && (
                    <span className="block mt-2 text-destructive">
                      You are the admin and there are other members. You cannot
                      leave until you transfer admin rights or all other members
                      leave.
                    </span>
                  )}
                  {isAdmin && memberCount === 1 && (
                    <span className="block mt-2 text-destructive">
                      As the only member and admin, leaving will permanently
                      delete this household.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={handleLeaveHousehold}
                  disabled={isLeaving || (isAdmin && memberCount > 1)}
                >
                  {isLeaving ? 'Leaving...' : 'Leave Household'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
