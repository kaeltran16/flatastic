'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useProfile } from '@/hooks/use-profile';
import { updateChoreRotationOrder } from '@/lib/actions/household';
import { createClient } from '@/lib/supabase/client';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function RotationSettings() {
  const { profile } = useProfile();
  const { members, loading } = useHouseholdMembers(profile?.household_id);
  const [orderedMembers, setOrderedMembers] = useState<typeof members>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!profile?.household_id || !members.length) return;

      const supabase = createClient();
      const { data: household } = await supabase
        .from('households')
        .select('chore_rotation_order')
        .eq('id', profile.household_id)
        .single();

      if (household?.chore_rotation_order && Array.isArray(household.chore_rotation_order)) {
        const orderMap = new Map(
          household.chore_rotation_order.map((id: string, index: number) => [id, index])
        );

        const sorted = [...members].sort((a, b) => {
          const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
          const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
          
          if (indexA !== indexB) return indexA - indexB;
          return 0;
        });
        setOrderedMembers(sorted);
      } else {
        setOrderedMembers(members);
      }
    };

    fetchOrder();
  }, [profile?.household_id, members]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedMembers];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setOrderedMembers(newOrder);
  };

  const handleSave = async () => {
    if (!profile?.household_id) return;

    setIsSaving(true);
    const orderIds = orderedMembers.map(m => m.id);
    
    try {
      const result = await updateChoreRotationOrder(profile.household_id, orderIds);
      if (result.success) {
        toast.success('Rotation order updated successfully');
      } else {
        toast.error(result.error || 'Failed to update order');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chore Rotation Sequence</CardTitle>
        <CardDescription>
          Define the order in which chores are assigned to household members.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {orderedMembers.map((member, index) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={() => moveItem(index, 'up')}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === orderedMembers.length - 1}
                    onClick={() => moveItem(index, 'down')}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <div className="font-medium">
                  {member.full_name || member.email}
                  {member.id === profile?.id && " (You)"}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Position: {index + 1}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
