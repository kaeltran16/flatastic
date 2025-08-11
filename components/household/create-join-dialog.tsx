'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const createHouseholdSchema = z.object({
  name: z
    .string()
    .min(1, 'Household name is required')
    .max(50, 'Name must be 50 characters or less'),
});

const joinHouseholdSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
});

type CreateHouseholdData = z.infer<typeof createHouseholdSchema>;
type JoinHouseholdData = z.infer<typeof joinHouseholdSchema>;

interface CreateJoinHouseholdDialogProps {
  onCreateHousehold: (data: CreateHouseholdData) => Promise<void>;
  onJoinHousehold: (data: JoinHouseholdData) => Promise<void>;
  children?: React.ReactNode;
}

export function CreateJoinHouseholdDialog({
  onCreateHousehold,
  onJoinHousehold,
  children,
}: CreateJoinHouseholdDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [isLoading, setIsLoading] = useState(false);

  const createForm = useForm<CreateHouseholdData>({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: {
      name: '',
    },
  });

  const joinForm = useForm<JoinHouseholdData>({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: {
      inviteCode: '',
    },
  });

  const handleCreateSubmit = async (data: CreateHouseholdData) => {
    setIsLoading(true);
    try {
      await onCreateHousehold(data);
      setOpen(false);
      createForm.reset();
    } catch (error) {
      console.error('Error creating household:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSubmit = async (data: JoinHouseholdData) => {
    setIsLoading(true);
    try {
      await onJoinHousehold(data);
      setOpen(false);
      joinForm.reset();
    } catch (error) {
      console.error('Error joining household:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Create or Join Household
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Get Started</DialogTitle>
          <DialogDescription>
            Create a new household or join an existing one using an invite code.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="join" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Join
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit(handleCreateSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Household Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter household name"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Household
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="join" className="space-y-4 mt-4">
            <Form {...joinForm}>
              <form
                onSubmit={joinForm.handleSubmit(handleJoinSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={joinForm.control}
                  name="inviteCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invite Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter invite code"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Join Household
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
