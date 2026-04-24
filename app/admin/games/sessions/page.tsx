'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SessionRow {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  _count: { participants: number; questions: number };
}

export default function GameSessionsListPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/game-sessions', {
          withCredentials: true,
        });
        setSessions(res.data.data.sessions);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Game sessions</h1>
          <p className="text-gray-600 mt-2">
            Configure players and questions, open the lobby, then start the live
            game. Progress updates in real time as players answer.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/games/questions">
            <Button variant="outline">Question bank</Button>
          </Link>
          <Link href="/admin/games/sessions/new">
            <Button>New session</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Host controls and live status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-gray-500">No sessions yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {s._count.participants} players · {s._count.questions}{' '}
                      questions · updated{' '}
                      {new Date(s.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        s.status === 'LIVE'
                          ? 'default'
                          : s.status === 'FINISHED'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {s.status}
                    </Badge>
                    <Link href={`/admin/games/sessions/${s.id}`}>
                      <Button size="sm" variant="outline">
                        Open
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
