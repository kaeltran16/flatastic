import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Profile } from '@/lib/supabase/schema.alias';
import { GripVertical, Shuffle, Users, UserX } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { itemVariants } from './constants';

export interface UserAvailabilityProps {
  members: Profile[];
  unavailableUsers: string[];
  memberOrder: Profile[];
  setMemberOrder: (order: Profile[]) => void;
  toggleUserAvailability: (userId: string) => void;
  shuffleMemberOrder: () => void;
}

export function UserAvailability({
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
      {/* Available Members with Availability Toggle and Drag-and-Drop */}
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
