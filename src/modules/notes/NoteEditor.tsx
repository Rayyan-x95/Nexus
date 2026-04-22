import { useEffect, useMemo, useState } from 'react';
import { Link2, X, Pin, PinOff, ListTodo, List } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Task, Note } from '@/core/store/types';
import { useStore } from '@/core/store';
import { cn } from '@/utils/cn';

export interface NoteEditorValues {
  content: string;
  tags: string[];
  linkedTaskIds: string[];
  linkedNoteIds: string[];
  pinned: boolean;
}

interface NoteEditorProps {
  open: boolean;
  title: string;
  saveLabel: string;
  tasks: Task[];
  isSaving?: boolean;
  initialValues?: NoteEditorValues;
  onOpenChange: (open: boolean) => void;
  onSave: (values: NoteEditorValues) => Promise<void>;
  onConvertToTask?: () => Promise<void>;
}

const defaultValues: NoteEditorValues = {
  content: '',
  tags: [],
  linkedTaskIds: [],
  linkedNoteIds: [],
  pinned: false,
};

function normalizeTag(rawTag: string) {
  return rawTag.trim().replace(/\s+/g, '-').toLowerCase();
}

export function NoteEditor({
  open,
  title,
  saveLabel,
  tasks,
  isSaving = false,
  initialValues,
  onOpenChange,
  onSave,
  onConvertToTask,
}: NoteEditorProps) {
  const [values, setValues] = useState<NoteEditorValues>(defaultValues);
  const [pendingTag, setPendingTag] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  const allNotes = useStore((s) => s.notes);

  useEffect(() => {
    if (!open) {
      setValues(defaultValues);
      setPendingTag('');
      setSubmissionError(null);
      return;
    }

    setValues(initialValues ?? defaultValues);
    setPendingTag('');
    setSubmissionError(null);
  }, [initialValues, open]);

  const sortedTasks = useMemo(
    () => [...tasks].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [tasks],
  );

  const otherNotes = useMemo(
    () => allNotes.filter(n => initialValues ? n.id !== (initialValues as any).id : true),
    [allNotes, initialValues]
  );

  if (!open) {
    return null;
  }

  const toggleTaskLink = (taskId: string) => {
    setValues((current) => {
      const selected = new Set(current.linkedTaskIds);
      if (selected.has(taskId)) selected.delete(taskId);
      else selected.add(taskId);
      return { ...current, linkedTaskIds: Array.from(selected) };
    });
  };

  const toggleNoteLink = (noteId: string) => {
    setValues((current) => {
      const selected = new Set(current.linkedNoteIds);
      if (selected.has(noteId)) selected.delete(noteId);
      else selected.add(noteId);
      return { ...current, linkedNoteIds: Array.from(selected) };
    });
  };

  const insertText = (prefix: string) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = values.content;
    const nextText = currentText.substring(0, start) + prefix + currentText.substring(end);
    
    setValues(curr => ({ ...curr, content: nextText }));
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const addTag = () => {
    const nextTag = normalizeTag(pendingTag);
    if (!nextTag || values.tags.includes(nextTag)) {
      setPendingTag('');
      return;
    }
    setValues((current) => ({ ...current, tags: [...current.tags, nextTag] }));
    setPendingTag('');
  };

  const removeTag = (tag: string) => {
    setValues((current) => ({
      ...current,
      tags: current.tags.filter((item) => item !== tag),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = values.content.trim();
    if (!content) {
      setSubmissionError('Write something before saving this note.');
      return;
    }
    setSubmissionError(null);
    try {
      await onSave({ ...values, content });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save note. Please try again.';
      setSubmissionError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-4">
      <button
        type="button"
        aria-label="Close note editor"
        className="absolute inset-0 cursor-default"
        onClick={() => onOpenChange(false)}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-2xl rounded-t-[1.75rem] border border-border/70 bg-card p-5 pb-6 shadow-2xl sm:rounded-[1.75rem] overflow-y-auto max-h-[95vh]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setValues(curr => ({ ...curr, pinned: !curr.pinned }))}
              className={cn(
                "p-2 rounded-xl transition-colors",
                values.pinned ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
              )}
            >
              {values.pinned ? <Pin className="h-5 w-5" /> : <PinOff className="h-5 w-5" />}
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Note</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h3>
            </div>
          </div>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Content</span>
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => insertText('\n- [ ] ')}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                title="Add checklist"
              >
                <ListTodo className="h-4 w-4" />
              </button>
              <button 
                type="button" 
                onClick={() => insertText('\n• ')}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                title="Add bullet list"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          <textarea
            autoFocus
            value={values.content}
            onChange={(event) => setValues((current) => ({ ...current, content: event.target.value }))}
            placeholder="Capture your thought..."
            className="min-h-60 w-full resize-y rounded-2xl border border-border/70 bg-background/70 px-4 py-4 text-base leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Col: Tags & Tasks */}
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Tags</p>
              <div className="flex gap-2">
                <input
                  value={pendingTag}
                  onChange={(event) => setPendingTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag"
                  className="h-10 flex-1 rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  Add
                </Button>
              </div>

              {values.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {values.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      #{tag}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Link2 className="h-4 w-4" />
                Linked Tasks
              </p>
              <div className="max-h-32 space-y-1 overflow-auto rounded-xl border border-border bg-background p-2">
                {sortedTasks.map((task) => (
                  <label key={task.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-card">
                    <span className="min-w-0 truncate text-xs text-foreground">{task.title}</span>
                    <input
                      type="checkbox"
                      checked={values.linkedTaskIds.includes(task.id)}
                      onChange={() => toggleTaskLink(task.id)}
                      className="h-3.5 w-3.5 rounded border-border text-primary"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Backlinks */}
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Link2 className="h-4 w-4" />
              Link to Note
            </p>
            <div className="max-h-[12rem] space-y-1 overflow-auto rounded-xl border border-border bg-background p-2">
              {otherNotes.map((note) => {
                const title = note.content.split('\n')[0] || 'Untitled Note';
                return (
                  <label key={note.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-card">
                    <span className="min-w-0 truncate text-xs text-foreground">{title}</span>
                    <input
                      type="checkbox"
                      checked={values.linkedNoteIds.includes(note.id)}
                      onChange={() => toggleNoteLink(note.id)}
                      className="h-3.5 w-3.5 rounded border-border text-primary"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {submissionError && (
          <p role="alert" className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submissionError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {onConvertToTask && (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                setSubmissionError(null);
                try {
                  await onConvertToTask();
                } catch (error) {
                  setSubmissionError(error instanceof Error ? error.message : 'Failed to convert.');
                }
              }}
              disabled={isSaving || !values.content.trim()}
            >
              Convert to task
            </Button>
          )}

          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || !values.content.trim()}>
            {isSaving ? 'Saving…' : saveLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
