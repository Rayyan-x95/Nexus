// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { Note, Task } from './types';
import {
  clearTaskNoteReference,
  clearTasksForDeletedNote,
  reconcileTaskNoteReferences,
  syncTaskNoteReference,
  validateTaskNoteReference,
} from './taskNoteSync';

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write release notes',
    status: 'todo',
    priority: 'medium',
    createdAt: '2026-04-19T00:00:00.000Z',
    ...overrides,
  };
}

function createNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    content: 'Draft release notes',
    tags: [],
    linkedTaskIds: [],
    pinned: false,
    createdAt: '2026-04-19T00:00:00.000Z',
    ...overrides,
  };
}

describe('task-note synchronization', () => {
  it('validates that task note references must exist', () => {
    expect(() => validateTaskNoteReference(createTask({ noteId: 'missing-note' }), [])).toThrow(
      /missing note/,
    );
  });

  it('links a task to a note on create and moves it on update', () => {
    const noteA = createNote({ id: 'note-a' });
    const noteB = createNote({ id: 'note-b' });

    const createdTask = createTask({ noteId: 'note-a' });
    const afterCreate = syncTaskNoteReference(createdTask, [noteA, noteB], []);

    expect(afterCreate[0].linkedTaskIds).toEqual(['task-1']);
    expect(afterCreate[1].linkedTaskIds).toEqual([]);

    const updatedTask = createTask({ noteId: 'note-b' });
    const afterUpdate = syncTaskNoteReference(updatedTask, afterCreate, [createdTask]);

    expect(afterUpdate[0].linkedTaskIds).toEqual([]);
    expect(afterUpdate[1].linkedTaskIds).toEqual(['task-1']);
  });

  it('clears references when a task is deleted or a note is deleted', () => {
    const notes = [createNote({ linkedTaskIds: ['task-1', 'task-2'] }), createNote({ id: 'note-2' })];
    const tasks = [createTask(), createTask({ id: 'task-2', noteId: 'note-1' })];

    expect(clearTaskNoteReference('task-1', notes)[0].linkedTaskIds).toEqual(['task-2']);
    expect(clearTasksForDeletedNote('note-1', tasks)[0].noteId).toBeUndefined();
  });

  it('reconciles stale records on hydration', () => {
    const tasks = [createTask({ noteId: 'missing-note' }), createTask({ id: 'task-2', noteId: 'note-1' })];
    const notes = [createNote({ id: 'note-1', linkedTaskIds: ['stale-task'] })];

    const reconciled = reconcileTaskNoteReferences(tasks, notes);

    expect(reconciled.tasks[0].noteId).toBeUndefined();
    expect(reconciled.notes[0].linkedTaskIds).toEqual(['task-2']);
  });
});
