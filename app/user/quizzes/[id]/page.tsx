'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import axios from 'axios';

interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  options: Array<{ text: string; isCorrect: boolean }>;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  questions: QuizQuestion[];
}

export default function QuizTakingPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`/api/quizzes/${quizId}`);
        setQuiz(res.data.data);
      } catch (error) {
        console.error('Failed to fetch quiz:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;

    setIsSubmitting(true);
    try {
      const formattedAnswers = quiz.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));

      const res = await axios.post(`/api/quizzes/${quizId}/submit`, {
        answers: formattedAnswers,
      });

      setResult(res.data.data);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading quiz...</div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-8 text-red-500">Quiz not found</div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{quiz.title}</CardTitle>
            <CardDescription>Quiz Results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div
                className={`text-5xl font-bold ${
                  result.passed ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {result.score}%
              </div>
              <p className="text-lg mt-2">
                {result.passed ? '✓ PASSED' : '✗ FAILED'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Passing score: {quiz.passingScore}%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded">
                <p className="text-sm text-gray-600">Correct Answers</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.correctCount}/{result.totalQuestions}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded">
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-2xl font-bold text-purple-600">
                  {result.score}%
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/user/quizzes')}
                className="flex-1"
              >
                Back to Quizzes
              </Button>
              <Button
                onClick={() => router.push('/user')}
                variant="outline"
                className="flex-1"
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{quiz.title}</CardTitle>
              <CardDescription>
                Question {currentQuestion + 1} of {quiz.questions.length}
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">{currentQ.question}</h3>

            <div className="space-y-3">
              {currentQ.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroup
                    value={answers[currentQ.id] || ''}
                    onValueChange={(value) =>
                      handleAnswerChange(currentQ.id, value)
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={option.text}
                        id={`option-${index}`}
                      />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer">
                        {option.text}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>

            {currentQuestion === quiz.questions.length - 1 ? (
              <Button
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  setCurrentQuestion(
                    Math.min(quiz.questions.length - 1, currentQuestion + 1)
                  )
                }
                className="flex-1"
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
