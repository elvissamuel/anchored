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

export default function UserGamePlayPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id;

  const [state, setState] = useState<PlayStatePayload | null>(null);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        await axios.post(
          `/api/game-sessions/${sessionId}/join`,
          {},
          { withCredentials: true }
        );
      } catch {
        // may fail if not invited — still try loading state
      }
      try {
        await loadState();
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(
            axios.isAxiosError(e)
              ? e.response?.data?.error || 'Failed to load'
              : 'Failed'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, loadState]);

  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(() => {
      loadState().catch(() => {});
    }, 1100);
    return () => clearInterval(t);
  }, [sessionId, loadState]);

  const pick = async (optionId: string) => {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    setErr('');
    try {
      await axios.post(
        `/api/game-sessions/${sessionId}/answer`,
        { optionId },
        { withCredentials: true }
      );
      await loadState();
    } catch (e: unknown) {
      setErr(
        axios.isAxiosError(e) ? e.response?.data?.error || 'Failed' : 'Failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!sessionId) return null;

  if (err && !state) {
    return (
      <div className="space-y-4">
        <Link href="/user/games" className="text-sm text-gray-600 hover:underline">
          ← Games
        </Link>
        <div className="text-red-700 text-sm">{err}</div>
      </div>
    );
  }

  if (!state) return <p className="text-gray-500 py-10">Loading…</p>;

  const ends = state.questionEndsAt
    ? new Date(state.questionEndsAt).getTime()
    : 0;
  const msLeft = Math.max(0, ends - Date.now());

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <Link href="/user/games" className="text-sm text-gray-600 hover:underline">
          ← Games
        </Link>
        <h1 className="text-2xl font-bold mt-4">{state.title}</h1>
        <div className="flex gap-2 mt-2">
          <Badge>{state.status}</Badge>
          <Badge variant="outline">
            Q{state.currentQuestionIndex + 1}/{state.totalQuestions || '—'}
          </Badge>
        </div>
      </div>

      {err ? (
        <div className="text-sm text-red-700 bg-red-50 rounded-md p-3">{err}</div>
      ) : null}

      {state.phase === 'lobby' ? (
        <Card>
          <CardHeader>
            <CardTitle>Lobby</CardTitle>
            <CardDescription>
              You are in the room. The host will start the game soon.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {state.phase === 'finished' || state.status === 'FINISHED' ? (
        <Card>
          <CardHeader>
            <CardTitle>Game over</CardTitle>
            <CardDescription>Top finishers</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 font-medium">
              {state.podium.map((p) => (
                <li key={p.userId}>
                  {p.firstName} {p.lastName} — {p.totalScore} pts
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {state.phase === 'question' && state.status === 'LIVE' && state.prompt ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-gray-600">
              {state.difficulty}
            </CardTitle>
            <CardDescription className="text-foreground text-lg font-medium whitespace-pre-wrap">
              {state.prompt}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.questionStillOpen && !state.myAnswer ? (
              <p className="text-sm text-amber-800">
                Time left: {Math.ceil(msLeft / 1000)}s
              </p>
            ) : null}

            {state.myAnswer ? (
              <div
                className={`rounded-lg p-4 text-sm ${
                  state.myAnswer.isCorrect ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <p className="font-medium">
                  {state.myAnswer.isCorrect ? 'Correct!' : 'Incorrect'}
                </p>
                <p>
                  +{state.myAnswer.pointsAwarded} points ·{' '}
                  {(state.myAnswer.reactionTimeMs / 1000).toFixed(2)}s
                </p>
                {state.revealSolution && !state.questionStillOpen ? (
                  <p className="text-gray-600 mt-2">
                    Waiting for others or next question…
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-2">
              {state.options.map((o) => {
                const disabled =
                  submitting || !!state.myAnswer || !state.questionStillOpen;
                const highlight =
                  state.revealSolution && o.isCorrect
                    ? 'border-green-600 bg-green-50'
                    : state.revealSolution && state.myAnswer?.optionId === o.id
                      ? state.myAnswer.isCorrect
                        ? 'border-green-600'
                        : 'border-red-400'
                      : '';
                return (
                  <Button
                    key={o.id}
                    type="button"
                    variant="outline"
                    className={`h-auto py-3 px-4 text-left justify-start whitespace-normal ${highlight}`}
                    disabled={disabled}
                    onClick={() => pick(o.id)}
                  >
                    {o.text}
                  </Button>
                );
              })}
            </div>

            <p className="text-xs text-gray-500">
              {state.progress.answered}/{state.progress.total} players answered
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {state.participants
              .slice()
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((p, i) => (
                <li key={p.userId} className="flex justify-between">
                  <span>
                    {i + 1}. {p.firstName} {p.lastName}
                  </span>
                  <span>{p.totalScore}</span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
