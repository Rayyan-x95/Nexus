import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Dropdown } from '@/components/ui/Dropdown';
import { useStore } from '@/core/store';
import type { Task, TaskStatus, TaskPriority, TaskRecurrence } from '@/core/store/types';

interface TaskFormValues {
  title: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  parentTaskId?: string;
  recurrence?: TaskRecurrence;
}

interface TaskFormProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialValues?: Task;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
}

const defaultValues: TaskFormValues = {
  title: '',
  dueDate: '',
  status: 'todo',
  priority: 'medium',
};

export function TaskForm({
  open,
  title,
  submitLabel,
  initialValues,
  onOpenChange,
  onSubmit,
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  const tasks = useStore((state) => state.tasks);
  const potentialParents = tasks.filter(t => t.id !== initialValues?.id && !t.parentTaskId);

  useEffect(() => {
    if (!open) {
      setValues(defaultValues);
      setIsSubmitting(false);
      setSubmissionError(null);
      return;
    }

    setSubmissionError(null);
    setValues({
      title: initialValues?.title ?? '',
      dueDate: initialValues?.dueDate ?? '',
      status: initialValues?.status ?? 'todo',
      priority: initialValues?.priority ?? 'medium',
      parentTaskId: initialValues?.parentTaskId,
      recurrence: initialValues?.recurrence,
    });
  }, [initialValues, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = values.title.trim();

    if (!title) {
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...values,
        title,
      });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save task. Please try again.';
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 py-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="Close task form"
        className="absolute inset-0 cursor-default"
        onClick={() => onOpenChange(false)}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg rounded-[1.5rem] border border-border bg-card p-5 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">Task</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">{title}</h3>
          </div>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Title</span>
            <input
              autoFocus
              required
              value={values.title}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              placeholder="Write a task title"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Priority</span>
              <Dropdown
                label="Priority"
                value={values.priority}
                onChange={(value) =>
                  setValues((current) => ({ ...current, priority: value as TaskPriority }))
                }
                options={[
                  { label: 'Low', value: 'low' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'High', value: 'high' },
                ]}
                className="w-full"
              />
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Status</span>
              <Dropdown
                label="Status"
                value={values.status}
                onChange={(value) =>
                  setValues((current) => ({ ...current, status: value as TaskStatus }))
                }
                options={[
                  { label: 'Todo', value: 'todo' },
                  { label: 'Doing', value: 'doing' },
                  { label: 'Done', value: 'done' },
                ]}
                className="w-full"
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Due date</span>
            <DatePicker
              ariaLabel="Due date"
              value={values.dueDate || undefined}
              onChange={(date) => setValues((current) => ({ ...current, dueDate: date ?? '' }))}
              placeholder="Select due date"
              clearable
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Parent Task (Optional)</span>
            <Dropdown
              label="Parent Task"
              value={values.parentTaskId || ''}
              onChange={(value) =>
                setValues((current) => ({ ...current, parentTaskId: value || undefined }))
              }
              options={[
                { label: 'None', value: '' },
                ...potentialParents.map(t => ({ label: t.title, value: t.id }))
              ]}
              className="w-full"
            />
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-3">
               <input 
                  type="checkbox" 
                  id="recurrence-toggle"
                  checked={!!values.recurrence}
                  onChange={(e) => setValues(curr => ({ 
                    ...curr, 
                    recurrence: e.target.checked ? { type: 'daily', interval: 1 } : undefined 
                  }))}
                  className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
               />
               <label htmlFor="recurrence-toggle" className="text-sm font-medium text-foreground">Recurring Task</label>
            </div>
            
            {values.recurrence && (
              <div className="mt-3 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <Dropdown
                  label="Type"
                  value={values.recurrence.type}
                  onChange={(value) =>
                    setValues((current) => ({ 
                      ...current, 
                      recurrence: { ...current.recurrence!, type: value as TaskRecurrence['type'] } 
                    }))
                  }
                  options={[
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                  ]}
                  className="w-full"
                />
                <input
                  type="number"
                  min="1"
                  value={values.recurrence.interval}
                  onChange={(e) => setValues(curr => ({ 
                    ...curr, 
                    recurrence: { ...curr.recurrence!, interval: parseInt(e.target.value) || 1 } 
                  }))}
                  className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  placeholder="Interval"
                />
              </div>
            )}
          </div>
        </div>

        {submissionError ? (
          <p role="alert" className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submissionError}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !values.title.trim()}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
