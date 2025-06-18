
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { sql } from 'drizzle-orm';

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  try {
    // Get the highest position for the specified status (or default 'todo')
    const status = input.status || 'todo';
    
    const maxPositionResult = await db
      .select({ maxPosition: sql<number>`COALESCE(MAX(${tasksTable.position}), -1)` })
      .from(tasksTable)
      .where(sql`${tasksTable.status} = ${status}`)
      .execute();
    
    const nextPosition = (maxPositionResult[0]?.maxPosition ?? -1) + 1;

    // Insert the new task
    const result = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description ?? null,
        status: status,
        position: nextPosition
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};
