'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isAnnouncement: boolean;
  read: boolean;
  createdAt: string;
}

export default function UserMessagesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNotifications = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/notifications', {
        params: { page: pageNum, limit: 15 },
      });
      setNotifications(res.data.data.notifications);
      setTotalPages(res.data.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await axios.patch(`/api/notifications/${id}`, { read: true });
      fetchNotifications(page);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      fetchNotifications(page);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const messages = notifications.filter(n => !n.isAnnouncement);
  const announcements = notifications.filter(n => n.isAnnouncement);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages & Announcements</h1>
        <p className="text-gray-600 mt-2">
          Stay updated with messages and announcements from your pastor
        </p>
      </div>

      {unreadCount > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-blue-800">
              You have <strong>{unreadCount}</strong> unread message{unreadCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="messages">
            Messages ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="announcements">
            Announcements ({announcements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading messages...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No messages or announcements yet
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={notif.read ? '' : 'border-blue-300 bg-blue-50'}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === notif.id ? null : notif.id)
                        }
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-base">{notif.title}</h3>
                          {!notif.read && (
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                          {notif.isAnnouncement && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              Announcement
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </button>
                      <div className="flex gap-2 ml-4">
                        {!notif.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(notif.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notif.id)}
                          className="text-red-600"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {expandedId === notif.id && (
                      <div className="mt-4 p-4 bg-card rounded border text-sm text-gray-700">
                        {notif.message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No messages yet</div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <Card key={msg.id} className={msg.read ? '' : 'border-blue-300 bg-blue-50'}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-base">{msg.title}</h3>
                          {!msg.read && (
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </button>
                      {!msg.read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(msg.id)}
                          className="ml-4"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                    {expandedId === msg.id && (
                      <div className="mt-4 p-4 bg-card rounded border text-sm text-gray-700">
                        {msg.message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No announcements yet</div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <Card key={ann.id} className={ann.read ? '' : 'border-purple-300 bg-purple-50'}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-base">{ann.title}</h3>
                          {!ann.read && (
                            <span className="inline-block w-2 h-2 bg-purple-600 rounded-full"></span>
                          )}
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            Announcement
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(ann.createdAt).toLocaleString()}
                        </p>
                      </button>
                      {!ann.read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(ann.id)}
                          className="ml-4"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                    {expandedId === ann.id && (
                      <div className="mt-4 p-4 bg-card rounded border text-sm text-gray-700">
                        {ann.message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPage(p => Math.max(1, p - 1));
              fetchNotifications(Math.max(1, page - 1));
            }}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => {
              setPage(p => Math.min(totalPages, p + 1));
              fetchNotifications(Math.min(totalPages, page + 1));
            }}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
