import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Balance } from '@/lib/supabase/types';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBalance: Balance | null;
  currentUserId: string | undefined;
  onSettle: (balance: Balance, amount: number, note: string) => Promise<void>;
}

const SettlementDialog = ({
  open,
  onOpenChange,
  selectedBalance,
  currentUserId,
  onSettle,
}: SettlementDialogProps) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [settlingPayment, setSettlingPayment] = useState(false);

  const handleSettlePayment = async () => {
    if (!selectedBalance || !paymentAmount) return;

    try {
      setSettlingPayment(true);
      const amount = parseFloat(paymentAmount);

      if (amount <= 0 || amount > selectedBalance.amount) {
        toast.error('Invalid amount', {
          description:
            'Payment amount must be between $0 and the total owed amount.',
        });
        return;
      }

      await onSettle(selectedBalance, amount, paymentNote);

      toast.success('Payment settled!', {
        description: `$${amount.toFixed(2)} payment recorded successfully.`,
      });

      onOpenChange(false);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (err) {
      console.error('Error settling payment:', err);
      toast.error('Error settling payment', {
        description: 'Failed to record payment. Please try again.',
      });
    } finally {
      setSettlingPayment(false);
    }
  };

  // Reset form when dialog opens with new balance
  useEffect(() => {
    if (selectedBalance && open) {
      setPaymentAmount(selectedBalance.amount.toString());
    }
  }, [selectedBalance, open]);

  const dialogVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        duration: 0.5,
        bounce: 0.3,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -20,
      transition: {
        duration: 0.2,
        ease: 'easeInOut' as const,
      },
    },
  };

  const formFieldVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
    loading: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence mode="wait">
        {open && (
          <DialogContent className="sm:max-w-md w-[95vw] max-w-[425px] mx-auto p-4 sm:p-6">
            <motion.div
              variants={dialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <DialogHeader className="pb-4">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <DialogTitle className="text-lg sm:text-xl">
                    Record Payment
                  </DialogTitle>
                  <DialogDescription className="text-sm sm:text-base mt-2">
                    {selectedBalance && (
                      <>
                        Record a payment from{' '}
                        <strong>
                          {selectedBalance.from_user_id === currentUserId
                            ? 'you'
                            : selectedBalance.from_user_name}
                        </strong>{' '}
                        to{' '}
                        <strong>
                          {selectedBalance.to_user_id === currentUserId
                            ? 'you'
                            : selectedBalance.to_user_name}
                        </strong>
                      </>
                    )}
                  </DialogDescription>
                </motion.div>
              </DialogHeader>

              <div className="space-y-4 sm:space-y-5 py-2">
                <motion.div
                  variants={formFieldVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.2 }}
                >
                  <Label htmlFor="amount" className="text-sm sm:text-base">
                    Payment Amount
                  </Label>
                  <motion.div
                    whileFocus={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedBalance?.amount || 0}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-2 h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </motion.div>
                  <motion.p
                    className="text-xs sm:text-sm text-muted-foreground mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Maximum: ${selectedBalance?.amount.toFixed(2) || '0.00'}
                  </motion.p>
                </motion.div>

                <motion.div
                  variants={formFieldVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 }}
                >
                  <Label htmlFor="note" className="text-sm sm:text-base">
                    Note (optional)
                  </Label>
                  <motion.div
                    whileFocus={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <Textarea
                      id="note"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="Add a note about this payment..."
                      rows={3}
                      className="mt-2 text-base sm:text-sm resize-none"
                    />
                  </motion.div>
                </motion.div>
              </div>

              <DialogFooter className="pt-4 gap-2 sm:gap-3">
                <motion.div
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="w-full sm:w-auto h-11 sm:h-10"
                    disabled={settlingPayment}
                  >
                    Cancel
                  </Button>
                </motion.div>

                <motion.div
                  variants={buttonVariants}
                  initial="idle"
                  animate={settlingPayment ? 'loading' : 'idle'}
                  whileHover={!settlingPayment ? 'hover' : undefined}
                  whileTap={!settlingPayment ? 'tap' : undefined}
                  className="w-full sm:w-auto"
                >
                  <Button
                    onClick={handleSettlePayment}
                    disabled={!paymentAmount || settlingPayment}
                    className="w-full sm:w-auto h-11 sm:h-10 min-w-[120px] relative"
                  >
                    <AnimatePresence mode="wait">
                      {settlingPayment ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <motion.div
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                          />
                          Recording...
                        </motion.div>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          Record Payment
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default SettlementDialog;
