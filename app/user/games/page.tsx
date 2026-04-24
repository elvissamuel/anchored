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

export default function UserGamesPage() {
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
      <div>
        <h1 className="text-3xl font-bold">Live games</h1>
        <p className="text-gray-600 mt-2">
          Join sessions your organizer invited you to. Answer quickly and
          correctly to climb the board.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your sessions</CardTitle>
          <CardDescription>Open a session to join the room or play</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-gray-500">No game sessions yet.</p>
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
                      {s._count.questions} questions
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.status}</Badge>
                    <Link href={`/user/games/${s.id}`}>
                      <Button size="sm">Open</Button>
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
