import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, MoreVertical, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface ActionCardProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  className?: string;
  contentClassName?: string;
  showActions?: boolean;
  isLoading?: boolean;
  hoverAnimation?: boolean;
  index?: number;
}

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

export default function ActionCard({
  children,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  className = '',
  contentClassName = '',
  showActions = true,
  isLoading = false,
  hoverAnimation = true,
  index = 0,
}: ActionCardProps) {
  const hasActions = showActions && (onEdit || onDelete);

  const cardMotionProps = hoverAnimation
    ? {
        variants: cardVariants,
        initial: 'hidden',
        animate: 'visible',
        exit: 'exit',
        transition: { delay: index * 0.05 },
        whileHover: { y: -2, transition: { duration: 0.2 } },
      }
    : {};

  return (
    <motion.div {...cardMotionProps}>
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className={`relative ${contentClassName}`}>
          {/* Actions Menu */}
          {hasActions && (
            <div className="absolute top-3 right-3 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full hover:bg-white/60 dark:hover:bg-gray-800/60"
                    disabled={isLoading}
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={onEdit}
                      disabled={!canEdit || isLoading}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      {editLabel}
                    </DropdownMenuItem>
                  )}

                  {onEdit && onDelete && <DropdownMenuSeparator />}

                  {onDelete && (
                    <DropdownMenuItem
                      onClick={onDelete}
                      disabled={!canDelete || isLoading}
                      className="flex items-center gap-2 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleteLabel}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Content */}
          <div className={hasActions ? 'pr-8' : ''}>{children}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
