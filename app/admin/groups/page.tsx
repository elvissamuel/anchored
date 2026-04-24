'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';

type GroupListItem = {
  id: string;
  name: string;
  createdAt: string;
  _count?: {
    members: number;
  };
};

type OrgUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  orgRole?: 'ADMIN' | 'GROUP_LEADER' | 'MEMBER';
};

type GroupMember = {
  userId: string;
  role: 'LEADER' | 'MEMBER';
  user: OrgUser;
};

type GroupDetail = {
  id: string;
  name: string;
  members: GroupMember[];
};

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);

  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'LEADER' | 'MEMBER'>('MEMBER');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [error, setError] = useState('');

  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    setError('');
    try {
      const res = await axios.get('/api/groups', { withCredentials: true });
      setGroups(res.data.data.groups);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to fetch groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await axios.get('/api/users', {
        params: { page: 1, limit: 500 },
        withCredentials: true,
      });
      setUsers(res.data.data.users);
    } catch (e) {
      // ignore
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchGroup = async (groupId: string) => {
    if (!groupId) return;
    setIsLoadingGroup(true);
    setError('');
    try {
      const res = await axios.get(`/api/groups/${groupId}`, { withCredentials: true });
      setSelectedGroup(res.data.data);
      setSelectedGroupId(groupId);
      setMemberUserId('');
      setMemberRole('MEMBER');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load group');
    } finally {
      setIsLoadingGroup(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const selectedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    (selectedGroup?.members || []).forEach((m) => ids.add(m.userId));
    return ids;
  }, [selectedGroup]);

  const availableUsers = useMemo(
    () => users.filter((u) => !selectedMemberIds.has(u.id)),
    [users, selectedMemberIds]
  );

  const createGroup = async () => {
    setIsCreating(true);
    setError('');
    try {
      const res = await axios.post(
        '/api/groups',
        { name: newGroupName },
        { withCredentials: true }
      );
      setCreateOpen(false);
      setNewGroupName('');
      await fetchGroups();
      await fetchGroup(res.data.data.id);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const addMember = async () => {
    if (!selectedGroupId || !memberUserId) return;
    setIsAddingMember(true);
    setError('');
    try {
      await axios.post(
        `/api/groups/${selectedGroupId}/members`,
        { userId: memberUserId, role: memberRole },
        { withCredentials: true }
      );
      await fetchGroup(selectedGroupId);
      await fetchGroups();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!selectedGroupId) return;
    setError('');
    try {
      await axios.delete(`/api/groups/${selectedGroupId}/members`, {
        data: { userId },
        withCredentials: true,
      });
      await fetchGroup(selectedGroupId);
      await fetchGroups();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Groups</h1>
        <p className="text-gray-600 mt-2">Create and manage groups and leaders</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>All Groups</CardTitle>
                <CardDescription>Groups in this organization</CardDescription>
              </div>

              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>Create</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create group</DialogTitle>
                    <DialogDescription>Create a new group for your organization.</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Group name</div>
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g. Youth Fellowship"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={createGroup}
                      disabled={isCreating || !newGroupName.trim()}
                    >
                      {isCreating ? 'Creating...' : 'Create group'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingGroups ? (
              <div className="text-sm text-gray-500">Loading groups...</div>
            ) : groups.length === 0 ? (
              <div className="text-sm text-gray-500">No groups yet.</div>
            ) : (
              groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => fetchGroup(g.id)}
                  className={`w-full text-left p-3 rounded border transition ${
                    selectedGroupId === g.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-sm truncate">{g.name}</div>
                    <div className="text-xs text-gray-600">
                      {g._count?.members ?? 0}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Created {new Date(g.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{selectedGroup ? selectedGroup.name : 'Select a group'}</CardTitle>
            <CardDescription>
              {selectedGroup ? 'View members and add members to this group.' : 'Choose a group from the left.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedGroupId ? (
              <div className="text-sm text-gray-500">No group selected.</div>
            ) : isLoadingGroup ? (
              <div className="text-sm text-gray-500">Loading group...</div>
            ) : !selectedGroup ? (
              <div className="text-sm text-gray-500">Unable to load group.</div>
            ) : (
              <>
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-sm font-medium">Add member</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Select value={memberUserId} onValueChange={setMemberUserId}>
                      <SelectTrigger className="md:col-span-2">
                        <SelectValue placeholder={isLoadingUsers ? 'Loading users...' : 'Select a user'} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={memberRole} onValueChange={(v) => setMemberRole(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="LEADER">Leader</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={addMember}
                    disabled={isAddingMember || !memberUserId}
                    className="w-full"
                  >
                    {isAddingMember ? 'Adding...' : 'Add to group'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Members</div>

                  {selectedGroup.members.length === 0 ? (
                    <div className="text-sm text-gray-500">No members in this group yet.</div>
                  ) : (
                    <div className="divide-y rounded-lg border">
                      {selectedGroup.members.map((m) => (
                        <div key={m.userId} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {m.user.firstName} {m.user.lastName}
                            </div>
                            <div className="text-xs text-gray-600 truncate">{m.user.email}</div>
                            <div className="text-xs text-gray-500 mt-1">Group role: {m.role}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMember(m.userId)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
