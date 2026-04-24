import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

// GET - Fetch user's notifications
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

    const userId = session.userId;
    const organizationId = session.organizationId;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const onlyAnnouncements = searchParams.get('announcements') === 'true';
    const onlyUnread = searchParams.get('unread') === 'true';

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        organizationId,
        ...(onlyAnnouncements ? { isAnnouncement: true } : {}),
        ...(onlyUnread ? { read: false } : {}),
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await prisma.notification.count({
      where: {
        userId,
        organizationId,
        ...(onlyAnnouncements ? { isAnnouncement: true } : {}),
        ...(onlyUnread ? { read: false } : {}),
      },
    });

    return NextResponse.json(
      successResponse({
        notifications,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Notifications GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch notifications'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
