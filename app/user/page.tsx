'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import {
  BookOpenIcon,
  CheckCircle2Icon,
  ClockIcon,
  TrophyIcon,
  BookOpenCheckIcon,
  BellIcon,
  ArrowRightIcon,
} from 'lucide-react';

type DashboardTask = {
  id: string;
  title: string;
  type: 'DAILY' | 'ASSIGNMENT' | 'POINTS';
  points: number;
  completions: Array<{ submittedAt: string | null; completed: boolean }>;
};

type DashboardAnnouncement = {
  id: string;
  title: string;
  message: string;
  type: 'MESSAGE' | 'ANNOUNCEMENT' | 'REMINDER' | 'UPDATE';
  createdAt: string;
  read: boolean;
};

type DashboardData = {
  user: { fullName: string };
  stats: {
    activeTasks: number;
    pendingTasks: number;
    completedTasks: number;
    points: number;
  };
  pendingTasks: DashboardTask[];
  announcements: DashboardAnnouncement[];
  wordOfTheDay: string | null;
};

export default function UserDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('/api/user/dashboard', { withCredentials: true });
        setData(res.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  };

  const typeMeta = (type: DashboardTask['type']) => {
    switch (type) {
      case 'ASSIGNMENT':
        return {
          label: 'Assignment',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          iconWrap: 'bg-amber-50',
          icon: BookOpenCheckIcon,
        };
      case 'POINTS':
        return {
          label: 'Points',
          badgeClass: 'bg-red-100 text-red-800 border-red-200',
          iconWrap: 'bg-red-50',
          icon: TrophyIcon,
        };
      case 'DAILY':
      default:
        return {
          label: 'Daily Task',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          iconWrap: 'bg-blue-50',
          icon: BookOpenIcon,
        };
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-600">{greeting()}</p>
        <h1 className="text-3xl font-bold">{data?.user.fullName || 'Disciple'}</h1>
        <p className="text-gray-600 mt-2">Keep growing in faith — one step at a time.</p>
      </div>

      {!isLoading && data?.wordOfTheDay ? (
        <Card className="border-accent bg-accent/20">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-primary font-semibold">
              Word for the Day
            </div>
            <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
              {data.wordOfTheDay}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading your dashboard...</div>
      ) : !data ? (
        <div className="text-center py-8 text-gray-500">Unable to load dashboard.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <BookOpenIcon className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-bold">{data.stats.activeTasks}</div>
                <div className="text-xs text-gray-500 mt-1">Active Tasks</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <ClockIcon className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-bold">{data.stats.pendingTasks}</div>
                <div className="text-xs text-gray-500 mt-1">Pending</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <CheckCircle2Icon className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-bold">{data.stats.completedTasks}</div>
                <div className="text-xs text-gray-500 mt-1">Completed</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <TrophyIcon className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-bold">{data.stats.points}</div>
                <div className="text-xs text-gray-500 mt-1">Points</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pending Tasks</h2>
              <Link href="/user/tasks" className="text-sm text-gray-600 hover:underline flex items-center gap-2">
                View All
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              {data.pendingTasks.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No pending tasks.</div>
              ) : (
                <div className="divide-y">
                  {data.pendingTasks.map((t) => {
                    const meta = typeMeta(t.type);
                    const Icon = meta.icon;
                    return (
                      <Link
                        key={t.id}
                        href={`/user/tasks/${t.id}`}
                        className="block p-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${meta.iconWrap}`}>
                              <Icon className="h-5 w-5 text-gray-700" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{t.title}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={meta.badgeClass}>
                                  {meta.label}
                                </Badge>
                                <span className="text-xs text-gray-500">{t.points} pts</span>
                              </div>
                            </div>
                          </div>
                          <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Announcements</h2>
              <Link href="/user/messages" className="text-sm text-gray-600 hover:underline flex items-center gap-2">
                View All
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              {data.announcements.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No announcements.</div>
              ) : (
                <div className="divide-y">
                  {data.announcements.map((a) => (
                    <Link
                      key={a.id}
                      href="/user/messages"
                      className="block p-4 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center">
                            <BellIcon className="h-5 w-5 text-gray-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-sm truncate">{a.title}</div>
                              {a.type === 'ANNOUNCEMENT' && (
                                <Badge className="bg-red-600 text-white">Important</Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(a.createdAt).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-700 mt-2 line-clamp-2">
                              {a.message}
                            </div>
                          </div>
                        </div>
                        <ArrowRightIcon className="h-4 w-4 text-gray-400 mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
