'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';

interface LeaderboardUser {
  rank: number;
  userId: string;
  fullName: string;
  email: string;
  stats: {
    completionRate: number;
    completedTasks: number;
    totalTasks: number;
    averageQuizScore: number;
    passedQuizzes: number;
    totalAttempts: number;
  };
}

interface Group {
  id: string;
  name: string;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [metric, setMetric] = useState<'completion' | 'quiz-score'>('completion');
  const [scope, setScope] = useState<'org' | 'group'>('org');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeaderboard = async (
    selectedMetric: 'completion' | 'quiz-score',
    selectedScope: 'org' | 'group',
    selectedGroupId: string
  ) => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/leaderboard', {
        params: {
          metric: selectedMetric,
          limit: 50,
          scope: selectedScope,
          ...(selectedScope === 'group' ? { groupId: selectedGroupId } : {}),
        },
        withCredentials: true,
      });
      setLeaderboard(res.data.data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const res = await axios.get('/api/groups', { withCredentials: true });
        const list = res.data?.data?.groups;
        if (Array.isArray(list)) {
          setGroups(list);
          if (!groupId && list.length > 0) setGroupId(list[0].id);
        }
      } catch {
        // ignore
      }
    };

    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scope === 'group' && !groupId) {
      setLeaderboard([]);
      return;
    }
    fetchLeaderboard(metric, scope, groupId);
  }, [metric, scope, groupId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-gray-600 mt-2">View disciples progress and rankings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={scope === 'org' ? 'default' : 'outline'}
              onClick={() => setScope('org')}
            >
              Organization
            </Button>
            <Button
              variant={scope === 'group' ? 'default' : 'outline'}
              onClick={() => setScope('group')}
              disabled={groups.length === 0}
            >
              Group
            </Button>
          </div>

          {scope === 'group' && (
            <div className="max-w-sm">
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder={groups.length === 0 ? 'No groups' : 'Select group'} />
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

          <div className="flex flex-wrap gap-2">
            <Button
              variant={metric === 'completion' ? 'default' : 'outline'}
              onClick={() => setMetric('completion')}
            >
              Task Completion Rate
            </Button>
            <Button
              variant={metric === 'quiz-score' ? 'default' : 'outline'}
              onClick={() => setMetric('quiz-score')}
            >
              Quiz Scores
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Disciples</CardTitle>
          <CardDescription>
            {metric === 'completion'
              ? 'Ranked by task completion rate'
              : 'Ranked by average quiz score'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Rank</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Email</th>
                    {metric === 'completion' ? (
                      <>
                        <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">
                          Completion
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">
                          Tasks
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">
                          Avg Score
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">
                          Passed
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user) => (
                    <tr key={user.userId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-bold text-blue-600">#{user.rank}</td>
                      <td className="py-3 px-4 text-sm font-medium">{user.fullName}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                      {metric === 'completion' ? (
                        <>
                          <td className="py-3 px-4 text-sm font-medium">
                            {user.stats.completionRate}%
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {user.stats.completedTasks}/{user.stats.totalTasks}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-sm font-medium">
                            {user.stats.averageQuizScore}%
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {user.stats.passedQuizzes}/{user.stats.totalAttempts}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
