import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

async function assertAdminSession(
  sessionId: string,
  organizationId: string
) {
  const g = await prisma.gameSession.findFirst({
    where: { id: sessionId, organizationId },
  });
  return g;
}

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

    const { id } = await params;

    const gameSession = await prisma.gameSession.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            gameQuestion: {
              select: {
                id: true,
                prompt: true,
                difficulty: true,
                timeLimitSeconds: true,
              },
            },
          },
        },
      },
    });

    if (!gameSession) {
      return NextResponse.json(
        errorResponse('Not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    if (session.orgRole !== 'ADMIN') {
      if (gameSession.status === 'DRAFT') {
        return NextResponse.json(
          errorResponse('Not found'),
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }
      const isParticipant = gameSession.participants.some(
        (p) => p.userId === session.userId
      );
      if (!isParticipant) {
        return NextResponse.json(
          errorResponse('Unauthorized'),
          { status: HTTP_STATUS.FORBIDDEN }
        );
      }
    }

    return NextResponse.json(successResponse(gameSession), {
      status: HTTP_STATUS.OK,
    });
  } catch (error) {
    console.error('[Game session GET]', error);
    return NextResponse.json(
      errorResponse('Failed to load session'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(
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

    const { id } = await params;
    const existing = await assertAdminSession(id, session.organizationId);

    if (!existing || existing.status !== 'DRAFT') {
      return NextResponse.json(
        errorResponse('Only draft sessions can be edited'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const body = await request.json();
    const { title, participantUserIds, questionIds } = body;

    if (participantUserIds) {
      if (
        !Array.isArray(participantUserIds) ||
        participantUserIds.length === 0
      ) {
        return NextResponse.json(
          errorResponse('Select at least one participant'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
      const userCount = await prisma.user.count({
        where: {
          id: { in: participantUserIds },
          organizationId: session.organizationId,
        },
      });
      if (userCount !== participantUserIds.length) {
        return NextResponse.json(
          errorResponse('Invalid users'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
    }

    if (questionIds) {
      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return NextResponse.json(
          errorResponse('Select at least one question'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
      const qCount = await prisma.gameQuestion.count({
        where: {
          id: { in: questionIds },
          organizationId: session.organizationId,
        },
      });
      if (qCount !== questionIds.length) {
        return NextResponse.json(
          errorResponse('Invalid questions'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.gameSession.update({
        where: { id },
        data: {
          ...(typeof title === 'string' && title.trim()
            ? { title: title.trim() }
            : {}),
        },
      });

      if (participantUserIds) {
        await tx.gameSessionParticipant.deleteMany({ where: { sessionId: id } });
        await tx.gameSessionParticipant.createMany({
          data: [...new Set(participantUserIds as string[])].map((userId) => ({
            sessionId: id,
            userId,
          })),
        });
      }

      if (questionIds) {
        await tx.gameSessionQuestion.deleteMany({ where: { sessionId: id } });
        await tx.gameSessionQuestion.createMany({
          data: (questionIds as string[]).map((gameQuestionId, sortOrder) => ({
            sessionId: id,
            gameQuestionId,
            sortOrder,
          })),
        });
      }
    });

    const updated = await prisma.gameSession.findFirst({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: { gameQuestion: true },
        },
      },
    });

    return NextResponse.json(successResponse(updated, 'Updated'), {
      status: HTTP_STATUS.OK,
    });
  } catch (error) {
    console.error('[Game session PATCH]', error);
    return NextResponse.json(
      errorResponse('Failed to update session'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
