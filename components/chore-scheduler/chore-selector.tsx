import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ChoreTemplate } from '@/lib/supabase/schema.alias';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import { choreCardVariants, itemVariants } from './constants';
import { NewCustomChore } from './types';

export interface ChoreSelectorProps {
  choreTemplates: ChoreTemplate[];
  customChores: ChoreTemplate[];
  selectedChores: string[];
  newCustomChore: NewCustomChore;
  setNewCustomChore: React.Dispatch<React.SetStateAction<NewCustomChore>>;
  toggleChoreSelection: (choreId: string) => void;
  addCustomChore: () => void;
  removeCustomChore: (choreId: string) => void;
}


export function ChoreSelector({
  choreTemplates,
  customChores,
  selectedChores,
  newCustomChore,
  setNewCustomChore,
  toggleChoreSelection,
  addCustomChore,
  removeCustomChore,
}: ChoreSelectorProps) {
  const [isCustomChoresOpen, setIsCustomChoresOpen] = useState<boolean>(false);

  return (
    <div className="space-y-2">
      {/* Predefined Chores */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Available Chores
        </Label>
        <ScrollArea className="h-40 w-full">
          <div className="space-y-2">
            {choreTemplates.map((chore) => (
              <motion.div
                key={chore.id}
                variants={choreCardVariants}
                initial="hidden"
                animate={
                  selectedChores.includes(chore.id) ? 'selected' : 'visible'
                }
                whileTap={{ scale: 0.98 }}
                className={`p-3 border rounded-lg cursor-pointer transition-colors w-[98%] ${
                  selectedChores.includes(chore.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleChoreSelection(chore.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{chore.name}</h4>
                    {chore.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {chore.description}
                      </p>
                    )}
                  </div>
                  {selectedChores.includes(chore.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex-shrink-0 ml-2"
                    >
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Custom Chores - Collapsible */}
      <Collapsible
        open={isCustomChoresOpen}
        onOpenChange={setIsCustomChoresOpen}
        className="mt-8"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto font-medium text-sm"
          >
            <span>
              Custom Chores{' '}
              {customChores.length > 0 && `(${customChores.length})`}
            </span>
            {isCustomChoresOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 mt-3">
          {/* Add Custom Chore Form */}
          <motion.div
            className="space-y-2 p-3 border rounded-lg bg-gray-50"
            variants={itemVariants}
          >
            <Input
              placeholder="Chore name"
              value={newCustomChore.name}
              onChange={(e) =>
                setNewCustomChore((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
            <Textarea
              placeholder="Description (optional)"
              value={newCustomChore.description}
              onChange={(e) =>
                setNewCustomChore((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
            />
            <Button
              onClick={addCustomChore}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!newCustomChore.name.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Chore
            </Button>
          </motion.div>

          {/* Custom Chores List */}
          <AnimatePresence>
            {customChores.length > 0 && (
              <div className="space-y-2">
                {customChores.map((chore) => (
                  <motion.div
                    key={chore.id}
                    variants={choreCardVariants}
                    initial="hidden"
                    animate={
                      selectedChores.includes(chore.id) ? 'selected' : 'visible'
                    }
                    exit="hidden"
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedChores.includes(chore.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleChoreSelection(chore.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{chore.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            Custom
                          </Badge>
                        </div>
                        {chore.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {chore.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {selectedChores.includes(chore.id) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                          </motion.div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomChore(chore.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
