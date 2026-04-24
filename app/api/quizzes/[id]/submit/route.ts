import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';

const prisma = new PrismaClient();

interface QuizAnswer {
  questionId: string;
  answer: string;
}

// POST - Submit quiz answers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const { answers } = body as { answers: QuizAnswer[] };

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        errorResponse('Answers are required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      return NextResponse.json(
        errorResponse('Quiz not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Calculate score
    let correctCount = 0;

    const quizAnswers = answers.map((answer) => {
      const question = quiz.questions.find((q) => q.id === answer.questionId);

      if (!question) {
        throw new Error(`Question ${answer.questionId} not found`);
      }

      // Check if answer is correct by comparing with options
      const options = question.options as any[];
      const isCorrect = options.some(
        (opt: any) => opt.text === answer.answer && opt.isCorrect
      );

      if (isCorrect) {
        correctCount++;
      }

      return {
        questionId: answer.questionId,
        answer: answer.answer,
        isCorrect,
      };
    });

    const score = (correctCount / quiz.questions.length) * 100;
    const passed = score >= quiz.passingScore;

    // Create quiz attempt with answers
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId: id,
        score,
        passed,
        submittedAt: new Date(),
        answers: {
          create: quizAnswers.map((qa) => ({
            questionId: qa.questionId,
            answer: qa.answer,
            isCorrect: qa.isCorrect,
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    return NextResponse.json(
      successResponse(
        {
          attempt,
          score: Math.round(score),
          passed,
          correctCount,
          totalQuestions: quiz.questions.length,
        },
        'Quiz submitted successfully'
      ),
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error('[Quiz Submit Error]', error);
    return NextResponse.json(
      errorResponse('Failed to submit quiz'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
