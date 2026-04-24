import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';
import {
  computeEngagementStreaks,
  toUtcDateString,
} from '@/lib/activity-streak';

const prisma = new PrismaClient();

// GET — user progress report (ADMIN for org members, or self)
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

    const { id: userId } = await params;

    if (session.orgRole !== 'ADMIN' && session.userId !== userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: session.organizationId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        orgRole: true,
        createdAt: true,
        taskCompletions: {
          where: {
            task: { organizationId: session.organizationId },
          },
          select: {
            taskId: true,
            completed: true,
            submittedAt: true,
            response: true,
            updatedAt: true,
            createdAt: true,
            task: {
              select: {
                title: true,
                points: true,
                type: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        quizAttempts: {
          where: {
            quiz: { organizationId: session.organizationId },
          },
          select: {
            id: true,
            quizId: true,
            score: true,
            passed: true,
            startedAt: true,
            submittedAt: true,
            quiz: {
              select: {
                title: true,
                passingScore: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const completions = user.taskCompletions;
    const attempts = user.quizAttempts;

    const tasksMarkedComplete = completions.filter((c) => c.completed).length;
    const tasksSubmitted = completions.filter(
      (c) =>
        c.submittedAt != null ||
        (typeof c.response === 'string' && c.response.trim().length > 0)
    ).length;
    const awaitingApproval = completions.filter(
      (c) => !c.completed && c.submittedAt != null
    ).length;
    const completionRecords = completions.length;

    const completionRate =
      completionRecords > 0
        ? Math.round((tasksMarkedComplete / completionRecords) * 100)
        : 0;

    const pointsEarned = completions
      .filter((c) => c.completed)
      .reduce((sum, c) => sum + (c.task?.points ?? 0), 0);

    const activityDays = new Set<string>();
    for (const c of completions) {
      const at =
        c.submittedAt ??
        (c.completed ? c.updatedAt : null);
      if (at) activityDays.add(toUtcDateString(new Date(at)));
    }
    for (const a of attempts) {
      if (a.submittedAt) {
        activityDays.add(toUtcDateString(new Date(a.submittedAt)));
      }
    }

    const streaks = computeEngagementStreaks(activityDays);

    const submittedAttempts = attempts.filter((a) => a.submittedAt != null);
    const attemptsTotal = attempts.length;
    const attemptsSubmitted = submittedAttempts.length;
    const attemptsPassed = submittedAttempts.filter((a) => a.passed).length;
    const quizPassRate =
      attemptsSubmitted > 0
        ? Math.round((attemptsPassed / attemptsSubmitted) * 100)
        : 0;
    const scores = submittedAttempts.map((a) => a.score);
    const averageQuizScore =
      scores.length > 0
        ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)
        : 0;
    const bestQuizScore =
      scores.length > 0 ? Math.round(Math.max(...scores)) : 0;
    const distinctQuizzesPassed = new Set(
      submittedAttempts.filter((a) => a.passed).map((a) => a.quizId)
    ).size;

    const lastActivityMs = [
      ...completions.map((c) => {
        const t = c.submittedAt ?? (c.completed ? c.updatedAt : null);
        return t ? new Date(t).getTime() : 0;
      }),
      ...attempts.map((a) =>
        a.submittedAt ? new Date(a.submittedAt).getTime() : 0
      ),
    ].reduce((a, b) => Math.max(a, b), 0);
    const lastActivityAt =
      lastActivityMs > 0 ? new Date(lastActivityMs).toISOString() : null;

    return NextResponse.json(
      successResponse({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          orgRole: user.orgRole,
          joinedAt: user.createdAt,
        },
        report: {
          tasks: {
            completionRecords,
            tasksSubmitted,
            tasksMarkedComplete,
            awaitingApproval,
            completionRate,
            pointsEarned,
          },
          engagement: {
            currentStreakDays: streaks.current,
            longestStreakDays: streaks.longest,
            lastActivityAt,
          },
          quizzes: {
            attemptsTotal,
            attemptsSubmitted,
            attemptsPassed,
            quizPassRate,
            averageQuizScore,
            bestQuizScore,
            distinctQuizzesPassed,
          },
        },
        recentActivity: {
          tasks: completions.slice(0, 10).map((c) => ({
            taskId: c.taskId,
            title: c.task.title,
            type: c.task.type,
            points: c.task.points,
            completed: c.completed,
            submittedAt: c.submittedAt,
            updatedAt: c.updatedAt,
          })),
          quizzes: attempts.slice(0, 10).map((a) => ({
            id: a.id,
            quizId: a.quizId,
            title: a.quiz.title,
            score: a.score,
            passed: a.passed,
            passingScore: a.quiz.passingScore,
            submittedAt: a.submittedAt,
            startedAt: a.startedAt,
          })),
        },
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[User Details Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch user'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
