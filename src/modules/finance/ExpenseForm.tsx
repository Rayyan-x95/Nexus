import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Expense, Task } from '@/core/store/types';

export interface ExpenseFormValues {
  amountDollars: number;
  category: string;
  date: string;
  linkedTaskId?: string;
}

interface ExpenseFormProps {
  open: boolean;
  title: string;
  submitLabel: string;
  categories: string[];
  tasks: Task[];
  initialValues?: Expense;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
}

function toInputDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoToDateInput(value?: string) {
  if (!value) {
    return toInputDateString(new Date());
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return toInputDateString(new Date());
  }

  return toInputDateString(date);
}

const defaultValues: ExpenseFormValues = {
  amountDollars: 0,
  category: '',
  date: toInputDateString(new Date()),
  linkedTaskId: undefined,
};

export function ExpenseForm({
  open,
  title,
  submitLabel,
  categories,
  tasks,
  initialValues,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>(defaultValues);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setValues(defaultValues);
      setSubmissionError(null);
      return;
    }

    if (!initialValues) {
      setValues(defaultValues);
      setSubmissionError(null);
      return;
    }

    setValues({
      amountDollars: initialValues.amount / 100,
      category: initialValues.category,
      date: isoToDateInput(initialValues.createdAt),
      linkedTaskId: initialValues.linkedTaskId,
    });
    setSubmissionError(null);
  }, [initialValues, open]);

  const sortedTasks = useMemo(
    () => [...tasks].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [tasks],
  );

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const category = values.category.trim();

    if (!values.amountDollars || values.amountDollars <= 0) {
      setSubmissionError('Amount must be greater than 0.');
      return;
    }

    if (!category) {
      setSubmissionError('Category is required.');
      return;
    }

    setSubmissionError(null);

    try {
      await onSubmit({
        amountDollars: values.amountDollars,
        category,
        date: values.date,
        linkedTaskId: values.linkedTaskId || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save expense. Please try again.';
      setSubmissionError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 py-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="Close expense form"
        className="absolute inset-0 cursor-default"
        onClick={() => onOpenChange(false)}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg rounded-[1.5rem] border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">Expense</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">{title}</h3>
          </div>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Amount</span>
            <input
              autoFocus
              type="number"
              min="0.01"
              step="0.01"
              required
              value={values.amountDollars || ''}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  amountDollars: Number(event.target.value),
                }))
              }
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              placeholder="0.00"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Category</span>
            <input
              list="finance-category-options"
              required
              value={values.category}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              placeholder="Food"
            />
            <datalist id="finance-category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Date</span>
            <input
              type="date"
              required
              value={values.date}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Link to task (optional)</span>
            <select
              value={values.linkedTaskId ?? ''}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  linkedTaskId: event.target.value || undefined,
                }))
              }
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="">No task</option>
              {sortedTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {submissionError ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submissionError}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
