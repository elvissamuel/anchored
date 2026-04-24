import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { errorResponse, HTTP_STATUS, successResponse } from '@/lib/api-response';
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

    if (session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Forbidden'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const role = body?.role === 'LEADER' ? 'LEADER' : 'MEMBER';

    if (!userId) {
      return NextResponse.json(
        errorResponse('userId is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const group = await prisma.group.findFirst({
      where: { id: groupId, organizationId: session.organizationId },
      select: { id: true },
    });

    if (!group) {
      return NextResponse.json(
        errorResponse('Group not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: session.organizationId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const member = await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      update: {
        role,
      },
      create: {
        groupId,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            orgRole: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(
      successResponse(member, 'Member added'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Group Member POST Error]', error);
    return NextResponse.json(
      errorResponse('Failed to add member'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
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

    if (session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Forbidden'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id: groupId } = await params;
    const body = await request.json().catch(() => ({}));
    const userId = typeof body?.userId === 'string' ? body.userId : '';

    if (!userId) {
      return NextResponse.json(
        errorResponse('userId is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return NextResponse.json(
      successResponse(null, 'Member removed'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('[Group Member DELETE Error]', error);

    if (error?.code === 'P2025') {
      return NextResponse.json(
        errorResponse('Member not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      errorResponse('Failed to remove member'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
