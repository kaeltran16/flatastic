import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import {
  Calendar,
  CreditCard,
  DollarSign,
  ExternalLink,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseWithDetails;
  currentUser: Profile;
  onSettle?: (expense: ExpenseWithDetails) => void;
}

export default function PaymentDialog({
  isOpen,
  onClose,
  expense,
  currentUser,
  onSettle,
}: PaymentDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('digital');

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleMarkAsPaid = () => {
    onSettle?.(expense);
    onClose();
    toast.success('Payment marked as complete!');
  };

  const handlePaymentLinkClick = () => {
    if (expense?.payer_payment_link) {
      window.open(expense?.payer_payment_link, '_blank');
    } else {
      toast.error('Payment link not available');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="w-[95vw] max-w-lg h-[95vh] max-h-[95vh] p-0 gap-0 overflow-hidden">
            {/* Custom Header for Mobile */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between p-4 pb-2 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <DollarSign className="h-5 w-5 text-green-600" />
                </motion.div>
                <DialogTitle className="text-lg font-semibold">
                  Pay ${expense.your_share.toFixed(2)}
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>

            <ScrollArea className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="p-4 space-y-6"
              >
                {/* Expense Summary */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="p-4 bg-gradient-to-r from-muted/30 to-muted/20 rounded-lg space-y-3 border"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base truncate pr-2">
                      {expense.description}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-xs flex-shrink-0"
                    >
                      {expense.category}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm font-medium">
                        {expense.payer_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        Pay {expense.payer_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(expense.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <motion.p
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="text-xl font-bold text-green-600"
                      >
                        ${expense.your_share.toFixed(2)}
                      </motion.p>
                      <p className="text-xs text-muted-foreground">
                        of ${expense.amount.toFixed(2)} total
                      </p>
                    </div>
                  </div>
                </motion.div>

                <Separator />

                {/* Payment Methods */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
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
                        Digital
                      </TabsTrigger>
                      <TabsTrigger
                        value="manual"
                        className="flex items-center gap-2 text-sm"
                      >
                        <CreditCard className="h-4 w-4" />
                        Manual
                      </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                      {activeTab === 'digital' && (
                        <TabsContent
                          key="digital"
                          value="digital"
                          className="space-y-4"
                          asChild
                        >
                          <motion.div
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
                                    Pay with MoMo
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
                                      disabled={!expense?.payer_payment_link}
                                      className="w-full bg-white text-pink-600 hover:bg-white/90 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                                    >
                                      Open MoMo
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </motion.div>
                                </div>
                              </motion.div>

                              {expense?.payer_payment_link ? (
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
                      )}

                      {activeTab === 'manual' && (
                        <TabsContent
                          key="manual"
                          value="manual"
                          className="space-y-4 mt-0"
                          asChild
                        >
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="text-center p-6 border-2 border-dashed border-muted rounded-lg"
                          >
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                            >
                              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            </motion.div>
                            <h4 className="font-medium mb-2">
                              Pay with Cash or Other Method
                            </h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              Pay {expense.payer_name} directly using cash, bank
                              transfer, or any other method.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Click "Mark as Paid" below once you've completed
                              the payment.
                            </p>
                          </motion.div>
                        </TabsContent>
                      )}
                    </AnimatePresence>
                  </Tabs>
                </motion.div>
              </motion.div>
            </ScrollArea>

            {/* Action Buttons - Sticky Bottom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className="p-4 border-t bg-background/95 backdrop-blur-sm"
            >
              <div className="flex gap-3">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full h-12 text-base"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    onClick={handleMarkAsPaid}
                    className="w-full h-12 text-base font-medium"
                    size="lg"
                  >
                    Mark as Paid
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
