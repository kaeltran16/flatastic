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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Balance } from '@/lib/supabase/types';
import { CreditCard, ExternalLink, Smartphone, Sparkles } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('digital');

  console.log(selectedBalance);

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

  const handlePaymentLinkClick = () => {
    // Assuming the balance object has payment link info
    // You may need to adjust this based on your Balance type structure
    const paymentLink = selectedBalance?.payment_link;

    if (paymentLink) {
      window.open(paymentLink, '_blank');
    } else {
      toast.error('Payment link not available');
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

  // Check if payment link is available
  const hasPaymentLink = selectedBalance?.payment_link;

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
                    Settle Payment
                  </DialogTitle>
                  <DialogDescription className="text-sm sm:text-base mt-2">
                    {selectedBalance && (
                      <>
                        Pay{' '}
                        <strong>
                          {selectedBalance.to_user_id === currentUserId
                            ? 'yourself'
                            : selectedBalance.to_user_name}
                        </strong>{' '}
                        ${selectedBalance.amount.toFixed(2)}
                      </>
                    )}
                  </DialogDescription>
                </motion.div>
              </DialogHeader>

              <div className="space-y-4 sm:space-y-5 py-2">
                {/* Payment Method Tabs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger
                        value="digital"
                        className="flex items-center gap-2 text-sm"
                      >
                        <Smartphone className="h-4 w-4" />
                        Pay Now
                      </TabsTrigger>
                      <TabsTrigger
                        value="manual"
                        className="flex items-center gap-2 text-sm"
                      >
                        <CreditCard className="h-4 w-4" />
                        Record Payment
                      </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                      <TabsContent value="digital" className="space-y-4">
                        <motion.div
                          key="digital"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* Payment Link Button Section */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-center space-y-4"
                          >
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="mx-auto w-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl p-6 shadow-lg"
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
                                  <Smartphone className="h-12 w-12 mx-auto text-white" />
                                </motion.div>
                                <p className="text-sm text-white/90 px-2 font-medium">
                                  Pay ${selectedBalance?.amount.toFixed(2)} with
                                  MoMo
                                </p>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.5 }}
                                  className="flex items-center justify-center gap-1"
                                >
                                  <Sparkles className="h-3 w-3 text-yellow-300" />
                                  <p className="text-xs font-medium text-white">
                                    Quick & Secure
                                  </p>
                                  <Sparkles className="h-3 w-3 text-yellow-300" />
                                </motion.div>

                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="pt-2"
                                >
                                  <Button
                                    onClick={handlePaymentLinkClick}
                                    disabled={!hasPaymentLink}
                                    className="w-full bg-white text-pink-600 hover:bg-white/90 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                                  >
                                    Open MoMo
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>

                            {hasPaymentLink ? (
                              <p className="text-sm text-muted-foreground">
                                Tap to open MoMo and send payment
                              </p>
                            ) : (
                              <p className="text-sm text-red-500">
                                Payment link not available for this user
                              </p>
                            )}
                          </motion.div>
                        </motion.div>
                      </TabsContent>

                      <TabsContent value="manual" className="space-y-4">
                        <motion.div
                          key="manual"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          <motion.div
                            variants={formFieldVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: 0.1 }}
                          >
                            <Label
                              htmlFor="amount"
                              className="text-sm sm:text-base"
                            >
                              Payment Amount
                            </Label>
                            <motion.div
                              whileFocus={{ scale: 1.02 }}
                              transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                              }}
                            >
                              <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                max={selectedBalance?.amount || 0}
                                value={paymentAmount}
                                onChange={(e) =>
                                  setPaymentAmount(e.target.value)
                                }
                                placeholder="0.00"
                                className="mt-2 h-11 sm:h-10 text-base sm:text-sm"
                              />
                            </motion.div>
                            <motion.p
                              className="text-xs sm:text-sm text-muted-foreground mt-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.2 }}
                            >
                              Maximum: $
                              {selectedBalance?.amount.toFixed(2) || '0.00'}
                            </motion.p>
                          </motion.div>

                          <motion.div
                            variants={formFieldVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: 0.2 }}
                          >
                            <Label
                              htmlFor="note"
                              className="text-sm sm:text-base"
                            >
                              Note (optional)
                            </Label>
                            <motion.div
                              whileFocus={{ scale: 1.01 }}
                              transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                              }}
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
                        </motion.div>
                      </TabsContent>
                    </AnimatePresence>
                  </Tabs>
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

                {activeTab === 'manual' && (
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
                )}

                {activeTab === 'digital' && (
                  <motion.div
                    variants={buttonVariants}
                    initial="idle"
                    whileHover="hover"
                    whileTap="tap"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      onClick={handleSettlePayment}
                      className="w-full sm:w-auto h-11 sm:h-10 min-w-[120px]"
                    >
                      Mark as Paid
                    </Button>
                  </motion.div>
                )}
              </DialogFooter>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default SettlementDialog;
