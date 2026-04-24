import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';

const prisma = new PrismaClient();

// GET - Fetch single quiz with questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    return NextResponse.json(
      successResponse(quiz),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Quiz GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch quiz'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH - Update quiz (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, dueDate, passingScore } = body;

    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(passingScore && { passingScore }),
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json(
      successResponse(quiz, 'Quiz updated successfully'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('[Quiz PATCH Error]', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        errorResponse('Quiz not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      errorResponse('Failed to update quiz'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete quiz (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id } = await params;

    await prisma.quiz.delete({
      where: { id },
    });

    return NextResponse.json(
      successResponse(null, 'Quiz deleted successfully'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('[Quiz DELETE Error]', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        errorResponse('Quiz not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      errorResponse('Failed to delete quiz'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
