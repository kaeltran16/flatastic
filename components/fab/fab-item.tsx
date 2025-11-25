'use client';

import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface FABItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
}

export function FABItem({
  icon: Icon,
  label,
  onClick,
  color = 'bg-primary hover:bg-primary/90',
}: FABItemProps) {
  return (
    <div className="flex items-center gap-3 pr-1">
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-border/50"
      >
        <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      </motion.div>
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <Button
          size="lg"
          onClick={onClick}
          className={`h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow ${color}`}
          aria-label={label}
        >
          <Icon className="h-5 w-5 text-white" />
        </Button>
      </motion.div>
    </div>
  );
}
