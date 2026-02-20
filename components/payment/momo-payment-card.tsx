'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, Smartphone, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface MoMoPaymentCardProps {
  amount?: string;
  paymentLink?: string | null;
  onPaymentClick: () => void;
  label?: string;
}

export function MoMoPaymentCard({
  amount,
  paymentLink,
  onPaymentClick,
  label = 'Pay with MoMo',
}: MoMoPaymentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="text-center space-y-4"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mx-auto w-full max-w-xs bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl p-6 shadow-lg"
      >
        <div className="text-center space-y-3">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          >
            <Smartphone className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-white" />
          </motion.div>
          <p className="text-sm text-white/90 px-2 font-medium">
            {amount ? `Pay $${amount} with MoMo` : label}
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-1"
          >
            <Sparkles className="h-3 w-3 text-yellow-300" />
            <p className="text-xs font-medium text-white">Quick & Secure</p>
            <Sparkles className="h-3 w-3 text-yellow-300" />
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="pt-2"
          >
            <Button
              onClick={onPaymentClick}
              disabled={!paymentLink}
              className="w-full bg-white text-pink-600 hover:bg-white/90 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              Open MoMo
              <ExternalLink className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {paymentLink ? (
        <p className="text-sm text-muted-foreground">
          Tap to open MoMo and send payment
        </p>
      ) : (
        <p className="text-sm text-red-500">
          Payment link not available for this user
        </p>
      )}
    </motion.div>
  );
}
