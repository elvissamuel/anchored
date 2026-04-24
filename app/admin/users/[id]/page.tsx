'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpenIcon,
  CheckCircle2Icon,
  ClockIcon,
  FlameIcon,
  ListChecksIcon,
  SendIcon,
  TrophyIcon,
} from 'lucide-react';

type OrgRole = 'ADMIN' | 'GROUP_LEADER' | 'MEMBER';

interface UserReportResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    orgRole: OrgRole;
    joinedAt: string;
  };
  report: {
    tasks: {
      completionRecords: number;
      tasksSubmitted: number;
      tasksMarkedComplete: number;
      awaitingApproval: number;
      completionRate: number;
      pointsEarned: number;
    };
    engagement: {
      currentStreakDays: number;
      longestStreakDays: number;
      lastActivityAt: string | null;
    };
    quizzes: {
      attemptsTotal: number;
      attemptsSubmitted: number;
      attemptsPassed: number;
      quizPassRate: number;
      averageQuizScore: number;
      bestQuizScore: number;
      distinctQuizzesPassed: number;
    };
  };
  recentActivity: {
    tasks: Array<{
      taskId: string;
      title: string;
      type: string;
      points: number;
      completed: boolean;
      submittedAt: string | null;
      updatedAt: string;
    }>;
    quizzes: Array<{
      id: string;
      quizId: string;
      title: string;
      score: number;
      passed: boolean;
      passingScore: number;
      submittedAt: string | null;
      startedAt: string;
    }>;
  };
}

function formatDt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function AdminUserReportPage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id;

  const [data, setData] = useState<UserReportResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/users/${userId}`, {
          withCredentials: true,
        });
        if (!cancelled) setData(res.data.data);
      } catch (e: unknown) {
        const msg =
          axios.isAxiosError(e) && e.response?.data?.error
            ? String(e.response.data.error)
            : 'Failed to load user report';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const fullName = useMemo(() => {
    if (!data) return '';
    return `${data.user.firstName} ${data.user.lastName}`.trim();
  }, [data]);

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading report…</div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/users" className="text-sm text-gray-600 hover:underline">
          ← Back to users
        </Link>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error || 'User not found.'}
        </div>
      </div>
    );
  }

  const { user, report, recentActivity } = data;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/users" className="text-sm text-gray-600 hover:underline">
          ← Back to users
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{fullName}</h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
              <Badge variant="outline">{user.orgRole.replace('_', ' ')}</Badge>
              <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task submissions</CardTitle>
            <SendIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.tasks.tasksSubmitted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Responses or submissions recorded · {report.tasks.completionRecords} task
              {report.tasks.completionRecords === 1 ? '' : 's'} tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks completed</CardTitle>
            <CheckCircle2Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.tasks.tasksMarkedComplete}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved / marked complete ({report.tasks.completionRate}% of tracked tasks)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting review</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.tasks.awaitingApproval}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted, not yet approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points earned</CardTitle>
            <TrophyIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.tasks.pointsEarned}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From completed tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity streak</CardTitle>
            <FlameIcon className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.engagement.currentStreakDays} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current (tasks or quizzes, UTC). Best: {report.engagement.longestStreakDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last activity</CardTitle>
            <ListChecksIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {formatDt(report.engagement.lastActivityAt)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Most recent submission or completion
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5" />
            Quiz performance
          </CardTitle>
          <CardDescription>Organization quizzes only</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Attempts (all)</div>
              <div className="text-lg font-semibold">{report.quizzes.attemptsTotal}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Submitted</div>
              <div className="text-lg font-semibold">{report.quizzes.attemptsSubmitted}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Passed</div>
              <div className="text-lg font-semibold">{report.quizzes.attemptsPassed}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Pass rate</div>
              <div className="text-lg font-semibold">{report.quizzes.quizPassRate}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Average score</div>
              <div className="text-lg font-semibold">{report.quizzes.averageQuizScore}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Best score</div>
              <div className="text-lg font-semibold">{report.quizzes.bestQuizScore}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Quizzes passed (distinct)</div>
              <div className="text-lg font-semibold">{report.quizzes.distinctQuizzesPassed}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent tasks</CardTitle>
            <CardDescription>Latest task activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No task records yet.</p>
            ) : (
              recentActivity.tasks.map((t) => (
                <div
                  key={t.taskId}
                  className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
                >
                  <div className="font-medium">{t.title}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {t.type}
                    </Badge>
                    <span>{t.points} pts</span>
                    {t.completed ? (
                      <span className="text-green-700">Completed</span>
                    ) : t.submittedAt ? (
                      <span className="text-amber-700">Submitted</span>
                    ) : (
                      <span>In progress</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {formatDt(t.updatedAt)}
                    {t.submittedAt ? ` · Submitted ${formatDt(t.submittedAt)}` : ''}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent quizzes</CardTitle>
            <CardDescription>Latest attempts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.quizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
            ) : (
              recentActivity.quizzes.map((q) => (
                <div
                  key={q.id}
                  className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
                >
                  <div className="font-medium">{q.title}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>
                      Score {Math.round(q.score)}% (pass {q.passingScore}%)
                    </span>
                    {q.passed ? (
                      <span className="text-green-700">Passed</span>
                    ) : q.submittedAt ? (
                      <span className="text-red-700">Not passed</span>
                    ) : (
                      <span>In progress</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {q.submittedAt
                      ? `Submitted ${formatDt(q.submittedAt)}`
                      : `Started ${formatDt(q.startedAt)}`}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
