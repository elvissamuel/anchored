import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { errorResponse, HTTP_STATUS, successResponse } from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const responseText = typeof body?.response === 'string' ? body.response.trim() : '';

    if (!responseText) {
      return NextResponse.json(
        errorResponse('Response is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json(
        errorResponse('Task not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const completion = await prisma.taskCompletion.upsert({
      where: {
        userId_taskId: {
          userId,
          taskId,
        },
      },
      update: {
        response: responseText,
        submittedAt: new Date(),
        completed: false,
        revisionRequestedAt: null,
      },
      create: {
        userId,
        taskId,
        response: responseText,
        submittedAt: new Date(),
        completed: false,
      },
    });

    return NextResponse.json(
      successResponse(completion, 'Response submitted'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Task Response Error]', error);
    return NextResponse.json(
      errorResponse('Failed to submit response'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
