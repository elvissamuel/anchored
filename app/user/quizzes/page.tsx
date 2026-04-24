'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import Link from 'next/link';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  dueDate: string | null;
  questions: any[];
}

export default function UserQuizzesPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quizzes</h1>
        <p className="text-gray-600 mt-2">Take quizzes to test your knowledge and progress</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No quizzes available yet</div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{quiz.title}</h3>
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
                  <Link href={`/user/quizzes/${quiz.id}`}>
                    <Button className="ml-4">Take Quiz</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
}
