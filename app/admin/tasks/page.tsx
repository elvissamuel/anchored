'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';

interface Task {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  resourceUrl: string | null;
  dueDate: string | null;
  createdAt: string;
  completions: any[];
}

interface Group {
  id: string;
  name: string;
}

interface OrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    resourceUrl: '',
    dueDate: '',
    assignScope: 'ORG' as 'ORG' | 'GROUP' | 'USER',
    groupId: '',
    assignedToUserId: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTasks = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/tasks', {
        params: { page: pageNum, limit: 10 },
        withCredentials: true,
      });
      setTasks(res.data.data.tasks);
      setTotalPages(res.data.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(1);

    const fetchMeta = async () => {
      try {
        const [groupsRes, usersRes] = await Promise.all([
          axios.get('/api/groups', { withCredentials: true }),
          axios.get('/api/users', {
            params: { page: 1, limit: 500 },
            withCredentials: true,
          }),
        ]);
        setGroups(groupsRes.data.data.groups);
        setUsers(usersRes.data.data.users);
      } catch (e) {
        // ignore
      }
    };

    fetchMeta();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        '/api/tasks',
        {
          ...formData,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        },
        { withCredentials: true }
      );
      setFormData({
        title: '',
        description: '',
        content: '',
        resourceUrl: '',
        dueDate: '',
        assignScope: 'ORG',
        groupId: '',
        assignedToUserId: '',
      });
      setShowForm(false);
      fetchTasks(1);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`/api/tasks/${id}`, { withCredentials: true });
      fetchTasks(page);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-gray-600 mt-2">Create and manage daily tasks for disciples</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create Task'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  placeholder="Task title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Short description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Detailed content/instructions"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Resource link</label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=… or any URL"
                  value={formData.resourceUrl}
                  onChange={(e) => setFormData({ ...formData, resourceUrl: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  YouTube links are embedded for members; other links open in a new tab.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium">Assign To</label>
                  <Select
                    value={formData.assignScope}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        assignScope: v as any,
                        groupId: '',
                        assignedToUserId: '',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORG">Entire organization</SelectItem>
                      <SelectItem value="GROUP">A group</SelectItem>
                      <SelectItem value="USER">An individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.assignScope === 'GROUP' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Group</label>
                    <Select
                      value={formData.groupId}
                      onValueChange={(v) => setFormData({ ...formData, groupId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.assignScope === 'USER' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">User</label>
                    <Select
                      value={formData.assignedToUserId}
                      onValueChange={(v) => setFormData({ ...formData, assignedToUserId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                Create Task
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tasks List</CardTitle>
          <CardDescription>Total: {tasks.length} tasks on this page</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No tasks created yet</div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <a
                  key={task.id}
                  href={`/admin/tasks/${task.id}`}
                  className="block border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-base">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span>Completions: {task.completions.filter(c => c.completed).length}</span>
                        {task.dueDate && (
                          <span>
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </a>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setPage(p => Math.max(1, p - 1));
                  fetchTasks(Math.max(1, page - 1));
                }}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  setPage(p => Math.min(totalPages, p + 1));
                  fetchTasks(Math.min(totalPages, page + 1));
                }}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
