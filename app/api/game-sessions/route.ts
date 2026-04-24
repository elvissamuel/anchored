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
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const where =
      session.orgRole === 'ADMIN'
        ? { organizationId: session.organizationId }
        : {
            organizationId: session.organizationId,
            participants: { some: { userId: session.userId } },
            status: { not: 'DRAFT' },
          };

    const sessions = await prisma.gameSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { participants: true, questions: true } },
      },
    });

    return NextResponse.json(successResponse({ sessions }), {
      status: HTTP_STATUS.OK,
    });
  } catch (error) {
    console.error('[Game sessions GET]', error);
    return NextResponse.json(
      errorResponse('Failed to load sessions'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const { title, participantUserIds, questionIds } = body;

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        errorResponse('Title is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (
      !Array.isArray(participantUserIds) ||
      participantUserIds.length === 0
    ) {
      return NextResponse.json(
        errorResponse('Select at least one participant'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        errorResponse('Select at least one question'),
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
        errorResponse('One or more users are not in your organization'),
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
        errorResponse('One or more questions are invalid'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const gameSession = await prisma.gameSession.create({
      data: {
        organizationId: session.organizationId,
        createdById: session.userId,
        title: title.trim(),
        participants: {
          create: [...new Set(participantUserIds as string[])].map((userId) => ({
            userId,
          })),
        },
        questions: {
          create: (questionIds as string[]).map((gameQuestionId, sortOrder) => ({
            gameQuestionId,
            sortOrder,
          })),
        },
      },
      include: {
        _count: { select: { participants: true, questions: true } },
      },
    });

    return NextResponse.json(successResponse(gameSession, 'Session created'), {
      status: HTTP_STATUS.CREATED,
    });
  } catch (error) {
    console.error('[Game sessions POST]', error);
    return NextResponse.json(
      errorResponse('Failed to create session'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
