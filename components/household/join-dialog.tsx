// components/household/join-household-dialog.tsx
// Component for users to join a household using an invite code

'use client';

import { Button } from '@/components/ui/button';
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
import { joinHouseholdByCode } from '@/lib/actions/household';
import { UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface JoinHouseholdDialogProps {
  triggerText?: string;
  className?: string;
}

export function JoinHouseholdDialog({
  triggerText = 'Join Household',
  className = '',
}: JoinHouseholdDialogProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setIsLoading(true);
    try {
      await joinHouseholdByCode(inviteCode.trim());
      toast.success('Successfully joined household!');
      setInviteCode('');
      setIsOpen(false);
      router.refresh(); // Refresh to show the new household
    } catch (error) {
      console.error('Error joining household:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to join household'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to uppercase and limit to 8 characters
    const value = e.target.value.toUpperCase().slice(0, 8);
    setInviteCode(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={className}
        >
          <Button className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            {triggerText}
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="mx-3 sm:mx-0 w-[calc(100vw-24px)] sm:w-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Join a Household
            </DialogTitle>
            <DialogDescription className="text-sm">
              Enter the invite code provided by a household member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="inviteCode" className="text-sm">
                Invite Code
              </Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={handleCodeChange}
                placeholder="Enter 8-character code"
                className="mt-1 text-sm font-mono tracking-wider"
                maxLength={8}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Invite codes are 8 characters long (letters and numbers)
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto text-sm"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoinHousehold}
              className="w-full sm:w-auto text-sm"
              disabled={isLoading || !inviteCode.trim()}
            >
              {isLoading ? 'Joining...' : 'Join Household'}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
