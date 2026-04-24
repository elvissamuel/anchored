import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

/** Admin: end session immediately (LOBBY or LIVE). */
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
    const now = new Date();

    const g = await prisma.gameSession.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!g) {
      return NextResponse.json(
        errorResponse('Not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    if (g.status === 'FINISHED') {
      return NextResponse.json(
        errorResponse('Already finished'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    await prisma.gameSession.update({
      where: { id },
      data: {
        status: 'FINISHED',
        finishedAt: now,
        questionStartedAt: null,
      },
    });

    return NextResponse.json(successResponse({ id, status: 'FINISHED' }), {
      status: HTTP_STATUS.OK,
    });
  } catch (error) {
    console.error('[Game finish POST]', error);
    return NextResponse.json(
      errorResponse('Failed to finish session'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
