
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type DeleteTaskInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task', async () => {
    // Create a test task first
    const createResult = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task to be deleted',
        status: 'todo',
        position: 1
      })
      .returning()
      .execute();

    const taskId = createResult[0].id;

    // Delete the task
    const input: DeleteTaskInput = { id: taskId };
    const result = await deleteTask(input);

    expect(result.success).toBe(true);

    // Verify task was deleted from database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent task', async () => {
    const input: DeleteTaskInput = { id: 999 };
    const result = await deleteTask(input);

    expect(result.success).toBe(false);
  });

  it('should not affect other tasks when deleting one task', async () => {
    // Create multiple test tasks
    const createResults = await db.insert(tasksTable)
      .values([
        { title: 'Task 1', status: 'todo', position: 1 },
        { title: 'Task 2', status: 'in_progress', position: 2 },
        { title: 'Task 3', status: 'done', position: 3 }
      ])
      .returning()
      .execute();

    const taskToDelete = createResults[1].id; // Delete middle task

    // Delete one task
    const input: DeleteTaskInput = { id: taskToDelete };
    const result = await deleteTask(input);

    expect(result.success).toBe(true);

    // Verify other tasks still exist
    const remainingTasks = await db.select()
      .from(tasksTable)
      .execute();

    expect(remainingTasks).toHaveLength(2);
    expect(remainingTasks.map(t => t.title)).toEqual(['Task 1', 'Task 3']);
  });
});
