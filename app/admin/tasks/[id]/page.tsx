'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Submission = {
  userId: string;
  taskId: string;
  response: string | null;
  submittedAt: string | null;
  adminFeedback: string | null;
  revisionRequestedAt: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  };
};

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  resourceUrl: string | null;
  dueDate: string | null;
};

export default function AdminTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = params?.id;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [awaitingRevision, setAwaitingRevision] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState<Record<string, string | null>>({});
  const [revisionFeedback, setRevisionFeedback] = useState<Record<string, string>>({});
  const [approveNote, setApproveNote] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const fetchAll = async () => {
    if (!taskId) return;
    setIsLoading(true);
    setError('');

    try {
      const [taskRes, subRes] = await Promise.all([
        axios.get(`/api/tasks/${taskId}`, { withCredentials: true }),
        axios.get(`/api/tasks/${taskId}/submissions`, { withCredentials: true }),
      ]);

      setTask(taskRes.data.data);
      setSubmissions(subRes.data.data.submissions ?? []);
      setAwaitingRevision(subRes.data.data.awaitingRevision ?? []);
    } catch (e: unknown) {
      setError(
        axios.isAxiosError(e) ? e.response?.data?.error || 'Failed to load task' : 'Failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const setBusy = (userId: string, key: string | null) => {
    setIsBusy((p) => ({ ...p, [userId]: key }));
  };

  const approve = async (userId: string) => {
    if (!taskId) return;
    setError('');
    setBusy(userId, 'approve');
    try {
      const note = (approveNote[userId] ?? '').trim();
      await axios.post(
        `/api/tasks/${taskId}/submissions/approve`,
        { userId, ...(note ? { reviewNote: note } : {}) },
        { withCredentials: true }
      );
      setApproveNote((p) => ({ ...p, [userId]: '' }));
      await fetchAll();
    } catch (e: unknown) {
      setError(
        axios.isAxiosError(e) ? e.response?.data?.error || 'Failed to approve' : 'Failed'
      );
    } finally {
      setBusy(userId, null);
    }
  };

  const requestRevision = async (userId: string) => {
    if (!taskId) return;
    const feedback = (revisionFeedback[userId] ?? '').trim();
    if (!feedback) {
      setError('Add feedback explaining what the member should change.');
      return;
    }
    setError('');
    setBusy(userId, 'revise');
    try {
      await axios.post(
        `/api/tasks/${taskId}/submissions/request-revision`,
        { userId, feedback },
        { withCredentials: true }
      );
      setRevisionFeedback((p) => ({ ...p, [userId]: '' }));
      await fetchAll();
    } catch (e: unknown) {
      setError(
        axios.isAxiosError(e)
          ? e.response?.data?.error || 'Failed to request revision'
          : 'Failed'
      );
    } finally {
      setBusy(userId, null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10 text-gray-500">Loading...</div>;
  }

  if (!task) {
    return <div className="text-center py-10 text-gray-500">Task not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tasks" className="text-sm text-gray-600 hover:underline">
          ← Back to tasks
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{task.title}</h1>
        {task.description && <p className="text-gray-600 mt-2">{task.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          <CardDescription>Instructions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {task.content || 'No additional content.'}
          </div>
          {task.resourceUrl && (
            <div className="text-sm">
              <span className="font-medium text-gray-900">Resource: </span>
              <a
                href={task.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {task.resourceUrl}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending submissions</CardTitle>
          <CardDescription>
            Review responses. Request a revision with feedback, or approve when ready. You can
            add an optional note when approving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {submissions.length === 0 ? (
            <div className="text-sm text-gray-500">No submissions waiting for review.</div>
          ) : (
            submissions.map((s) => (
              <div key={s.userId} className="rounded-lg border p-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">
                      {s.user.firstName} {s.user.lastName}
                    </div>
                    <div className="text-xs text-gray-600">{s.user.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Submitted:{' '}
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '-'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Response</div>
                  <Textarea value={s.response || ''} readOnly className="min-h-[140px]" />
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label className="text-amber-900">Request revision (feedback to member)</Label>
                  <Textarea
                    placeholder="Explain what they should revisit or improve…"
                    value={revisionFeedback[s.userId] ?? ''}
                    onChange={(e) =>
                      setRevisionFeedback((p) => ({ ...p, [s.userId]: e.target.value }))
                    }
                    className="min-h-[100px]"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => requestRevision(s.userId)}
                    disabled={isBusy[s.userId] != null}
                  >
                    {isBusy[s.userId] === 'revise' ? 'Sending…' : 'Send back for revision'}
                  </Button>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Optional note on approval</Label>
                  <Textarea
                    placeholder="e.g. Great reflection — optional encouragement or final comment"
                    value={approveNote[s.userId] ?? ''}
                    onChange={(e) =>
                      setApproveNote((p) => ({ ...p, [s.userId]: e.target.value }))
                    }
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={() => approve(s.userId)}
                    disabled={isBusy[s.userId] != null}
                  >
                    {isBusy[s.userId] === 'approve' ? 'Approving…' : 'Approve & mark complete'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Awaiting resubmission</CardTitle>
          <CardDescription>
            These members received revision feedback and have not resubmitted yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {awaitingRevision.length === 0 ? (
            <div className="text-sm text-gray-500">None right now.</div>
          ) : (
            awaitingRevision.map((s) => (
              <div key={s.userId} className="rounded-lg border border-amber-100 bg-amber-50/50 p-4 space-y-2">
                <div className="font-medium text-sm">
                  {s.user.firstName} {s.user.lastName}{' '}
                  <span className="text-xs font-normal text-gray-600">({s.user.email})</span>
                </div>
                <div className="text-xs text-gray-600">
                  Feedback sent:{' '}
                  {s.revisionRequestedAt
                    ? new Date(s.revisionRequestedAt).toLocaleString()
                    : '-'}
                </div>
                {s.adminFeedback && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-800">Your feedback: </span>
                    <span className="text-gray-700 whitespace-pre-wrap">{s.adminFeedback}</span>
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Their last draft</div>
                  <Textarea value={s.response || ''} readOnly className="min-h-[100px] bg-white" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
