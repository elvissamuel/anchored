'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface OrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface BankQ {
  id: string;
  prompt: string;
  difficulty: string;
}

export default function NewGameSessionPage() {
  const router = useRouter();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [questions, setQuestions] = useState<BankQ[]>([]);
  const [title, setTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [roundOrder, setRoundOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [uRes, qRes] = await Promise.all([
          axios.get('/api/users', {
            params: { page: 1, limit: 500 },
            withCredentials: true,
          }),
          axios.get('/api/game-questions', { withCredentials: true }),
        ]);
        setUsers(uRes.data.data.users);
        setQuestions(qRes.data.data.questions);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleQuestion = (id: string, checked: boolean) => {
    setRoundOrder((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const move = (id: string, dir: -1 | 1) => {
    setRoundOrder((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (selectedUsers.size === 0) {
      alert('Select at least one player');
      return;
    }
    if (roundOrder.length === 0) {
      alert('Select at least one question');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(
        '/api/game-sessions',
        {
          title: title.trim(),
          participantUserIds: [...selectedUsers],
          questionIds: roundOrder,
        },
        { withCredentials: true }
      );
      router.push(`/admin/games/sessions/${res.data.data.id}`);
    } catch (err: unknown) {
      alert(
        axios.isAxiosError(err)
          ? err.response?.data?.error || 'Failed'
          : 'Failed'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500">Loading…</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/admin/games/sessions"
          className="text-sm text-gray-600 hover:underline"
        >
          ← Sessions
        </Link>
        <h1 className="text-3xl font-bold mt-4">New game session</h1>
        <p className="text-gray-600 mt-2">
          Choose who plays and which bank questions to run, in order.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="text-sm font-medium">Title</label>
            <Input
              className="mt-1 max-w-md"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Friday night quiz"
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Players</CardTitle>
            <CardDescription>
              Only selected members can join this session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {users.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={selectedUsers.has(u.id)}
                  onCheckedChange={(c) => {
                    setSelectedUsers((prev) => {
                      const n = new Set(prev);
                      if (c === true) n.add(u.id);
                      else n.delete(u.id);
                      return n;
                    });
                  }}
                />
                <span>
                  {u.firstName} {u.lastName}{' '}
                  <span className="text-gray-500">({u.email})</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions (order)</CardTitle>
            <CardDescription>
              Check questions to include. Reorder with arrows — that is the live
              round order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {questions.map((q) => {
                const on = roundOrder.includes(q.id);
                const pos = roundOrder.indexOf(q.id);
                return (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-center gap-2 border rounded-md p-2 text-sm"
                  >
                    <Checkbox
                      checked={on}
                      onCheckedChange={(c) =>
                        toggleQuestion(q.id, c === true)
                      }
                    />
                    <span className="flex-1 min-w-[200px] line-clamp-2">
                      {on ? (
                        <span className="font-mono text-gray-500 mr-2">
                          #{pos + 1}
                        </span>
                      ) : null}
                      {q.prompt}
                    </span>
                    <span className="text-xs text-gray-500">{q.difficulty}</span>
                    {on ? (
                      <span className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => move(q.id, -1)}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => move(q.id, 1)}
                        >
                          Down
                        </Button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create draft session'}
          </Button>
          <Link href="/admin/games/sessions">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
