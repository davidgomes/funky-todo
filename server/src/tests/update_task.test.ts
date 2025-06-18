
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Helper to create a test task
const createTestTask = async () => {
  const result = await db.insert(tasksTable)
    .values({
      title: 'Original Task',
      description: 'Original description',
      status: 'todo',
      position: 1
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update task title', async () => {
    const testTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'Updated Task Title'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(testTask.id);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.status).toEqual('todo'); // Unchanged
    expect(result.position).toEqual(1); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testTask.updated_at).toBe(true);
  });

  it('should update task status', async () => {
    const testTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      status: 'in_progress'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(testTask.id);
    expect(result.title).toEqual('Original Task'); // Unchanged
    expect(result.status).toEqual('in_progress');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testTask.updated_at).toBe(true);
  });

  it('should update task position', async () => {
    const testTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      position: 5
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(testTask.id);
    expect(result.position).toEqual(5);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testTask.updated_at).toBe(true);
  });

  it('should update task description to null', async () => {
    const testTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      description: null
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(testTask.id);
    expect(result.description).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testTask.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const testTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'Multi-field Update',
      status: 'done',
      position: 10,
      description: 'Updated description'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(testTask.id);
    expect(result.title).toEqual('Multi-field Update');
    expect(result.status).toEqual('done');
    expect(result.position).toEqual(10);
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testTask.updated_at).toBe(true);
  });

  it('should save updated task to database', async () => {
    const testTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'Database Persistence Test',
      status: 'in_progress'
    };

    await updateTask(updateInput);

    // Verify the changes were persisted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTask.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Persistence Test');
    expect(tasks[0].status).toEqual('in_progress');
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at > testTask.updated_at).toBe(true);
  });

  it('should throw error for non-existent task', async () => {
    const updateInput: UpdateTaskInput = {
      id: 99999,
      title: 'Non-existent Task'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should preserve created_at timestamp', async () => {
    const testTask = await createTestTask();
    
    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'Created At Test'
    };

    const result = await updateTask(updateInput);

    expect(result.created_at).toEqual(testTask.created_at);
    expect(result.updated_at > testTask.updated_at).toBe(true);
  });
});
