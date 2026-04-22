import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useStore } from '@/core/store';
import { cn } from '@/utils/cn';
import type { Task, TaskPriority } from '@/core/store/types';

interface TaskCalendarProps {
  onDateClick: (date: Date) => void;
  onEditTask: (task: Task) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-blue-400',
  medium: 'bg-amber-400',
  high: 'bg-rose-500',
};

export function TaskCalendar({ onDateClick, onEditTask }: TaskCalendarProps) {
  const tasks = useStore((state) => state.tasks);
  const [currentDate, setCurrentDate] = useState(new Date());

  const { year, month, firstDay, daysInMonth } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { year, month, firstDay, daysInMonth };
  }, [currentDate]);

  const taskMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.dueDate) {
        const existing = map.get(task.dueDate) || [];
        existing.push(task);
        map.set(task.dueDate, existing);
      }
    });
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const items = [];
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      items.push({ day: prevMonthLastDay - i, current: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      items.push({ day: d, current: true, date: new Date(year, month, d) });
    }
    // Next month padding
    const remaining = 42 - items.length;
    for (let d = 1; d <= remaining; d++) {
      items.push({ day: d, current: false, date: new Date(year, month + 1, d) });
    }
    return items;
  }, [year, month, firstDay, daysInMonth]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-3xl border border-border bg-card/30 backdrop-blur-md shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="text-lg font-bold tracking-tight">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:text-primary transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 border-b border-border/50">
        {DAYS.map((d) => (
          <div key={d} className="p-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-r border-border/50 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6 flex-[10]">
        {cells.map((cell, idx) => {
          const dateStr = cell.date.toISOString().split('T')[0];
          const dayTasks = taskMap.get(dateStr) || [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={idx}
              onClick={() => onDateClick(cell.date)}
              className={cn(
                "group relative p-2 border-r border-b border-border/50 last:border-r-0 transition-colors cursor-pointer hover:bg-secondary/20",
                !cell.current && "bg-secondary/5 opacity-40",
                isToday && "bg-primary/5"
              )}
            >
              <span className={cn(
                "text-xs font-medium",
                isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {cell.day}
              </span>
              
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map(task => (
                  <div 
                    key={task.id}
                    onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-secondary/40 text-[9px] font-medium truncate hover:bg-secondary"
                  >
                    <span className={cn("h-1 w-1 rounded-full", priorityColors[task.priority])} />
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[9px] text-muted-foreground pl-1.5 flex items-center gap-1">
                    <MoreHorizontal className="h-3 w-3" />
                    {dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
