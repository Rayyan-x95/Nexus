import { useMemo, useState } from 'react';
import { ArrowUpRight, Link2, PencilLine, Trash2, Pin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Note, Task } from '@/core/store/types';

interface NoteItemProps {
  note: Note;
  linkedTasks: Task[];
  onOpen: () => void;
  onDelete: () => Promise<void>;
  onConvertToTask: () => Promise<void>;
}

function toPreview(content: string) {
  const compact = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' ')
    .trim();

  if (!compact) {
    return 'Empty note';
  }

  return compact.length > 180 ? `${compact.slice(0, 180)}…` : compact;
}

export function NoteItem({ note, linkedTasks, onOpen, onDelete, onConvertToTask }: NoteItemProps) {
  const [isConverting, setIsConverting] = useState(false);

  const createdAtFormatted = useMemo(() => {
    const date = new Date(note.createdAt);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }, [note.createdAt]);

  const preview = useMemo(() => toPreview(note.content), [note.content]);

  return (
    <article className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{createdAtFormatted}</p>
          {note.pinned && <Pin className="h-3.5 w-3.5 text-primary fill-primary" />}
        </div>
        <p className="mt-2 text-sm leading-7 text-foreground">{preview}</p>
        
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {linkedTasks.length > 0 && (
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              {linkedTasks.length} task{linkedTasks.length === 1 ? '' : 's'}
            </p>
          )}

          {(note.linkedNoteIds?.length ?? 0) > 0 && (
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              {note.linkedNoteIds!.length} note{note.linkedNoteIds!.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </button>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onOpen} aria-label="Edit note">
          <PencilLine className="h-4 w-4" />
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            setIsConverting(true);
            try {
              await onConvertToTask();
            } finally {
              setIsConverting(false);
            }
          }}
          disabled={isConverting || !note.content.trim()}
          aria-label="Convert note to task"
        >
          <ArrowUpRight className="h-4 w-4" />
          {isConverting ? 'Converting…' : 'Convert'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label="Delete note"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </article>
  );
}
