import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageShell } from '@/components/PageShell';
import { useStore } from '@/core/store';
import type { Note, Task } from '@/core/store/types';
import { useSeo } from '@/seo';
import { NoteEditor, type NoteEditorValues } from './NoteEditor';
import { NoteItem } from './NoteItem';

type TagFilter = 'all' | string;

function normalizeTags(tags: string[]) {
  const deduped = new Set(tags.map((tag) => tag.trim()).filter(Boolean));
  return Array.from(deduped);
}

function createTaskTitleFromNote(content: string) {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return 'Untitled task';
  }

  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine;
}

export function NotesPage() {
  useSeo({
    title: 'Notes',
    description: 'Capture ideas, tag notes, and connect them to tasks in Titan.',
    path: '/notes',
  });

  const notes = useStore((state) => state.notes);
  const tasks = useStore((state) => state.tasks);
  const hydrated = useStore((state) => state.hydrated);
  const addNote = useStore((state) => state.addNote);
  const updateNote = useStore((state) => state.updateNote);
  const deleteNote = useStore((state) => state.deleteNote);
  const addTask = useStore((state) => state.addTask);
  const updateTask = useStore((state) => state.updateTask);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tagFilter, setTagFilter] = useState<TagFilter>('all');

  const sortedNotes = useMemo(
    () => [...notes].sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      return right.createdAt.localeCompare(left.createdAt);
    }),
    [notes],
  );

  const allTags = useMemo(
    () =>
      Array.from(new Set(notes.flatMap((note) => note.tags.map((tag) => tag.trim()).filter(Boolean)))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [notes],
  );

  const visibleNotes = useMemo(() => {
    if (tagFilter === 'all') {
      return sortedNotes;
    }

    return sortedNotes.filter((note) => note.tags.includes(tagFilter));
  }, [sortedNotes, tagFilter]);

  const linkedTasksByNoteId = useMemo(() => {
    const map = new Map<string, Task[]>();

    for (const task of tasks) {
      if (!task.noteId) {
        continue;
      }

      const current = map.get(task.noteId) ?? [];
      current.push(task);
      map.set(task.noteId, current);
    }

    return map;
  }, [tasks]);

  const openCreateEditor = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const openEditEditor = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    if (isSaving) {
      return;
    }

    setIsEditorOpen(false);
    setEditingNote(null);
  };

  const syncTaskLinks = async (noteId: string, selectedTaskIds: string[]) => {
    const selectedSet = new Set(selectedTaskIds);
    const linkedTaskIds = tasks.filter((task) => task.noteId === noteId).map((task) => task.id);

    const linkUpdates = tasks
      .filter((task) => selectedSet.has(task.id) && task.noteId !== noteId)
      .map((task) => updateTask(task.id, { noteId }));

    const unlinkUpdates = linkedTaskIds
      .filter((taskId) => !selectedSet.has(taskId))
      .map((taskId) => updateTask(taskId, { noteId: undefined }));

    await Promise.all([...linkUpdates, ...unlinkUpdates]);
  };

  const handleSaveNote = async (values: NoteEditorValues) => {
    const cleanedTags = normalizeTags(values.tags);
    const cleanedContent = values.content.trim();

    setIsSaving(true);
    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          content: cleanedContent,
          tags: cleanedTags,
          pinned: values.pinned,
          linkedNoteIds: values.linkedNoteIds,
        });

        await syncTaskLinks(editingNote.id, values.linkedTaskIds);
      } else {
        const created = await addNote({
          content: cleanedContent,
          tags: cleanedTags,
          linkedTaskIds: [],
          linkedNoteIds: values.linkedNoteIds,
          pinned: values.pinned,
        });

        await syncTaskLinks(created.id, values.linkedTaskIds);
      }

      setIsEditorOpen(false);
      setEditingNote(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (note: Note) => {
    const confirmed = window.confirm('Delete this note? Linked task references will be removed.');

    if (!confirmed) {
      return;
    }

    await deleteNote(note.id);

    if (editingNote?.id === note.id) {
      setIsEditorOpen(false);
      setEditingNote(null);
    }
  };

  const handleConvertToTask = async (note: Note) => {
    const createdTask = await addTask({
      title: createTaskTitleFromNote(note.content),
      status: 'todo',
      noteId: note.id,
    });

    return createdTask;
  };

  return (
    <PageShell
      title="Notes"
      description="Capture ideas in seconds, tag for retrieval, and connect thinking directly to execution."
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTagFilter('all')}
            className={
              tagFilter === 'all'
                ? 'rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
                : 'rounded-full border border-border/70 bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
            }
          >
            All notes
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tag)}
              className={
                tagFilter === tag
                  ? 'rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
                  : 'rounded-full border border-border/70 bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
              }
            >
              #{tag}
            </button>
          ))}
        </div>

        <Button onClick={openCreateEditor} className="hidden sm:inline-flex" aria-label="Create note">
          <Plus className="h-4 w-4" />
          New note
        </Button>
      </div>

      {!hydrated ? (
        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Loading your notes…</p>
        </article>
      ) : visibleNotes.length === 0 ? (
        <article className="rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">No notes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the editor and write your first note.
          </p>
        </article>
      ) : (
        <section className="space-y-4">
          {visibleNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              linkedTasks={linkedTasksByNoteId.get(note.id) ?? []}
              onOpen={() => openEditEditor(note)}
              onDelete={() => handleDeleteNote(note)}
              onConvertToTask={async () => {
                await handleConvertToTask(note);
              }}
            />
          ))}
        </section>
      )}

      <Button
        onClick={openCreateEditor}
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-xl sm:hidden"
        aria-label="Create note"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <NoteEditor
        open={isEditorOpen}
        title={editingNote ? 'Edit note' : 'New note'}
        saveLabel={editingNote ? 'Save changes' : 'Save note'}
        tasks={tasks}
        isSaving={isSaving}
        initialValues={
          editingNote
             ? {
                 content: editingNote.content,
                 tags: editingNote.tags,
                 linkedTaskIds: tasks.filter((task) => task.noteId === editingNote.id).map((task) => task.id),
                 linkedNoteIds: editingNote.linkedNoteIds ?? [],
                 pinned: editingNote.pinned ?? false,
               }
             : undefined
         }
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeEditor();
            return;
          }

          setIsEditorOpen(true);
        }}
        onSave={handleSaveNote}
        onConvertToTask={
          editingNote
            ? async () => {
                await handleConvertToTask(editingNote);
              }
            : undefined
        }
      />
    </PageShell>
  );
}
