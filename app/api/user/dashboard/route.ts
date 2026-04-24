import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { errorResponse, HTTP_STATUS, successResponse } from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.userId || !session.organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const userId = session.userId;
    const organizationId = session.organizationId;

    const memberGroupIds = (
      await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      })
    ).map((gm) => gm.groupId);

    const visibilityWhere: any = {
      organizationId,
      OR: [
        { groupId: null, assignedToUserId: null },
        { assignedToUserId: userId },
        ...(memberGroupIds.length > 0
          ? [{ groupId: { in: memberGroupIds }, assignedToUserId: null }]
          : []),
      ],
    };

    const [activeTasks, completedTasks] = await Promise.all([
      prisma.task.count({ where: visibilityWhere }),
      prisma.taskCompletion.count({
        where: {
          userId,
          completed: true,
          task: { organizationId },
        },
      }),
    ]);

    const pendingTasks = await prisma.task.count({
      where: {
        ...visibilityWhere,
        completions: {
          none: {
            userId,
            completed: true,
          },
        },
      },
    });

    const completed = await prisma.taskCompletion.findMany({
      where: {
        userId,
        completed: true,
        task: { organizationId },
      },
      select: {
        task: {
          select: {
            points: true,
          },
        },
      },
    });

    const points = completed.reduce((sum, c) => sum + (c.task?.points ?? 0), 0);

    const tasks = await prisma.task.findMany({
      where: {
        ...visibilityWhere,
        completions: {
          none: {
            userId,
            completed: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        type: true,
        points: true,
        completions: {
          where: { userId },
          select: {
            completed: true,
            submittedAt: true,
          },
        },
      },
    });

    const announcements = await prisma.notification.findMany({
      where: {
        userId,
        organizationId,
        isAnnouncement: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        createdAt: true,
        read: true,
      },
    });

    return NextResponse.json(
      successResponse({
        user: {
          fullName: `${session.firstName} ${session.lastName}`,
        },
        stats: {
          activeTasks,
          pendingTasks,
          completedTasks,
          points,
        },
        pendingTasks: tasks,
        announcements,
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[User Dashboard GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to load dashboard'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
