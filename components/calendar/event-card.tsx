'use client';

import { Badge } from '@/components/ui/badge';
import { CalendarEvent } from '@/hooks/use-calendar-events';
import { formatDateRelatively } from '@/utils';
import { Calendar, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface EventCardProps {
  event: CalendarEvent;
  onClick: () => void;
  index: number;
}

export function EventCard({ event, onClick, index }: EventCardProps) {
  const isChore = event.type === 'chore';
  const isExpense = event.type === 'expense';

  // Glassmorphism colors based on type
  const getGlassStyle = () => {
    if (isChore) {
      return 'bg-orange-500/10 border-orange-500/20 dark:bg-orange-400/10 dark:border-orange-400/20';
    }
    return 'bg-blue-500/10 border-blue-500/20 dark:bg-blue-400/10 dark:border-blue-400/20';
  };

  const getAccentGlow = () => {
    if (isChore) return 'shadow-orange-500/20';
    return 'shadow-blue-500/20';
  };

  const typeIcon = isChore ? Calendar : DollarSign;
  const TypeIcon = typeIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.03,
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1]
      }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
    >
      <div className={`
        group relative overflow-hidden rounded-xl p-[1px]
        ${getGlassStyle()}
        backdrop-blur-xl
        border
        shadow-md ${getAccentGlow()}
        hover:shadow-lg hover:${getAccentGlow()}
        transition-all duration-300
        cursor-pointer
      `}>
        {/* Glassmorphism inner content */}
        <div className="relative rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl p-4">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-xl" />

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Icon */}
                <div className={`
                  p-2 rounded-lg backdrop-blur-sm
                  ${isChore
                    ? 'bg-orange-100 dark:bg-orange-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                  }
                `}>
                  <TypeIcon className={`
                    h-4 w-4
                    ${isChore
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-blue-600 dark:text-blue-400'
                    }
                  `} />
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-1">
                    {event.title}
                  </h3>
                  {event.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Type Badge */}
              <Badge
                variant="secondary"
                className={`
                  text-xs px-2 py-0.5 backdrop-blur-sm
                  ${isChore
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }
                `}
              >
                {event.type}
              </Badge>
            </div>

            {/* Time */}
            {event.start && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDateRelatively(event.start.toISOString())}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
