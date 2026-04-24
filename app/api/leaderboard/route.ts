import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get('metric') || 'completion'; // completion or quiz-score
    const limit = parseInt(searchParams.get('limit') || '20');
    const scope = (searchParams.get('scope') || 'org').toLowerCase(); // org | group
    const groupId = searchParams.get('groupId');

    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.userId || !session.organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    if (scope === 'group' && (!groupId || typeof groupId !== 'string')) {
      return NextResponse.json(
        errorResponse('groupId is required for group leaderboard'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (scope === 'group' && groupId) {
      const isMember = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: session.userId,
          group: { organizationId: session.organizationId },
        },
        select: { id: true },
      });

      if (!isMember && session.orgRole !== 'ADMIN') {
        return NextResponse.json(
          errorResponse('Unauthorized'),
          { status: HTTP_STATUS.FORBIDDEN }
        );
      }
    }

    // Get all users with their stats
    const users = await prisma.user.findMany({
      where: {
        organizationId: session.organizationId,
        ...(scope === 'group' && groupId
          ? {
              groups: {
                some: {
                  groupId,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        taskCompletions: {
          select: {
            completed: true,
          },
        },
        quizAttempts: {
          select: {
            score: true,
            passed: true,
          },
        },
      },
    });

    // Calculate leaderboard based on metric
    const leaderboard = users.map((user) => {
      const totalTasks = user.taskCompletions.length;
      const completedTasks = user.taskCompletions.filter(
        (tc) => tc.completed
      ).length;
      const completionRate =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const totalAttempts = user.quizAttempts.length;
      const avgScore =
        totalAttempts > 0
          ? user.quizAttempts.reduce((sum, qa) => sum + qa.score, 0) /
            totalAttempts
          : 0;
      const passedQuizzes = user.quizAttempts.filter((qa) => qa.passed).length;

      return {
        userId: user.id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        stats: {
          completionRate: Math.round(completionRate),
          completedTasks,
          totalTasks,
          averageQuizScore: Math.round(avgScore),
          passedQuizzes,
          totalAttempts,
        },
        joinedAt: user.createdAt,
      };
    });

    // Sort based on metric
    let sortedLeaderboard = [...leaderboard];
    if (metric === 'quiz-score') {
      sortedLeaderboard.sort(
        (a, b) =>
          b.stats.averageQuizScore - a.stats.averageQuizScore ||
          b.stats.passedQuizzes - a.stats.passedQuizzes
      );
    } else {
      sortedLeaderboard.sort(
        (a, b) =>
          b.stats.completionRate - a.stats.completionRate ||
          b.stats.completedTasks - a.stats.completedTasks
      );
    }

    // Apply limit and add rank
    const topUsers = sortedLeaderboard.slice(0, limit).map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    return NextResponse.json(
      successResponse({
        leaderboard: topUsers,
        metric,
        scope,
        groupId: scope === 'group' ? groupId : null,
        total: leaderboard.length,
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Leaderboard GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch leaderboard'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET user's rank
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        taskCompletions: {
          select: {
            completed: true,
          },
        },
        quizAttempts: {
          select: {
            score: true,
            passed: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const totalTasks = user.taskCompletions.length;
    const completedTasks = user.taskCompletions.filter(
      (tc) => tc.completed
    ).length;
    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const totalAttempts = user.quizAttempts.length;
    const avgScore =
      totalAttempts > 0
        ? user.quizAttempts.reduce((sum, qa) => sum + qa.score, 0) /
          totalAttempts
        : 0;

    return NextResponse.json(
      successResponse({
        fullName: `${user.firstName} ${user.lastName}`,
        stats: {
          completionRate: Math.round(completionRate),
          completedTasks,
          totalTasks,
          averageQuizScore: Math.round(avgScore),
        },
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[User Rank Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch user ranking'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
