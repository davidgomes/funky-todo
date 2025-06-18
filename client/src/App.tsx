
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../../server/src/schema';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      const updatedTask = await trpc.updateTask.mutate({
        id: task.id,
        status: newStatus
      });
      setTasks((prev: Task[]) => 
        prev.map((t: Task) => t.id === updatedTask.id ? updatedTask : t)
      );
    } catch (error) {
      console.error('Failed to update task status:', error);
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
    return tasks.filter((task: Task) => task.status === status);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Funky Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 mb-4">
            🎨 FUNKY TODO 🎨
          </h1>
          <p className="text-xl text-purple-200 font-semibold">
            Organize your chaos in style! ✨
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

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((status: TaskStatus) => {
            const config = getStatusConfig(status);
            const statusTasks = getTasksByStatus(status);
            
            return (
              <div key={status} className="space-y-4">
                <div className={`${config.bgColor} rounded-2xl p-4 shadow-xl`}>
                  <h2 className="text-2xl font-bold text-white mb-4 text-center">
                    {config.title}
                  </h2>
                  <Badge className={`${config.badgeColor} text-white font-bold px-3 py-1 rounded-full`}>
                    {statusTasks.length} tasks
                  </Badge>
                </div>
                
                <div className="space-y-3 min-h-[200px]">
                  {statusTasks.map((task: Task) => (
                    <Card 
                      key={task.id} 
                      className="bg-white/95 backdrop-blur-sm border-none shadow-lg hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-gray-800">{task.title}</h3>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(task)}
                              className="text-blue-600 hover:bg-blue-100 p-1 h-8 w-8"
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-600 hover:bg-red-100 p-1 h-8 w-8"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                        
                        {task.description && (
                          <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                        )}
                        
                        <div className="flex gap-2 flex-wrap">
                          {status !== 'todo' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(task, 'todo')}
                              className="bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1 rounded-full"
                            >
                              📝 To Do
                            </Button>
                          )}
                          {status !== 'in_progress' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(task, 'in_progress')}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-3 py-1 rounded-full"
                            >
                              🚀 In Progress
                            </Button>
                          )}
                          {status !== 'done' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(task, 'done')}
                              className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-full"
                            >
                              ✨ Done
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          📅 Created: {task.created_at.toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {statusTasks.length === 0 && (
                    <div className="text-center py-8 text-white/70">
                      <p className="text-4xl mb-2">🌟</p>
                      <p>No tasks here yet!</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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
