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

export default function UserLeaderboardPage() {
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
          limit: 20,
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
        const res = await axios.get('/api/user/groups', { withCredentials: true });
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
        <p className="text-gray-600 mt-2">See how you compare with other disciples</p>
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
          <CardTitle>Top 20 Disciples</CardTitle>
          <CardDescription>
            {metric === 'completion'
              ? 'Ranked by task completion rate'
              : 'Ranked by average quiz score'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading leaderboard...</div>
          ) : scope === 'group' && groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">You are not in any groups yet.</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No data available</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-4 rounded border"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl font-bold text-blue-600 w-12 text-center">
                      #{user.rank}
                    </div>
                    <div>
                      <h3 className="font-medium">{user.fullName}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {metric === 'completion' ? (
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {user.stats.completionRate}%
                        </div>
                        <p className="text-xs text-gray-500">
                          {user.stats.completedTasks}/{user.stats.totalTasks}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {user.stats.averageQuizScore}%
                        </div>
                        <p className="text-xs text-gray-500">
                          {user.stats.passedQuizzes}/{user.stats.totalAttempts}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
