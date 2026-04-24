'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface BankQuestion {
  id: string;
  prompt: string;
  difficulty: Difficulty;
  timeLimitSeconds: number;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  _count: { sessionQuestions: number };
}

export default function GameQuestionBankPage() {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [timeLimit, setTimeLimit] = useState(30);
  const [options, setOptions] = useState<
    Array<{ text: string; isCorrect: boolean }>
  >([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/game-questions', {
        withCredentials: true,
      });
      setQuestions(res.data.data.questions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setCorrect = (index: number) => {
    setOptions((opts) =>
      opts.map((o, i) => ({ ...o, isCorrect: i === index }))
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(
        '/api/game-questions',
        {
          prompt,
          difficulty,
          timeLimitSeconds: timeLimit,
          options,
        },
        { withCredentials: true }
      );
      setPrompt('');
      setDifficulty('MEDIUM');
      setTimeLimit(30);
      setOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ]);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      console.error(err);
      alert(
        axios.isAxiosError(err)
          ? err.response?.data?.error || 'Failed'
          : 'Failed'
      );
    } finally {
      setSaving(false);
    }
  };

  const removeQuestion = async (id: string) => {
    if (!confirm('Delete this question from the bank?')) return;
    try {
      await axios.delete(`/api/game-questions/${id}`, {
        withCredentials: true,
      });
      await load();
    } catch (err: unknown) {
      alert(
        axios.isAxiosError(err)
          ? err.response?.data?.error || 'Failed'
          : 'Failed'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Game question bank</h1>
          <p className="text-gray-600 mt-2">
            Build multiple-choice items with difficulty and time limits. Reuse
            them in live game sessions.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/games/sessions">
            <Button variant="outline">Game sessions</Button>
          </Link>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Close form' : 'New question'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add to bank</CardTitle>
            <CardDescription>
              Mark exactly one option as correct. Players earn more points for
              fast, correct answers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4 max-w-2xl">
              <div>
                <label className="text-sm font-medium">Question</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="What is…?"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Difficulty</label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as Difficulty)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Time limit (seconds)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={timeLimit}
                    onChange={(e) =>
                      setTimeLimit(parseInt(e.target.value, 10) || 30)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Options</label>
                {options.map((o, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="radio"
                      name="correct"
                      checked={o.isCorrect}
                      onChange={() => setCorrect(i)}
                      className="shrink-0"
                    />
                    <Input
                      value={o.text}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = { ...next[i], text: e.target.value };
                        setOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      required
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOptions((opts) => [
                      ...opts,
                      { text: '', isCorrect: false },
                    ])
                  }
                >
                  Add option
                </Button>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save to bank'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bank ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading…</p>
          ) : questions.length === 0 ? (
            <p className="text-gray-500">No questions yet.</p>
          ) : (
            <ul className="space-y-4">
              {questions.map((q) => (
                <li
                  key={q.id}
                  className="border rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="outline">{q.difficulty}</Badge>
                      <span className="text-xs text-gray-500">
                        {q.timeLimitSeconds}s · used in{' '}
                        {q._count.sessionQuestions} session(s)
                      </span>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{q.prompt}</p>
                    <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                      {q.options.map((o) => (
                        <li key={o.id}>
                          {o.text}{' '}
                          {o.isCorrect ? (
                            <span className="text-green-700">(correct)</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="self-start"
                    onClick={() => removeQuestion(q.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
