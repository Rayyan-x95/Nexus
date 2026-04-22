import { useMemo } from 'react';
import { PencilLine, Trash2, Link2, Landmark, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSettings, formatMoney } from '@/core/settings';
import type { Expense, Task, Account, Note } from '@/core/store/types';
import { cn } from '@/utils/cn';

interface ExpenseItemProps {
  expense: Expense;
  account?: Account;
  linkedTask?: Task;
  linkedNote?: Note;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function ExpenseItem({ expense, account, linkedTask, linkedNote, onEdit, onDelete }: ExpenseItemProps) {
  const { currency } = useSettings();
  const isExpense = expense.type === 'expense';
  
  const amountFormatted = useMemo(() => {
    const formatted = formatMoney(expense.amount, currency);
    return isExpense ? `-${formatted}` : `+${formatted}`;
  }, [expense.amount, expense.type, currency]);

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/40 p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-glass">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
             <div className={cn(
               "flex h-10 w-10 items-center justify-center rounded-xl",
               isExpense ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
             )}>
               <Landmark className="h-5 w-5" />
             </div>
             <div>
               <p className={cn(
                 "text-2xl font-bold tracking-tight",
                 isExpense ? "text-rose-500" : "text-emerald-500"
               )}>
                 {amountFormatted}
               </p>
               <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 {expense.category} • {account?.name || 'Unknown'}
               </p>
             </div>
          </div>

          {(linkedTask || linkedNote || expense.note) && (
            <div className="space-y-2 rounded-2xl bg-secondary/30 p-3">
              {expense.note && (
                <p className="text-xs text-foreground italic">“{expense.note}”</p>
              )}
              <div className="flex flex-wrap gap-3">
                {linkedTask && (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <Link2 className="h-3 w-3" />
                    <span>{linkedTask.title}</span>
                  </div>
                )}
                {linkedNote && (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>Note Link</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 transition-all">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="h-8 w-8 p-0 rounded-lg bg-secondary/50 hover:bg-secondary">
            <PencilLine className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="h-8 w-8 p-0 rounded-lg text-destructive bg-destructive/5 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
