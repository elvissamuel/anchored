import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';
import { forceAdvanceGameSession } from '@/lib/game-session-advance';

const prisma = new PrismaClient();

/** Admin: end current question early and go to the next (or finish). */
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

    const { id } = await params;

    const g = await prisma.gameSession.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!g) {
      return NextResponse.json(
        errorResponse('Not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    if (g.status !== 'LIVE') {
      return NextResponse.json(
        errorResponse('Game is not live'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    await forceAdvanceGameSession(prisma, id);

    return NextResponse.json(successResponse({ ok: true }), {
      status: HTTP_STATUS.OK,
    });
  } catch (error) {
    console.error('[Game advance POST]', error);
    return NextResponse.json(
      errorResponse('Failed to advance'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
