
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task } from '../schema';
import { asc } from 'drizzle-orm';

export const getTasks = async (): Promise<Task[]> => {
  try {
    const results = await db.select()
      .from(tasksTable)
      .orderBy(asc(tasksTable.position))
      .execute();

    return results.map(task => ({
      ...task,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));
  } catch (error) {
    console.error('Getting tasks failed:', error);
    throw error;
  }
};
