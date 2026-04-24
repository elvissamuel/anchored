import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';
import { getRouteId } from '@/lib/route-params';

const prisma = new PrismaClient();

/** LOBBY → LIVE (first question starts immediately) */
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

    const id = await getRouteId(params);
    if (!id) {
      return NextResponse.json(
        errorResponse('Invalid session id'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const now = new Date();

    const g = await prisma.gameSession.findFirst({
      where: { id, organizationId: session.organizationId },
      include: { _count: { select: { participants: true, questions: true } } },
    });

    if (!g) {
      return NextResponse.json(
        errorResponse('Not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    if (g.status !== 'LOBBY') {
      return NextResponse.json(
        errorResponse('Open the lobby first; session must be in LOBBY to start'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (g._count.participants < 1 || g._count.questions < 1) {
      return NextResponse.json(
        errorResponse('Session needs participants and questions'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    await prisma.gameSession.update({
      where: { id },
      data: {
        status: 'LIVE',
        currentQuestionIndex: 0,
        questionStartedAt: now,
      },
    });

    return NextResponse.json(
      successResponse({ id, status: 'LIVE' }, 'Game started'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Game start POST]', error);
    const hint =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : undefined;
    return NextResponse.json(
      errorResponse(
        hint ? `Failed to start game: ${hint}` : 'Failed to start game'
      ),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
