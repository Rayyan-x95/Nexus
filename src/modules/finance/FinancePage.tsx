import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { fromDollars, toDollars, useStore } from '@/core/store';
import type { Expense } from '@/core/store/types';
import { ExpenseForm, type ExpenseFormValues } from './ExpenseForm';
import { ExpenseItem } from './ExpenseItem';

const predefinedCategories = ['Food', 'Travel', 'Study', 'Personal'];

function toInputDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toIsoAtLocalNoon(dateInput: string) {
  const [year, month, day] = dateInput.split('-').map((part) => Number(part));

  if (!year || !month || !day) {
    return new Date().toISOString();
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

export function FinancePage() {
  const expenses = useStore((state) => state.expenses);
  const tasks = useStore((state) => state.tasks);
  const hydrated = useStore((state) => state.hydrated);
  const addExpense = useStore((state) => state.addExpense);
  const updateExpense = useStore((state) => state.updateExpense);
  const deleteExpense = useStore((state) => state.deleteExpense);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedExpenses = useMemo(
    () => [...expenses].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [expenses],
  );

  const categories = useMemo(() => {
    const all = new Set(predefinedCategories);

    for (const expense of expenses) {
      if (expense.category.trim()) {
        all.add(expense.category.trim());
      }
    }

    return Array.from(all).sort((left, right) => left.localeCompare(right));
  }, [expenses]);

  const todaysTotalFormatted = useMemo(() => {
    const today = toInputDateString(new Date());

    const cents = expenses.reduce((sum, expense) => {
      const expenseDate = new Date(expense.createdAt);

      if (Number.isNaN(expenseDate.getTime())) {
        return sum;
      }

      return toInputDateString(expenseDate) === today ? sum + expense.amount : sum;
    }, 0);

    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(toDollars(cents));
  }, [expenses]);

  const openCreateForm = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleSaveExpense = async (values: ExpenseFormValues) => {
    const createdAt = toIsoAtLocalNoon(values.date);

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          amount: fromDollars(values.amountDollars),
          category: values.category,
          createdAt,
          linkedTaskId: values.linkedTaskId,
        });
        setEditingExpense(null);
      } else {
        await addExpense({
          amountDollars: values.amountDollars,
          category: values.category,
          createdAt,
          linkedTaskId: values.linkedTaskId,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    const confirmed = window.confirm('Delete this expense entry?');

    if (!confirmed) {
      return;
    }

    await deleteExpense(expense.id);

    if (editingExpense?.id === expense.id) {
      setEditingExpense(null);
      setIsFormOpen(false);
    }
  };

  return (
    <PageShell
      title="Finance"
      description="Track spending with low friction, keep categories tidy, and connect expenses back to work."
    >
      <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">Today</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{todaysTotalFormatted}</p>
        <p className="mt-1 text-sm text-muted-foreground">Daily total of all recorded expenses.</p>
      </article>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {category}
            </span>
          ))}
        </div>

        <Button onClick={openCreateForm} className="hidden sm:inline-flex" aria-label="Add expense">
          <Plus className="h-4 w-4" />
          Add expense
        </Button>
      </div>

      {!hydrated ? (
        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Loading finance records…</p>
        </article>
      ) : sortedExpenses.length === 0 ? (
        <article className="rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">No expenses yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first expense to start tracking daily spend.
          </p>
        </article>
      ) : (
        <section className="space-y-3">
          {sortedExpenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              linkedTask={tasks.find((task) => task.id === expense.linkedTaskId)}
              onEdit={() => openEditForm(expense)}
              onDelete={() => handleDeleteExpense(expense)}
            />
          ))}
        </section>
      )}

      <Button
        onClick={openCreateForm}
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-xl sm:hidden"
        aria-label="Add expense"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <ExpenseForm
        open={isFormOpen}
        title={editingExpense ? 'Edit expense' : 'New expense'}
        submitLabel={editingExpense ? 'Save changes' : 'Add expense'}
        categories={categories}
        tasks={tasks}
        initialValues={editingExpense ?? undefined}
        isSubmitting={isSubmitting}
        onOpenChange={(nextOpen) => {
          setIsFormOpen(nextOpen);
          if (!nextOpen) {
            setEditingExpense(null);
          }
        }}
        onSubmit={handleSaveExpense}
      />
    </PageShell>
  );
}