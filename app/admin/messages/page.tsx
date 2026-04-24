'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function MessagesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const [messageTab, setMessageTab] = useState('direct');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
  });

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users', {
        params: { limit: 100 },
        withCredentials: true,
      });
      setUsers(res.data.data.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
      })));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId && messageTab === 'direct') {
      alert('Please select a user');
      return;
    }

    setIsLoading(true);
    try {
      if (messageTab === 'direct') {
        await axios.post(
          '/api/notifications/message',
          {
            userId: selectedUserId,
            title: formData.title,
            message: formData.message,
          },
          { withCredentials: true }
        );
        alert('Message sent successfully!');
      } else {
        await axios.post(
          '/api/notifications/broadcast',
          {
            title: formData.title,
            message: formData.message,
          },
          { withCredentials: true }
        );
        alert('Announcement broadcast successfully!');
      }
      setFormData({ title: '', message: '' });
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages & Announcements</h1>
        <p className="text-gray-600 mt-2">Send messages to disciples or broadcast announcements</p>
      </div>

      <Tabs value={messageTab} onValueChange={setMessageTab}>
        <TabsList>
          <TabsTrigger value="direct">Direct Message</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast Announcement</TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select User</CardTitle>
                <CardDescription>Choose a disciple to message</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-4"
                />
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left p-3 rounded border transition ${
                        selectedUserId === user.id
                          ? 'bg-blue-50 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-sm">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-600">{user.email}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Compose Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      placeholder="Message title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message *</label>
                    <Textarea
                      placeholder="Your message here..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || !selectedUserId}>
                    {isLoading ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="broadcast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast Announcement</CardTitle>
              <CardDescription>Send message to all disciples at once</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    placeholder="Announcement title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message *</label>
                  <Textarea
                    placeholder="Your announcement here..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={8}
                    required
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    This announcement will be sent to all {users.length} registered disciples.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Broadcasting...' : 'Broadcast Announcement'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
