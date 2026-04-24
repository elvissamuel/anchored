import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';

const prisma = new PrismaClient();

// GET - Fetch quizzes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const quizzes = await prisma.quiz.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        questions: true,
        _count: {
          select: { attempts: true },
        },
      },
    });

    const total = await prisma.quiz.count();

    return NextResponse.json(
      successResponse({
        quizzes,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Quizzes GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch quizzes'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new quiz (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const { title, description, dueDate, passingScore, questions } = body;

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json(
        errorResponse('Quiz title and questions are required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        passingScore: passingScore || 70,
        questions: {
          create: questions.map((q: any) => ({
            question: q.question,
            type: q.type || 'MULTIPLE_CHOICE',
            options: q.options, // Store as JSON
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json(
      successResponse(quiz, 'Quiz created successfully'),
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error('[Quizzes POST Error]', error);
    return NextResponse.json(
      errorResponse('Failed to create quiz'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
