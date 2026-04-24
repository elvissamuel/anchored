import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { errorResponse, HTTP_STATUS, successResponse } from '@/lib/api-response';
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

    if (session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Forbidden'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const groups = await prisma.group.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return NextResponse.json(successResponse({ groups }), { status: HTTP_STATUS.OK });
  } catch (error) {
    console.error('[Groups GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch groups'),
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

    if (!session?.organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    if (session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Forbidden'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json(
        errorResponse('Group name is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const group = await prisma.group.create({
      data: {
        name,
        organizationId: session.organizationId,
      },
    });

    return NextResponse.json(
      successResponse(group, 'Group created'),
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error('[Groups POST Error]', error);

    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        errorResponse('Group already exists'),
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    return NextResponse.json(
      errorResponse('Failed to create group'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
