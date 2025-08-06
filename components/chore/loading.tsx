import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({
  message = 'Loading chores...',
}: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-6 w-6 animate-spin" />
        </motion.div>
        <span>{message}</span>
      </motion.div>
    </div>
  );
}
