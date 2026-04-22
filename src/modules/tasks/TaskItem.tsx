import { useMemo } from 'react';
import { ChevronRight, PencilLine, Trash2, Repeat, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Task, TaskStatus, TaskPriority } from '@/core/store/types';

interface TaskItemProps {
  task: Task;
  subtasks?: Task[];
  onEdit: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Todo',
  doing: 'Doing',
  done: 'Done',
};

const statusStyles: Record<TaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  doing: 'bg-amber-500/15 text-amber-300 dark:text-amber-200',
  done: 'bg-emerald-500/15 text-emerald-300 dark:text-emerald-200',
};

const priorityStyles: Record<TaskPriority, string> = {
  low: 'bg-blue-500/10 text-blue-400',
  medium: 'bg-amber-500/10 text-amber-400',
  high: 'bg-rose-500/10 text-rose-500',
};

export function TaskItem({ task, subtasks, onEdit, onToggleStatus, onDelete }: TaskItemProps) {
  const formattedDueDate = useMemo(() => {
    if (!task.dueDate) {
      return null;
    }

    const date = new Date(task.dueDate);

    if (Number.isNaN(date.getTime())) {
      return task.dueDate;
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }, [task.dueDate]);

  const createdAtFormatted = useMemo(() => {
    if (!task.createdAt) {
      return '—';
    }

    const date = new Date(task.createdAt);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }, [task.createdAt]);

  const nextStatusLabel =
    task.status === 'todo' ? 'Start' : task.status === 'doing' ? 'Complete' : 'Reset';

  return (
    <article className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[task.status]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabels[task.status]}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${priorityStyles[task.priority]}`}>
              {task.priority}
            </span>
            {task.recurrence && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Repeat className="h-3 w-3" />
                {task.recurrence.type}
              </span>
            )}
            {formattedDueDate ? (
              <span className="text-xs text-muted-foreground">Due {formattedDueDate}</span>
            ) : null}
          </div>
          <h3 className="break-words text-base font-semibold leading-6 text-foreground">{task.title}</h3>
        </div>

        <Button variant="ghost" size="sm" onClick={() => onToggleStatus(task)} aria-label="Advance task status">
          {nextStatusLabel}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Created {createdAtFormatted}</p>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(task); }} aria-label="Edit task">
            <PencilLine className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            aria-label="Delete task"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {subtasks && subtasks.length > 0 && (
        <div className="mt-4 space-y-3 pl-6 border-l border-border/50">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <ChevronDown className="h-3 w-3" />
            Subtasks ({subtasks.length})
          </div>
          {subtasks.map((st) => (
            <TaskItem
              key={st.id}
              task={st}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </article>
  );
}
