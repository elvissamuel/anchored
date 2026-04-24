'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import type { PlayStatePayload } from '@/lib/game-play-state.types';

interface SessionMeta {
  id: string;
  title: string;
  status: string;
  participants: Array<{
    userId: string;
    joinedAt: string | null;
    totalScore: number;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  questions: Array<{
    sortOrder: number;
    gameQuestion: { prompt: string; difficulty: string };
  }>;
}

export default function AdminGameSessionControlPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id;

  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [state, setState] = useState<PlayStatePayload | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    if (!sessionId) return;
    const res = await axios.get(`/api/game-sessions/${sessionId}`, {
      withCredentials: true,
    });
    setMeta(res.data.data);
  }, [sessionId]);

  const loadState = useCallback(async () => {
    if (!sessionId) return;
    const res = await axios.get(`/api/game-sessions/${sessionId}/state`, {
      withCredentials: true,
    });
    setState(res.data.data);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        await loadMeta();
        await loadState();
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(
            axios.isAxiosError(e)
              ? e.response?.data?.error || 'Failed'
              : 'Failed'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, loadMeta, loadState]);

  useEffect(() => {
    if (!sessionId || !meta) return;
    const tick = setInterval(() => {
      loadState().catch(() => {});
      if (meta.status === 'DRAFT') return;
      loadMeta().catch(() => {});
    }, 1200);
    return () => clearInterval(tick);
  }, [sessionId, meta?.status, loadMeta, loadState, meta]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setErr('');
    try {
      await fn();
      await loadMeta();
      await loadState();
    } catch (e: unknown) {
      setErr(
        axios.isAxiosError(e) ? e.response?.data?.error || 'Failed' : 'Failed'
      );
    } finally {
      setBusy(null);
    }
  };

  if (!sessionId) return null;

  if (err && !meta) {
    return (
      <div className="space-y-4">
        <Link href="/admin/games/sessions" className="text-sm text-gray-600 hover:underline">
          ← Sessions
        </Link>
        <div className="text-red-700 text-sm">{err}</div>
      </div>
    );
  }

  if (!meta) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/admin/games/sessions"
          className="text-sm text-gray-600 hover:underline"
        >
          ← Sessions
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{meta.title}</h1>
            <Badge className="mt-2">{meta.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {meta.status === 'DRAFT' ? (
              <Button
                disabled={!!busy}
                onClick={() =>
                  run('lobby', async () => {
                    await axios.post(
                      `/api/game-sessions/${sessionId}/lobby`,
                      {},
                      { withCredentials: true }
                    );
                  })
                }
              >
                {busy === 'lobby' ? '…' : 'Open lobby'}
              </Button>
            ) : null}
            {meta.status === 'LOBBY' ? (
              <>
                <Button
                  disabled={!!busy}
                  onClick={() =>
                    run('start', async () => {
                      await axios.post(
                        `/api/game-sessions/${sessionId}/start`,
                        {},
                        { withCredentials: true }
                      );
                    })
                  }
                >
                  {busy === 'start' ? '…' : 'Start live game'}
                </Button>
                <Button
                  variant="destructive"
                  disabled={!!busy}
                  onClick={() =>
                    run('fin', async () => {
                      await axios.post(
                        `/api/game-sessions/${sessionId}/finish`,
                        {},
                        { withCredentials: true }
                      );
                    })
                  }
                >
                  End
                </Button>
              </>
            ) : null}
            {meta.status === 'LIVE' ? (
              <>
                <Button
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() =>
                    run('adv', async () => {
                      await axios.post(
                        `/api/game-sessions/${sessionId}/advance`,
                        {},
                        { withCredentials: true }
                      );
                    })
                  }
                >
                  {busy === 'adv' ? '…' : 'Next question (skip timer)'}
                </Button>
                <Button
                  variant="destructive"
                  disabled={!!busy}
                  onClick={() =>
                    run('fin', async () => {
                      await axios.post(
                        `/api/game-sessions/${sessionId}/finish`,
                        {},
                        { withCredentials: true }
                      );
                    })
                  }
                >
                  End game
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {err ? (
        <div className="text-sm text-red-700 bg-red-50 rounded-md p-3">{err}</div>
      ) : null}

      {state ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Live board</CardTitle>
              <CardDescription>
                Question {state.currentQuestionIndex + 1} / {state.totalQuestions}{' '}
                · {state.phase}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.phase === 'finished' || state.status === 'FINISHED' ? (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Top 3</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    {state.podium.map((p) => (
                      <li key={p.userId}>
                        {p.firstName} {p.lastName} — {p.totalScore} pts
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {state.prompt ? (
                <>
                  <p className="text-sm text-gray-600">{state.difficulty}</p>
                  <p className="font-medium whitespace-pre-wrap">{state.prompt}</p>
                  <p className="text-xs text-gray-500">
                    {state.revealSolution
                      ? 'Answer revealed'
                      : state.questionStillOpen
                        ? 'Timer running'
                        : '—'}
                  </p>
                  <ul className="text-sm space-y-1">
                    {state.options.map((o) => (
                      <li
                        key={o.id}
                        className={
                          o.isCorrect === true
                            ? 'text-green-700 font-medium'
                            : o.isCorrect === false
                              ? ''
                              : ''
                        }
                      >
                        {o.text}
                        {o.isCorrect ? ' ✓' : ''}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-gray-500 text-sm">
                  {state.phase === 'lobby'
                    ? 'Waiting for you to start the game.'
                    : 'No active question.'}
                </p>
              )}
              <div className="text-xs text-gray-500">
                Progress this round: {state.progress.answered}/{state.progress.total}{' '}
                answered
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
              <CardDescription>Scores and who answered the current round</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {state.participants
                  .slice()
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((p) => (
                    <li
                      key={p.userId}
                      className="flex justify-between gap-2 border-b border-dashed pb-2"
                    >
                      <span>
                        {p.firstName} {p.lastName}
                        {p.joinedAt ? (
                          <span className="text-green-600 text-xs ml-1">joined</span>
                        ) : (
                          <span className="text-amber-600 text-xs ml-1">not joined</span>
                        )}
                      </span>
                      <span className="shrink-0">
                        {p.totalScore} pts
                        {p.answeredCurrent ? (
                          <span className="text-green-700 ml-1">✓</span>
                        ) : (
                          <span className="text-gray-400 ml-1">…</span>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Rounds in this session</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside text-sm space-y-1">
            {meta.questions.map((q) => (
              <li key={q.sortOrder}>
                <span className="text-gray-500 mr-2">{q.gameQuestion.difficulty}</span>
                {q.gameQuestion.prompt}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
