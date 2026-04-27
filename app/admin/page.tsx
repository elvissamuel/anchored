'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { ClipboardListIcon } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalTasks: number;
  totalQuizzes: number;
  activeUsers: number;
}

interface PendingSubmission {
  completionId: string;
  taskId: string;
  taskTitle: string;
  submittedAt: string | null;
  memberName: string;
  memberEmail: string;
}

interface OrganizationInfo {
  wordOfTheDay: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTasks: 0,
    totalQuizzes: 0,
    activeUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRecent, setPendingRecent] = useState<PendingSubmission[]>([]);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, tasksRes, quizzesRes, pendingRes, orgRes] = await Promise.all([
          axios.get('/api/users', { withCredentials: true }),
          axios.get('/api/tasks', { withCredentials: true }),
          axios.get('/api/quizzes', { withCredentials: true }),
          axios
            .get('/api/admin/pending-task-submissions', {
              withCredentials: true,
            })
            .catch(() => null),
          axios.get('/api/organization', { withCredentials: true }).catch(() => null),
        ]);

        setStats({
          totalUsers: usersRes.data.data.pagination.total,
          totalTasks: tasksRes.data.data.pagination.total,
          totalQuizzes: quizzesRes.data.data.pagination.total,
          activeUsers: Math.floor(usersRes.data.data.pagination.total * 0.7), // Estimate
        });
        if (pendingRes?.data?.data) {
          setPendingCount(pendingRes.data.data.count ?? 0);
          setPendingRecent(pendingRes.data.data.recent ?? []);
        }
        if (orgRes?.data?.data?.organization) {
          setOrganization({ wordOfTheDay: orgRes.data.data.organization.wordOfTheDay ?? null });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to the discipleship platform admin panel</p>
      </div>

      {!isLoading && organization?.wordOfTheDay ? (
        <div className="rounded-lg border border-accent bg-accent/20 p-4 md:p-5">
          <div className="text-xs uppercase tracking-wide text-primary font-semibold">
            Word for the Day
          </div>
          <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
            {organization.wordOfTheDay}
          </p>
        </div>
      ) : null}

      {!isLoading && pendingCount > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <ClipboardListIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-amber-950">
                  {pendingCount} pending task submission{pendingCount === 1 ? '' : 's'}
                </h2>
                <p className="text-sm text-amber-900/80 mt-1">
                  Members submitted responses waiting for your review and approval.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-amber-950/90">
                  {pendingRecent.slice(0, 5).map((p) => (
                    <li key={p.completionId}>
                      <Link
                        href={`/admin/tasks/${p.taskId}`}
                        className="font-medium hover:underline"
                      >
                        {p.taskTitle}
                      </Link>
                      <span className="text-amber-800/80">
                        {' '}
                        — {p.memberName}
                        {p.submittedAt
                          ? ` · ${new Date(p.submittedAt).toLocaleString()}`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                {pendingCount > pendingRecent.length ? (
                  <p className="text-xs text-amber-800/70 mt-2">
                    Showing latest {pendingRecent.length}. Open Tasks to find more.
                  </p>
                ) : null}
              </div>
            </div>
            <Button asChild variant="outline" className="border-amber-300 bg-white shrink-0">
              <Link href="/admin/tasks">Review tasks</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500 mt-2">Registered disciples</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-gray-500 mt-2">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-gray-500 mt-2">Daily assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalQuizzes}</div>
            <p className="text-xs text-gray-500 mt-2">Created quizzes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/tasks"
              className="block p-3 rounded border hover:bg-gray-50 transition relative"
            >
              <h3 className="font-medium text-sm">Manage Tasks</h3>
              <p className="text-xs text-gray-500">Create and review tasks for your organization</p>
              {!isLoading && pendingCount > 0 ? (
                <span className="absolute top-2 right-2 inline-flex min-w-[1.25rem] justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              ) : null}
            </Link>
            <a href="/admin/messages" className="block p-3 rounded border hover:bg-gray-50 transition">
              <h3 className="font-medium text-sm">Announcements</h3>
              <p className="text-xs text-gray-500">Broadcast updates to members</p>
            </a>
            <a href="/admin/groups" className="block p-3 rounded border hover:bg-gray-50 transition">
              <h3 className="font-medium text-sm">Groups</h3>
              <p className="text-xs text-gray-500">Create and manage groups and leaders</p>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Info</CardTitle>
            <CardDescription>System statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-medium">-</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Quiz Score</span>
              <span className="font-medium">-</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform Status</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
