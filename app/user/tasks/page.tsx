'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { BookOpenIcon, ClipboardListIcon, TrophyIcon } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  dueDate: string | null;
  type?: 'DAILY' | 'ASSIGNMENT' | 'POINTS';
  points?: number;
  createdAt: string;
  completions: Array<{
    completed: boolean;
    submittedAt?: string | null;
  }>;
}

export default function UserTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
  }, []);

  const completedCount = tasks.filter((t) => t.completions[0]?.completed).length;
  const pendingTasks = tasks.filter((t) => !t.completions[0]?.completed);
  const completedTasks = tasks.filter((t) => t.completions[0]?.completed);

  const taskTypeMeta = (type?: Task['type']) => {
    switch (type) {
      case 'ASSIGNMENT':
        return { label: 'Assignment', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', icon: ClipboardListIcon };
      case 'POINTS':
        return { label: 'Points', badgeClass: 'bg-red-100 text-red-800 border-red-200', icon: TrophyIcon };
      case 'DAILY':
      default:
        return { label: 'Daily Task', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200', icon: BookOpenIcon };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <p className="text-gray-600 mt-2">Complete your tasks to grow and earn points.</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading tasks...</div>
          ) : pendingTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No pending tasks.</div>
          ) : (
            pendingTasks.map((task) => {
              const meta = taskTypeMeta(task.type);
              const Icon = meta.icon;
              const submissionState = task.completions[0]?.submittedAt ? 'Submitted' : 'Pending';
              return (
                <Link key={task.id} href={`/user/tasks/${task.id}`} className="block">
                  <Card className="hover:bg-gray-50 transition">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-gray-700" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="font-medium text-base truncate">{task.title}</h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{submissionState}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className={meta.badgeClass}>
                              {meta.label}
                            </Badge>
                            {typeof task.points === 'number' && (
                              <span className="text-xs text-gray-600">{task.points} pts</span>
                            )}
                            {task.dueDate && (
                              <span className="text-xs text-gray-500">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading tasks...</div>
          ) : completedTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No completed tasks yet.</div>
          ) : (
            completedTasks.map((task) => {
              const meta = taskTypeMeta(task.type);
              const Icon = meta.icon;
              return (
                <Link key={task.id} href={`/user/tasks/${task.id}`} className="block">
                  <Card className="hover:bg-gray-50 transition">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-gray-700" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="font-medium text-base truncate">{task.title}</h3>
                            <span className="text-xs text-green-700 whitespace-nowrap">Completed</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className={meta.badgeClass}>
                              {meta.label}
                            </Badge>
                            {typeof task.points === 'number' && (
                              <span className="text-xs text-gray-600">{task.points} pts</span>
                            )}
                            {task.dueDate && (
                              <span className="text-xs text-gray-500">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm"
            onClick={() => {
              setPage(p => Math.max(1, p - 1));
              fetchTasks(Math.max(1, page - 1));
            }}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="flex items-center px-4 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm"
            onClick={() => {
              setPage(p => Math.min(totalPages, p + 1));
              fetchTasks(Math.min(totalPages, page + 1));
            }}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
