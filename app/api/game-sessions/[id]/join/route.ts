import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

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

    if (g.status === 'DRAFT') {
      return NextResponse.json(
        errorResponse('Session has not opened yet'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (g.status !== 'LOBBY' && g.status !== 'LIVE') {
      return NextResponse.json(
        errorResponse('Session is not open for joining'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const p = await prisma.gameSessionParticipant.updateMany({
      where: { sessionId: id, userId: session.userId },
      data: { joinedAt: new Date() },
    });

    if (p.count === 0) {
      return NextResponse.json(
        errorResponse('You are not invited to this game'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    return NextResponse.json(successResponse({ ok: true }), {
      status: HTTP_STATUS.OK,
    });
  } catch (error) {
    console.error('[Game join POST]', error);
    return NextResponse.json(
      errorResponse('Failed to join'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
