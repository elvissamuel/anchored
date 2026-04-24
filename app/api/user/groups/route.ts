import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { errorResponse, HTTP_STATUS, successResponse } from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.userId || !session.organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: session.userId,
        group: { organizationId: session.organizationId },
      },
      select: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        group: { name: 'asc' },
      },
    });

    const groups = memberships.map((m) => m.group);

    return NextResponse.json(
      successResponse({ groups }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[User Groups GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch groups'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
