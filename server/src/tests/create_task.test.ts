
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test inputs
const basicTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  status: 'todo'
};

const minimalTaskInput: CreateTaskInput = {
  title: 'Minimal Task',
  status: 'todo'
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    const result = await createTask(basicTaskInput);

    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.status).toEqual('todo');
    expect(result.position).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with minimal fields', async () => {
    const result = await createTask(minimalTaskInput);

    expect(result.title).toEqual('Minimal Task');
    expect(result.description).toBeNull();
    expect(result.status).toEqual('todo'); // Default status
    expect(result.position).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save task to database', async () => {
    const result = await createTask(basicTaskInput);

    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing');
    expect(tasks[0].status).toEqual('todo');
    expect(tasks[0].position).toEqual(0);
  });

  it('should assign correct positions for multiple tasks', async () => {
    // Create first task
    const task1 = await createTask({ title: 'First Task', status: 'todo' });
    expect(task1.position).toEqual(0);

    // Create second task in same status
    const task2 = await createTask({ title: 'Second Task', status: 'todo' });
    expect(task2.position).toEqual(1);

    // Create task in different status - should start at position 0
    const task3 = await createTask({ title: 'Third Task', status: 'in_progress' });
    expect(task3.position).toEqual(0);

    // Create another task in original status - should continue incrementing
    const task4 = await createTask({ title: 'Fourth Task', status: 'todo' });
    expect(task4.position).toEqual(2);
  });

  it('should handle different task statuses', async () => {
    const todoTask = await createTask({ title: 'Todo Task', status: 'todo' });
    expect(todoTask.status).toEqual('todo');

    const inProgressTask = await createTask({ title: 'In Progress Task', status: 'in_progress' });
    expect(inProgressTask.status).toEqual('in_progress');

    const doneTask = await createTask({ title: 'Done Task', status: 'done' });
    expect(doneTask.status).toEqual('done');
  });
});
