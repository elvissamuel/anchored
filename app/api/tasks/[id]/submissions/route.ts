import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { errorResponse, HTTP_STATUS, successResponse } from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

export async function GET(
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

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: session.organizationId,
      },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json(
        errorResponse('Task not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const includeUser = {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      },
    } as const;

    const [submissions, awaitingRevision] = await Promise.all([
      prisma.taskCompletion.findMany({
        where: {
          taskId,
          completed: false,
          submittedAt: { not: null },
        },
        orderBy: { submittedAt: 'desc' },
        include: includeUser,
      }),
      prisma.taskCompletion.findMany({
        where: {
          taskId,
          completed: false,
          submittedAt: null,
          revisionRequestedAt: { not: null },
        },
        orderBy: { revisionRequestedAt: 'desc' },
        include: includeUser,
      }),
    ]);

    return NextResponse.json(
      successResponse({ submissions, awaitingRevision }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Task Submissions GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch submissions'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
