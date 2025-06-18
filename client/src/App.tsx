import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../../server/src/schema';

// Draggable task card component using HTML5 drag API
function DraggableTaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onDragStart, 
  onDragEnd,
  isDragging 
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id.toString());
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(task);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  return (
    <div 
      draggable 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <Card className="bg-white/95 backdrop-blur-sm border-none shadow-lg hover:shadow-xl transition-all transform hover:scale-105 cursor-grab active:cursor-grabbing">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg text-gray-800">{task.title}</h3>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="text-blue-600 hover:bg-blue-100 p-1 h-8 w-8"
              >
                ✏️
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="text-red-600 hover:bg-red-100 p-1 h-8 w-8"
              >
                🗑️
              </Button>
            </div>
          </div>
          
          {task.description && (
            <p className="text-gray-600 text-sm mb-3">{task.description}</p>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            📅 Created: {task.created_at.toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Droppable column component
function DroppableColumn({ 
  status, 
  tasks, 
  onEditTask, 
  onDeleteTask,
  onDrop,
  isDragOver,
  onDragStart,
  onDragEnd,
  draggedTaskId
}: {
  status: TaskStatus;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onDrop: (status: TaskStatus, position: number) => void;
  isDragOver: boolean;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  draggedTaskId: number | null;
}) {
  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return { 
          title: '📝 To Do', 
          bgColor: 'bg-gradient-to-br from-pink-400 to-purple-600',
          badgeColor: 'bg-pink-500'
        };
      case 'in_progress':
        return { 
          title: '🚀 In Progress', 
          bgColor: 'bg-gradient-to-br from-yellow-400 to-orange-500',
          badgeColor: 'bg-yellow-500'
        };
      case 'done':
        return { 
          title: '✨ Done', 
          bgColor: 'bg-gradient-to-br from-green-400 to-teal-500',
          badgeColor: 'bg-green-500'
        };
    }
  };

  const config = getStatusConfig(status);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const position = tasks.length; // Add to end of column
    onDrop(status, position);
  };

  const handleTaskDrop = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(status, targetPosition);
  };

  return (
    <div className="space-y-4">
      <div className={`${config.bgColor} rounded-2xl p-4 shadow-xl`}>
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          {config.title}
        </h2>
        <Badge className={`${config.badgeColor} text-white font-bold px-3 py-1 rounded-full`}>
          {tasks.length} tasks
        </Badge>
      </div>
      
      <div 
        className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
          isDragOver ? 'bg-white/20 border-2 border-dashed border-white/50' : ''
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {tasks.map((task: Task, index: number) => (
          <div key={task.id}>
            <div
              className="min-h-[2px] transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleTaskDrop(e, index)}
            />
            <DraggableTaskCard
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggedTaskId === task.id}
            />
          </div>
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-white/70 bg-white/10 rounded-lg border-2 border-dashed border-white/30">
            <p className="text-4xl mb-2">🌟</p>
            <p>Drop tasks here!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  
  // Form state for creating new tasks
  const [newTaskForm, setNewTaskForm] = useState<CreateTaskInput>({
    title: '',
    description: null,
    status: 'todo'
  });

  // Form state for editing tasks
  const [editForm, setEditForm] = useState<UpdateTaskInput>({
    id: 0,
    title: '',
    description: null,
    status: 'todo'
  });

  const loadTasks = useCallback(async () => {
    try {
      const result = await trpc.getTasks.query();
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;
    
    setIsLoading(true);
    try {
      const newTask = await trpc.createTask.mutate(newTaskForm);
      setTasks((prev: Task[]) => [...prev, newTask]);
      setNewTaskForm({ title: '', description: null, status: 'todo' });
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title?.trim()) return;
    
    setIsLoading(true);
    try {
      const updatedTask = await trpc.updateTask.mutate(editForm);
      setTasks((prev: Task[]) => 
        prev.map((task: Task) => task.id === updatedTask.id ? updatedTask : task)
      );
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await trpc.deleteTask.mutate({ id: taskId });
      setTasks((prev: Task[]) => prev.filter((task: Task) => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const openEditDialog = (task: Task) => {
    setEditForm({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status
    });
    setIsDialogOpen(true);
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks
      .filter((task: Task) => task.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDrop = async (targetStatus: TaskStatus, targetPosition: number) => {
    if (!draggedTask) return;

    // If dropping in the same position, do nothing
    if (draggedTask.status === targetStatus && draggedTask.position === targetPosition) {
      return;
    }

    // Store original state for potential rollback
    const originalTasks = [...tasks];

    try {
      // Optimistic update: immediately update the UI
      const updatedTasks = [...tasks];
      const taskIndex = updatedTasks.findIndex(task => task.id === draggedTask.id);
      
      if (taskIndex !== -1) {
        // Update the task's status
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          status: targetStatus,
          position: targetPosition
        };

        // Reorder all tasks to maintain continuous positions
        const reorderedTasks = reorderTaskPositions(updatedTasks);
        setTasks(reorderedTasks);
      }

      // Call backend to persist the change
      const reorderedTasks = await trpc.reorderTasks.mutate({
        taskId: draggedTask.id,
        newStatus: targetStatus,
        newPosition: targetPosition
      });
      
      // Update with authoritative data from backend
      setTasks(reorderedTasks);
    } catch (error) {
      console.error('Failed to reorder tasks:', error);
      // Rollback on error
      setTasks(originalTasks);
    } finally {
      setDraggedTask(null);
      setDragOverColumn(null);
    }
  };

  // Helper function to reorder task positions within each status
  const reorderTaskPositions = (taskList: Task[]): Task[] => {
    const statusGroups: { [key in TaskStatus]: Task[] } = {
      todo: [],
      in_progress: [],
      done: []
    };

    // Group tasks by status
    taskList.forEach(task => {
      statusGroups[task.status].push(task);
    });

    // Sort each group by position and reassign continuous positions
    Object.keys(statusGroups).forEach(status => {
      const statusKey = status as TaskStatus;
      statusGroups[statusKey].sort((a, b) => a.position - b.position);
      statusGroups[statusKey].forEach((task, index) => {
        task.position = index;
      });
    });

    // Flatten back to single array
    return [
      ...statusGroups.todo,
      ...statusGroups.in_progress,
      ...statusGroups.done
    ];
  };

  // Global drag event listeners
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      setDraggedTask(null);
      setDragOverColumn(null);
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Funky Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 mb-4">
            🎨 FUNKY TODO 🎨
          </h1>
          <p className="text-xl text-purple-200 font-semibold">
            Organize your chaos in style! ✨ Drag and drop to reorder! 🎯
          </p>
        </div>

        {/* Create Task Form */}
        <Card className="mb-8 bg-gradient-to-r from-purple-800 to-pink-800 border-none shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white font-bold">
              🌟 Add New Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <Input
                placeholder="✏️ What needs to be done?"
                value={newTaskForm.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewTaskForm((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
                }
                className="bg-white/20 border-white/30 text-white placeholder:text-purple-200 text-lg"
                required
              />
              <Textarea
                placeholder="📝 Add some details (optional)"
                value={newTaskForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setNewTaskForm((prev: CreateTaskInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
              />
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-lg px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all"
              >
                {isLoading ? '🔄 Creating...' : '🚀 Create Task'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Kanban Board with Drag and Drop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((status: TaskStatus) => (
            <DroppableColumn
              key={status}
              status={status}
              tasks={getTasksByStatus(status)}
              onEditTask={openEditDialog}
              onDeleteTask={handleDeleteTask}
              onDrop={handleDrop}
              isDragOver={dragOverColumn === status}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              draggedTaskId={draggedTask?.id || null}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        {draggedTask && (
          <div className="fixed top-4 right-4 z-50 pointer-events-none">
            <Card className="bg-white/95 backdrop-blur-sm border-none shadow-2xl transform rotate-3 scale-105">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg text-gray-800">{draggedTask.title}</h3>
                {draggedTask.description && (
                  <p className="text-gray-600 text-sm mt-2">{draggedTask.description}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Task Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-gradient-to-br from-purple-600 to-pink-600 border-none text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                ✏️ Edit Task
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditTask} className="space-y-4">
              <Input
                placeholder="Task title"
                value={editForm.title || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: UpdateTaskInput) => ({ ...prev, title: e.target.value }))
                }
                className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
                required
              />
              <Textarea
                placeholder="Task description (optional)"
                value={editForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditForm((prev: UpdateTaskInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                className="bg-white/20 border-white/30 text-white placeholder:text-purple-200"
              />
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold"
                >
                  {isLoading ? '🔄 Saving...' : '💾 Save Changes'}
                </Button>
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={() => setIsDialogOpen(false)}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  ❌ Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;