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
import { Textarea } from '@/components/ui/textarea';
import { Household } from '@/lib/supabase/schema.alias';
import { HouseholdInviteData } from '@/lib/supabase/types';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { buttonHover, fadeInUp } from './animations';

interface InviteMemberDialogProps {
  household: Household | null;
  onInvite: (data: HouseholdInviteData) => Promise<void>;
}

export function InviteMemberDialog({
  household,
  onInvite,
}: InviteMemberDialogProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const handleInviteMember = async () => {
    await onInvite({ email: inviteEmail, message: inviteMessage });
    setInviteEmail('');
    setInviteMessage('');
    setIsInviteOpen(false);
  };

  const copyInviteCode = () => {
    if (household?.invite_code) {
      navigator.clipboard.writeText(household.invite_code);
      // TODO: Show toast notification
    }
  };

  return (
    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
      <DialogTrigger asChild>
        <motion.div
          variants={buttonHover}
          whileHover="hover"
          whileTap="tap"
          className="flex items-center"
        >
          <Button className="text-sm sm:text-base py-2 px-3 sm:py-2 sm:px-4">
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span>Invite Member</span>
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
              Invite New Member
            </DialogTitle>
            <DialogDescription className="text-sm">
              Send an invitation to join your household
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <motion.div variants={fadeInUp} initial="initial" animate="animate">
              <Label htmlFor="email" className="text-sm">
                Email Address
              </Label>
              <Input
                id="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="mt-1 text-sm"
              />
            </motion.div>
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="message" className="text-sm">
                Personal Message (Optional)
              </Label>
              <Textarea
                id="message"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message..."
                className="min-h-[60px] sm:min-h-[80px] mt-1 text-sm resize-none"
              />
            </motion.div>
            <motion.div
              className="p-3 sm:p-4 bg-muted rounded-lg"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.2 }}
            >
              <Label className="text-xs sm:text-sm font-medium">
                Or share this invite code:
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={household?.invite_code || ''}
                  readOnly
                  className="text-xs sm:text-sm"
                />
                <motion.div
                  variants={buttonHover}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyInviteCode}
                    className="text-xs whitespace-nowrap"
                  >
                    Copy
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-6">
            <motion.div
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
              className="w-full sm:w-auto"
            >
              <Button
                onClick={handleInviteMember}
                className="w-full sm:w-auto text-sm"
              >
                Send Invitation
              </Button>
            </motion.div>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
