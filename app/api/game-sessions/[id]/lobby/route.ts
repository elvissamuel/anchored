import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

/** DRAFT → LOBBY (players can join the room) */
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
      include: { _count: { select: { participants: true, questions: true } } },
    });

    if (!g) {
      return NextResponse.json(
        errorResponse('Not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    if (g.status !== 'DRAFT') {
      return NextResponse.json(
        errorResponse('Session is not in draft status'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (g._count.participants < 1 || g._count.questions < 1) {
      return NextResponse.json(
        errorResponse('Add participants and questions first'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    await prisma.gameSession.update({
      where: { id },
      data: { status: 'LOBBY' },
    });

    return NextResponse.json(
      successResponse({ id, status: 'LOBBY' }, 'Lobby opened'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Game lobby POST]', error);
    return NextResponse.json(
      errorResponse('Failed to open lobby'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
