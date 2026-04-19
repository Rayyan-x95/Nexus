import { useMemo } from 'react';
import { PencilLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toDollars } from '@/core/store';
import type { Expense, Task } from '@/core/store/types';

interface ExpenseItemProps {
  expense: Expense;
  linkedTask?: Task;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export function ExpenseItem({ expense, linkedTask, onEdit, onDelete }: ExpenseItemProps) {
  const amountFormatted = useMemo(() => currencyFormatter.format(toDollars(expense.amount)), [expense.amount]);

  const createdAtFormatted = useMemo(() => {
    const date = new Date(expense.createdAt);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }, [expense.createdAt]);

  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-2xl font-semibold leading-none tracking-tight text-foreground">{amountFormatted}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {expense.category}
            </span>
            <span className="text-xs text-muted-foreground">{createdAtFormatted}</span>
          </div>
          {linkedTask ? (
            <p className="text-xs text-muted-foreground">
              Linked to task: <span className="font-medium text-foreground">{linkedTask.title}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label="Edit expense">
            <PencilLine className="h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label="Delete expense"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}
