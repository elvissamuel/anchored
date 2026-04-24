'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BookOpenIcon, ClipboardListIcon, TrophyIcon, SendIcon } from 'lucide-react';
import { getYoutubeEmbedSrc } from '@/lib/youtube';

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  resourceUrl: string | null;
  dueDate: string | null;
  type?: 'DAILY' | 'ASSIGNMENT' | 'POINTS';
  points?: number;
  completions: Array<{
    completed: boolean;
    submittedAt?: string | null;
    response?: string | null;
    adminFeedback?: string | null;
    revisionRequestedAt?: string | null;
  }>;
}

export default function UserTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = useMemo(() => params?.id, [params]);

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const taskTypeMeta = (type?: TaskDetail['type']) => {
    switch (type) {
      case 'ASSIGNMENT':
        return {
          label: 'Assignment',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: ClipboardListIcon,
        };
      case 'POINTS':
        return {
          label: 'Points',
          badgeClass: 'bg-red-100 text-red-800 border-red-200',
          icon: TrophyIcon,
        };
      case 'DAILY':
      default:
        return {
          label: 'Daily Task',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: BookOpenIcon,
        };
    }
  };

  const fetchTask = async () => {
    if (!taskId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/tasks/${taskId}`, { withCredentials: true });
      setTask(res.data.data);
      const existingResponse = res.data.data?.completions?.[0]?.response;
      if (typeof existingResponse === 'string') {
        setResponseText(existingResponse);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load task');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const handleSubmit = async () => {
    if (!taskId) return;
    setError('');
    setSuccess('');

    if (!responseText.trim()) {
      setError('Please write your response before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(
        `/api/tasks/${taskId}/response`,
        { response: responseText },
        { withCredentials: true }
      );
      setSuccess(
        needsRevision
          ? 'Updated response submitted. Waiting for review.'
          : 'Response submitted. Waiting for review.'
      );
      await fetchTask();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10 text-gray-500">Loading task...</div>;
  }

  if (!task) {
    return <div className="text-center py-10 text-gray-500">Task not found.</div>;
  }

  const meta = taskTypeMeta(task.type);
  const Icon = meta.icon;
  const completion = task.completions?.[0];
  const submittedAt = completion?.submittedAt;
  const revisionRequestedAt = completion?.revisionRequestedAt;
  const adminFeedback = completion?.adminFeedback;
  const needsRevision = Boolean(revisionRequestedAt && !completion?.completed);
  const youtubeEmbed =
    task.resourceUrl ? getYoutubeEmbedSrc(task.resourceUrl) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/user/tasks" className="text-sm text-gray-600 hover:underline">
          ← Back to tasks
        </Link>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={meta.badgeClass}>
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold">{task.title}</h1>
        <div className="text-sm text-gray-600 flex flex-wrap gap-3">
          {typeof task.points === 'number' && <span>{task.points} points</span>}
          {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
          {submittedAt && !needsRevision && !completion?.completed && (
            <span className="text-amber-700">Submitted — awaiting review</span>
          )}
          {needsRevision && (
            <span className="text-orange-700 font-medium">Revision requested</span>
          )}
          {completion?.completed && <span className="text-green-700">Completed</span>}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {task.content || task.description || 'No description provided.'}
          </p>
        </CardContent>
      </Card>

      {task.resourceUrl && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {youtubeEmbed ? (
              <>
                <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
                  <iframe
                    src={youtubeEmbed}
                    title={`Video for ${task.title}`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <a
                  href={task.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Open on YouTube
                </a>
              </>
            ) : (
              <a
                href={task.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline break-all"
              >
                {task.resourceUrl}
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="font-medium">Your response</h2>

        {adminFeedback && (
          <div
            className={`rounded-md border p-4 text-sm ${
              completion?.completed
                ? 'border-green-200 bg-green-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <p
              className={`font-medium ${
                completion?.completed ? 'text-green-950' : 'text-amber-950'
              }`}
            >
              {completion?.completed
                ? 'Note from your leader'
                : 'Feedback from your leader'}
            </p>
            <p
              className={`mt-2 whitespace-pre-wrap ${
                completion?.completed ? 'text-green-900/90' : 'text-amber-900/90'
              }`}
            >
              {adminFeedback}
            </p>
            {needsRevision && (
              <p className="mt-3 text-amber-800/90">
                Please update your response below and resubmit when you are ready.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
        )}

        <Textarea
          placeholder="Share your thoughts or reflections..."
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          className="min-h-[160px]"
          disabled={completion?.completed === true}
        />

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={isSubmitting || completion?.completed === true}
        >
          <SendIcon className="h-4 w-4 mr-2" />
          {isSubmitting
            ? 'Submitting...'
            : completion?.completed
              ? 'Completed'
              : needsRevision
                ? 'Resubmit response'
                : submittedAt
                  ? 'Update submission'
                  : 'Submit'}
        </Button>
      </div>
    </div>
  );
}
