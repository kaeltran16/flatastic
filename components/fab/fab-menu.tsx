'use client';

import { Calendar, CreditCard, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { FABItem } from './fab-item';

interface FABMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'expense' | 'chore' | 'payment') => void;
}

export function FABMenu({ isOpen, onClose, onAction }: FABMenuProps) {
  const handleItemClick = (action: 'expense' | 'chore' | 'payment') => {
    onAction(action);
    onClose();
  };

  const menuItems = [
    {
      icon: DollarSign,
      label: 'Add Expense',
      action: 'expense' as const,
      color: 'bg-green-500 hover:bg-green-600',
      offset: { x: 0, y: -80 },
    },
    {
      icon: Calendar,
      label: 'Create Chore',
      action: 'chore' as const,
      color: 'bg-blue-500 hover:bg-blue-600',
      offset: { x: 0, y: -140 },
    },
    {
      icon: CreditCard,
      label: 'Log Payment',
      action: 'payment' as const,
      color: 'bg-purple-500 hover:bg-purple-600',
      offset: { x: 0, y: -200 },
    },
  ];

  return (
    <motion.div
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {menuItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ scale: 0, x: 0, y: 0 }}
          animate={{
            scale: 1,
            x: item.offset.x,
            y: item.offset.y,
          }}
          exit={{ scale: 0, x: 0, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
            delay: index * 0.05,
          }}
          className="absolute bottom-0 right-0"
        >
          <FABItem
            icon={item.icon}
            label={item.label}
            onClick={() => handleItemClick(item.action)}
            color={item.color}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
