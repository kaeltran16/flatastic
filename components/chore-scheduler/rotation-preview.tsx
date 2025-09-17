import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { itemVariants } from './constants';
import { RotationAssignment } from './types';

export interface RotationPreviewProps {
  rotationPreview: RotationAssignment[];
  isCreatingChores: boolean;
  createRotationChores: () => void;
  rotationLength: number;
}

export function RotationPreview({
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
