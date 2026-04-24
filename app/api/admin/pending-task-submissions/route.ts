import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  errorResponse,
  HTTP_STATUS,
  successResponse,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

const pendingWhere = (organizationId: string) => ({
  completed: false,
  submittedAt: { not: null },
  task: { organizationId },
});

/**
 * Pending = member submitted a response but admin has not approved (completed).
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const where = pendingWhere(session.organizationId);

    const [count, recent] = await Promise.all([
      prisma.taskCompletion.count({ where }),
      prisma.taskCompletion.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          taskId: true,
          submittedAt: true,
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
          task: { select: { title: true } },
        },
      }),
    ]);

    return NextResponse.json(
      successResponse({
        count,
        recent: recent.map((r) => ({
          completionId: r.id,
          taskId: r.taskId,
          taskTitle: r.task.title,
          submittedAt: r.submittedAt?.toISOString() ?? null,
          memberName: `${r.user.firstName} ${r.user.lastName}`.trim(),
          memberEmail: r.user.email,
        })),
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Pending task submissions GET]', error);
    return NextResponse.json(
      errorResponse('Failed to load pending submissions'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
