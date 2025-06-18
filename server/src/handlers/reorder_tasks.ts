
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type ReorderTasksInput, type Task } from '../schema';
import { eq, gte, and, sql } from 'drizzle-orm';

export const reorderTasks = async (input: ReorderTasksInput): Promise<Task[]> => {
  try {
    const { taskId, newStatus, newPosition } = input;

    // Get the current task to check its current status
    const currentTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    if (!currentTask.length) {
      throw new Error('Task not found');
    }

    const task = currentTask[0];
    const oldStatus = task.status;

    // If moving within the same column, adjust positions accordingly
    if (oldStatus === newStatus) {
      if (task.position < newPosition) {
        // Moving down: decrement positions of tasks between old and new position
        await db.update(tasksTable)
          .set({ 
            position: sql`${tasksTable.position} - 1`,
            updated_at: new Date()
          })
          .where(
            and(
              eq(tasksTable.status, newStatus),
              gte(tasksTable.position, task.position + 1),
              sql`${tasksTable.position} <= ${newPosition}`
            )
          )
          .execute();
      } else if (task.position > newPosition) {
        // Moving up: increment positions of tasks between new and old position
        await db.update(tasksTable)
          .set({ 
            position: sql`${tasksTable.position} + 1`,
            updated_at: new Date()
          })
          .where(
            and(
              eq(tasksTable.status, newStatus),
              gte(tasksTable.position, newPosition),
              sql`${tasksTable.position} < ${task.position}`
            )
          )
          .execute();
      }
    } else {
      // Moving between columns
      // First, decrement positions of tasks after the old position in the old column
      await db.update(tasksTable)
        .set({ 
          position: sql`${tasksTable.position} - 1`,
          updated_at: new Date()
        })
        .where(
          and(
            eq(tasksTable.status, oldStatus),
            gte(tasksTable.position, task.position + 1)
          )
        )
        .execute();

      // Then, increment positions of tasks at or after the new position in the new column
      await db.update(tasksTable)
        .set({ 
          position: sql`${tasksTable.position} + 1`,
          updated_at: new Date()
        })
        .where(
          and(
            eq(tasksTable.status, newStatus),
            gte(tasksTable.position, newPosition)
          )
        )
        .execute();
    }

    // Update the moved task with new status and position
    await db.update(tasksTable)
      .set({
        status: newStatus,
        position: newPosition,
        updated_at: new Date()
      })
      .where(eq(tasksTable.id, taskId))
      .execute();

    // Return all tasks ordered by status and position
    const allTasks = await db.select()
      .from(tasksTable)
      .orderBy(tasksTable.status, tasksTable.position)
      .execute();

    return allTasks;
  } catch (error) {
    console.error('Task reorder failed:', error);
    throw error;
  }
};
