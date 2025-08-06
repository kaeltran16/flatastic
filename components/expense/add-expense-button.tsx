'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import AddExpenseDialog from './add-expense-dialog';

export interface ExpenseFormData {
  description: string;
  amount: string;
  category: string;
  date: string;
  split_type: 'equal' | 'custom';
}

interface AddExpenseButtonProps extends React.ComponentProps<typeof Button> {
  onExpenseAdded: () => void;
  onAddExpense: (expenseData: ExpenseFormData) => Promise<void>;
  className?: string;
  children?: React.ReactNode;
}

const AddExpenseButton: React.FC<AddExpenseButtonProps> = ({
  onExpenseAdded,
  onAddExpense,
  className = '',
  children,
  ...props
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const handleExpenseAdded = (): void => {
    console.log('New expense added');
    onExpenseAdded();
  };

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          className={className}
          onClick={() => setIsDialogOpen(true)}
          {...props}
        >
          {children || (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </>
          )}
        </Button>
      </motion.div>

      <AddExpenseDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onExpenseAdded={handleExpenseAdded}
        onAddExpense={onAddExpense}
      />
    </>
  );
};

export default AddExpenseButton;
