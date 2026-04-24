import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';
import { buildPlayState } from '@/lib/game-play-state';
import { getRouteId } from '@/lib/route-params';

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

    const id = await getRouteId(params);
    if (!id) {
      return NextResponse.json(
        errorResponse('Invalid session id'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const gameSession = await prisma.gameSession.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true, status: true },
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
      const ok = await prisma.gameSessionParticipant.findUnique({
        where: {
          sessionId_userId: { sessionId: id, userId: session.userId },
        },
      });
      if (!ok) {
        return NextResponse.json(
          errorResponse('Unauthorized'),
          { status: HTTP_STATUS.FORBIDDEN }
        );
      }
    }

    const viewerId = session.orgRole === 'ADMIN' ? null : session.userId;
    const state = await buildPlayState(prisma, id, viewerId);

    if (!state) {
      return NextResponse.json(
        errorResponse('Not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(successResponse(state), { status: HTTP_STATUS.OK });
  } catch (error) {
    console.error('[Game session state GET]', error);
    const hint =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : undefined;
    return NextResponse.json(
      errorResponse(hint || 'Failed to load state'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
