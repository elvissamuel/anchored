'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  dueDate: string | null;
  createdAt: string;
  questions: any[];
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchQuizzes = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/quizzes', {
        params: { page: pageNum, limit: 10 },
      });
      setQuizzes(res.data.data.quizzes);
      setTotalPages(res.data.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes(1);
  }, []);

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await axios.delete(`/api/quizzes/${id}`);
      fetchQuizzes(page);
    } catch (error) {
      console.error('Failed to delete quiz:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Quizzes</h1>
          <p className="text-gray-600 mt-2">Create and manage quizzes and examinations</p>
        </div>
        <Button asChild>
          <a href="/admin/quizzes/create">Create Quiz</a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quizzes List</CardTitle>
          <CardDescription>Total: {quizzes.length} quizzes on this page</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading quizzes...</div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No quizzes created yet</div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-base">{quiz.title}</h3>
                      {quiz.description && (
                        <p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
                      )}
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span>Questions: {quiz.questions.length}</span>
                        <span>Passing Score: {quiz.passingScore}%</span>
                        {quiz.dueDate && (
                          <span>
                            Due: {new Date(quiz.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/admin/quizzes/${quiz.id}/edit`}>Edit</a>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setPage(p => Math.max(1, p - 1));
                  fetchQuizzes(Math.max(1, page - 1));
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
                  fetchQuizzes(Math.min(totalPages, page + 1));
                }}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
