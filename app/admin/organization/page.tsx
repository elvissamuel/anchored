'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';

type InviteInfo = {
  token: string;
  link: string;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  createdAt: string;
};

type OrgInfo = {
  id: string;
  name: string;
  slug: string;
  wordOfTheDay: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminOrganizationPage() {
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingWord, setIsSavingWord] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wordOfTheDay, setWordOfTheDay] = useState('');

  const orgCode = useMemo(() => invite?.token || '', [invite]);
  const inviteLink = useMemo(() => invite?.link || '', [invite]);

  const fetchOrg = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/organization', { withCredentials: true });
      setOrg(res.data.data.organization);
      setWordOfTheDay(res.data.data.organization?.wordOfTheDay || '');
      setInvite(res.data.data.invite);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load organization profile');
    } finally {
      setIsLoading(false);
    }
  };

  const saveWordOfTheDay = async () => {
    setIsSavingWord(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.patch(
        '/api/organization',
        { wordOfTheDay },
        { withCredentials: true }
      );
      setOrg(res.data.data.organization);
      setWordOfTheDay(res.data.data.organization?.wordOfTheDay || '');
      setSuccess('Word for the day updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update word for the day');
    } finally {
      setIsSavingWord(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, []);

  const copy = async (text: string) => {
    setError('');
    setSuccess('');
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Copied');
      setTimeout(() => setSuccess(''), 1500);
    } catch {
      setError('Copy failed');
    }
  };

  const createInvite = async () => {
    setIsCreating(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post('/api/organization/invite', {}, { withCredentials: true });
      setInvite(res.data.data);
      setSuccess('New invite code created');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create invite link');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10 text-gray-500">Loading organization profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organization Profile</h1>
        <p className="text-gray-600 mt-2">Organization details, invite code, and share link</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Basic organization information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-gray-500">Organization name</div>
              <div className="font-medium">{org?.name || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Slug</div>
              <div className="font-medium">{org?.slug || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Word for the Day</CardTitle>
          <CardDescription>
            This appears on both admin and member dashboards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={wordOfTheDay}
            onChange={(e) => setWordOfTheDay(e.target.value)}
            placeholder="Enter today's encouragement, verse, or focus word..."
            maxLength={500}
          />
          <div className="text-xs text-gray-500">{wordOfTheDay.length}/500</div>
          <Button onClick={saveWordOfTheDay} disabled={isSavingWord}>
            {isSavingWord ? 'Saving...' : 'Save word for the day'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite</CardTitle>
          <CardDescription>Share this with people you want to join your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!invite ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">No invite code yet.</div>
              <Button onClick={createInvite} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create invite code'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Organization code</div>
                <div className="flex gap-2">
                  <Input value={orgCode} readOnly />
                  <Button variant="outline" onClick={() => copy(orgCode)} disabled={!orgCode}>
                    Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Share link</div>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly />
                  <Button variant="outline" onClick={() => copy(inviteLink)} disabled={!inviteLink}>
                    Copy
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div>
                  <span className="text-gray-500">Used:</span> {invite.usedCount}
                  {typeof invite.maxUses === 'number' ? ` / ${invite.maxUses}` : ''}
                </div>
                <div>
                  <span className="text-gray-500">Expires:</span>{' '}
                  {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Never'}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={createInvite} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Generate new code'}
                </Button>
                <Button variant="outline" onClick={fetchOrg}>
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
