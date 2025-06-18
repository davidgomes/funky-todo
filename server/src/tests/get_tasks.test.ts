
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();
    expect(result).toEqual([]);
  });

  it('should return all tasks ordered by position', async () => {
    // Create test tasks with different positions
    await db.insert(tasksTable)
      .values([
        {
          title: 'Task 3',
          description: 'Third task',
          status: 'done',
          position: 3
        },
        {
          title: 'Task 1',
          description: 'First task',
          status: 'todo',
          position: 1
        },
        {
          title: 'Task 2',
          description: null,
          status: 'in_progress',
          position: 2
        }
      ])
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(3);
    
    // Verify tasks are ordered by position
    expect(result[0].title).toEqual('Task 1');
    expect(result[0].position).toEqual(1);
    expect(result[0].status).toEqual('todo');
    
    expect(result[1].title).toEqual('Task 2');
    expect(result[1].position).toEqual(2);
    expect(result[1].status).toEqual('in_progress');
    expect(result[1].description).toBeNull();
    
    expect(result[2].title).toEqual('Task 3');
    expect(result[2].position).toEqual(3);
    expect(result[2].status).toEqual('done');
  });

  it('should return tasks with correct field types', async () => {
    await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'Test description',
        status: 'todo',
        position: 1
      })
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    const task = result[0];
    
    expect(typeof task.id).toBe('number');
    expect(typeof task.title).toBe('string');
    expect(typeof task.description).toBe('string');
    expect(task.status).toBe('todo');
    expect(typeof task.position).toBe('number');
    expect(task.created_at).toBeInstanceOf(Date);
    expect(task.updated_at).toBeInstanceOf(Date);
  });

  it('should handle tasks with null descriptions', async () => {
    await db.insert(tasksTable)
      .values({
        title: 'Task without description',
        description: null,
        status: 'in_progress',
        position: 1
      })
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Task without description');
    expect(result[0].description).toBeNull();
    expect(result[0].status).toEqual('in_progress');
  });
});
