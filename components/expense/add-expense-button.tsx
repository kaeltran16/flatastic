'use client';

import { Button } from '@/components/ui/button';
import { Profile } from '@/lib/supabase/schema.alias';
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
  householdMembers: Profile[];
  currentUser: Profile;
  onAddExpense: (expenseData: ExpenseFormData) => Promise<void>;
  className?: string;
  children?: React.ReactNode;
}

const AddExpenseButton: React.FC<AddExpenseButtonProps> = ({
  onAddExpense,
  className = '',
  children,
  householdMembers,
  currentUser,
  ...props
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          className={className}
          onClick={() => setIsDialogOpen(true)}
          {...props}
        >
          {children || (
            <div className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </div>
          )}
        </Button>
      </motion.div>

      <AddExpenseDialog
        isOpen={isDialogOpen}
        householdMembers={householdMembers}
        currentUser={currentUser}
        onOpenChange={setIsDialogOpen}
        onAddExpense={onAddExpense}
      />
    </>
  );
};

export default AddExpenseButton;
