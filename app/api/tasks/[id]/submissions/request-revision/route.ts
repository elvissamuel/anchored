import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { errorResponse, HTTP_STATUS, successResponse } from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

/** Ask member to revise: keeps their draft response, stores feedback, removes from pending queue. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const feedback =
      typeof body?.feedback === 'string' ? body.feedback.trim() : '';

    if (!userId) {
      return NextResponse.json(
        errorResponse('userId is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!feedback) {
      return NextResponse.json(
        errorResponse('Feedback is required so the member knows what to change'),
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

    if (!existing || existing.completed) {
      return NextResponse.json(
        errorResponse('No open submission to send back'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!existing.submittedAt) {
      return NextResponse.json(
        errorResponse('Member has not submitted yet'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const updated = await prisma.taskCompletion.update({
      where: {
        userId_taskId: { userId, taskId },
      },
      data: {
        adminFeedback: feedback,
        revisionRequestedAt: new Date(),
        submittedAt: null,
        completed: false,
      },
    });

    return NextResponse.json(
      successResponse(updated, 'Revision requested'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Task request-revision Error]', error);
    return NextResponse.json(
      errorResponse('Failed to request revision'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
