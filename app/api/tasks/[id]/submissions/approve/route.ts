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

    if (!session?.organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    if (session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Forbidden'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const reviewNote =
      typeof body?.reviewNote === 'string' ? body.reviewNote.trim() : '';

    if (!userId) {
      return NextResponse.json(
        errorResponse('userId is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json(
        errorResponse('Task not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const existing = await prisma.taskCompletion.findUnique({
      where: {
        userId_taskId: { userId, taskId },
      },
    });

    if (!existing || !existing.submittedAt) {
      return NextResponse.json(
        errorResponse('No submitted response to approve'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (existing.completed) {
      return NextResponse.json(
        errorResponse('Already completed'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const completion = await prisma.taskCompletion.update({
      where: {
        userId_taskId: {
          userId,
          taskId,
        },
      },
      data: {
        completed: true,
        revisionRequestedAt: null,
        ...(reviewNote ? { adminFeedback: reviewNote } : {}),
      },
    });

    return NextResponse.json(
      successResponse(completion, 'Submission approved'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('[Task Submission Approve Error]', error);

    if (error?.code === 'P2025') {
      return NextResponse.json(
        errorResponse('Submission not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      errorResponse('Failed to approve submission'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
