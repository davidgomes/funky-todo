
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type ReorderTasksInput } from '../schema';
import { reorderTasks } from '../handlers/reorder_tasks';
import { eq } from 'drizzle-orm';

describe('reorderTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestTasks = async () => {
    // Create tasks in different columns with specific positions
    await db.insert(tasksTable).values([
      { title: 'Task 1', status: 'todo', position: 0 },
      { title: 'Task 2', status: 'todo', position: 1 },
      { title: 'Task 3', status: 'todo', position: 2 },
      { title: 'Task 4', status: 'in_progress', position: 0 },
      { title: 'Task 5', status: 'in_progress', position: 1 },
      { title: 'Task 6', status: 'done', position: 0 }
    ]).execute();

    return await db.select().from(tasksTable).orderBy(tasksTable.id).execute();
  };

  it('should move task within same column (moving down)', async () => {
    const tasks = await createTestTasks();
    const taskToMove = tasks[0]; // Task 1 at position 0

    const input: ReorderTasksInput = {
      taskId: taskToMove.id,
      newStatus: 'todo',
      newPosition: 2
    };

    const result = await reorderTasks(input);

    // Find the moved task
    const movedTask = result.find(t => t.id === taskToMove.id);
    expect(movedTask?.position).toBe(2);
    expect(movedTask?.status).toBe('todo');

    // Check that other tasks in the same column were adjusted
    const todoTasks = result.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position);
    expect(todoTasks[0].title).toBe('Task 2'); // Was position 1, now position 0
    expect(todoTasks[0].position).toBe(0);
    expect(todoTasks[1].title).toBe('Task 3'); // Was position 2, now position 1
    expect(todoTasks[1].position).toBe(1);
    expect(todoTasks[2].title).toBe('Task 1'); // Moved to position 2
    expect(todoTasks[2].position).toBe(2);
  });

  it('should move task within same column (moving up)', async () => {
    const tasks = await createTestTasks();
    const taskToMove = tasks[2]; // Task 3 at position 2

    const input: ReorderTasksInput = {
      taskId: taskToMove.id,
      newStatus: 'todo',
      newPosition: 0
    };

    const result = await reorderTasks(input);

    // Find the moved task
    const movedTask = result.find(t => t.id === taskToMove.id);
    expect(movedTask?.position).toBe(0);
    expect(movedTask?.status).toBe('todo');

    // Check that other tasks in the same column were adjusted
    const todoTasks = result.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position);
    expect(todoTasks[0].title).toBe('Task 3'); // Moved to position 0
    expect(todoTasks[0].position).toBe(0);
    expect(todoTasks[1].title).toBe('Task 1'); // Was position 0, now position 1
    expect(todoTasks[1].position).toBe(1);
    expect(todoTasks[2].title).toBe('Task 2'); // Was position 1, now position 2
    expect(todoTasks[2].position).toBe(2);
  });

  it('should move task between different columns', async () => {
    const tasks = await createTestTasks();
    const taskToMove = tasks[0]; // Task 1 from todo column

    const input: ReorderTasksInput = {
      taskId: taskToMove.id,
      newStatus: 'in_progress',
      newPosition: 1
    };

    const result = await reorderTasks(input);

    // Find the moved task
    const movedTask = result.find(t => t.id === taskToMove.id);
    expect(movedTask?.position).toBe(1);
    expect(movedTask?.status).toBe('in_progress');

    // Check that tasks in the old column were adjusted
    const todoTasks = result.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position);
    expect(todoTasks).toHaveLength(2);
    expect(todoTasks[0].title).toBe('Task 2'); // Was position 1, now position 0
    expect(todoTasks[0].position).toBe(0);
    expect(todoTasks[1].title).toBe('Task 3'); // Was position 2, now position 1
    expect(todoTasks[1].position).toBe(1);

    // Check that tasks in the new column were adjusted
    const inProgressTasks = result.filter(t => t.status === 'in_progress').sort((a, b) => a.position - b.position);
    expect(inProgressTasks).toHaveLength(3);
    expect(inProgressTasks[0].title).toBe('Task 4'); // Was position 0, still position 0
    expect(inProgressTasks[0].position).toBe(0);
    expect(inProgressTasks[1].title).toBe('Task 1'); // Moved task at position 1
    expect(inProgressTasks[1].position).toBe(1);
    expect(inProgressTasks[2].title).toBe('Task 5'); // Was position 1, now position 2
    expect(inProgressTasks[2].position).toBe(2);
  });

  it('should not change positions when moving to same position in same column', async () => {
    const tasks = await createTestTasks();
    const taskToMove = tasks[1]; // Task 2 at position 1

    const input: ReorderTasksInput = {
      taskId: taskToMove.id,
      newStatus: 'todo',
      newPosition: 1
    };

    const result = await reorderTasks(input);

    // All todo tasks should maintain their original positions
    const todoTasks = result.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position);
    expect(todoTasks[0].title).toBe('Task 1');
    expect(todoTasks[0].position).toBe(0);
    expect(todoTasks[1].title).toBe('Task 2');
    expect(todoTasks[1].position).toBe(1);
    expect(todoTasks[2].title).toBe('Task 3');
    expect(todoTasks[2].position).toBe(2);
  });

  it('should update the updated_at timestamp', async () => {
    const tasks = await createTestTasks();
    const taskToMove = tasks[0];
    const originalUpdatedAt = taskToMove.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: ReorderTasksInput = {
      taskId: taskToMove.id,
      newStatus: 'in_progress',
      newPosition: 0
    };

    const result = await reorderTasks(input);
    const updatedTask = result.find(t => t.id === taskToMove.id);

    expect(updatedTask?.updated_at).toBeInstanceOf(Date);
    expect(updatedTask?.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent task', async () => {
    await createTestTasks();

    const input: ReorderTasksInput = {
      taskId: 9999,
      newStatus: 'todo',
      newPosition: 0
    };

    await expect(reorderTasks(input)).rejects.toThrow(/task not found/i);
  });

  it('should return all tasks ordered by status and position', async () => {
    await createTestTasks();
    const tasks = await db.select().from(tasksTable).execute();
    const taskToMove = tasks[0];

    const input: ReorderTasksInput = {
      taskId: taskToMove.id,
      newStatus: 'done',
      newPosition: 0
    };

    const result = await reorderTasks(input);

    // Should return all tasks
    expect(result).toHaveLength(6);

    // Verify ordering by status and position
    const todoTasks = result.filter(t => t.status === 'todo');
    const inProgressTasks = result.filter(t => t.status === 'in_progress');
    const doneTasks = result.filter(t => t.status === 'done');

    // Check each group is properly ordered by position
    for (let i = 0; i < todoTasks.length - 1; i++) {
      expect(todoTasks[i].position).toBeLessThan(todoTasks[i + 1].position);
    }
    for (let i = 0; i < inProgressTasks.length - 1; i++) {
      expect(inProgressTasks[i].position).toBeLessThan(inProgressTasks[i + 1].position);
    }
    for (let i = 0; i < doneTasks.length - 1; i++) {
      expect(doneTasks[i].position).toBeLessThan(doneTasks[i + 1].position);
    }
  });
});
