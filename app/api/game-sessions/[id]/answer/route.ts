import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';
import { scoreTimedAnswer } from '@/lib/game-scoring';

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

    const { id: sessionId } = await params;
    const body = await request.json();
    const { optionId } = body;

    if (typeof optionId !== 'string') {
      return NextResponse.json(
        errorResponse('optionId required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const gameSession = await prisma.gameSession.findFirst({
      where: { id: sessionId, organizationId: session.organizationId },
      include: {
        questions: { orderBy: { sortOrder: 'asc' }, include: { gameQuestion: true } },
        participants: true,
      },
    });

    if (!gameSession || gameSession.status !== 'LIVE' || !gameSession.questionStartedAt) {
      return NextResponse.json(
        errorResponse('No active question right now'),
        { status: HTTP_STATUS.BAD_REQUEST }
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

    const idx = gameSession.currentQuestionIndex;
    const sq = gameSession.questions[idx];
    if (!sq) {
      return NextResponse.json(
        errorResponse('Invalid question state'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const gq = sq.gameQuestion;
    const endsAt = new Date(
      gameSession.questionStartedAt.getTime() + gq.timeLimitSeconds * 1000
    );
    const answeredAt = new Date();
    if (answeredAt.getTime() > endsAt.getTime()) {
      return NextResponse.json(
        errorResponse('Time is up for this question'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const option = await prisma.gameBankOption.findFirst({
      where: { id: optionId, gameQuestionId: gq.id },
    });

    if (!option) {
      return NextResponse.json(
        errorResponse('Invalid option'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const existing = await prisma.gameSessionAnswer.findUnique({
      where: {
        sessionId_userId_gameQuestionId: {
          sessionId,
          userId: session.userId,
          gameQuestionId: gq.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        errorResponse('Already answered this question'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { pointsAwarded, reactionTimeMs } = scoreTimedAnswer(
      gameSession.questionStartedAt,
      answeredAt,
      gq.timeLimitSeconds,
      option.isCorrect
    );

    await prisma.$transaction([
      prisma.gameSessionAnswer.create({
        data: {
          sessionId,
          userId: session.userId,
          gameQuestionId: gq.id,
          optionId: option.id,
          answeredAt,
          reactionTimeMs,
          isCorrect: option.isCorrect,
          pointsAwarded,
        },
      }),
      prisma.gameSessionParticipant.update({
        where: {
          sessionId_userId: { sessionId, userId: session.userId },
        },
        data: { totalScore: { increment: pointsAwarded } },
      }),
    ]);

    return NextResponse.json(
      successResponse({
        isCorrect: option.isCorrect,
        pointsAwarded,
        reactionTimeMs,
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Game answer POST]', error);
    return NextResponse.json(
      errorResponse('Failed to submit answer'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
