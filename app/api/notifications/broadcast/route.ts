import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

// POST - Broadcast announcement to all users (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.userId || !session.organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    if (session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const { title, message } = body;

    if (!title || !message) {
      return NextResponse.json(
        errorResponse('title and message are required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get all org users
    const users = await prisma.user.findMany({
      where: { organizationId: session.organizationId },
      select: { id: true },
    });

    if (users.length === 0) {
      return NextResponse.json(
        successResponse(
          { createdCount: 0 },
          'No users to send announcement to'
        ),
        { status: HTTP_STATUS.OK }
      );
    }

    // Create notifications for all users
    const notifications = await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        organizationId: session.organizationId,
        title,
        message,
        type: 'ANNOUNCEMENT',
        isAnnouncement: true,
      })),
    });

    return NextResponse.json(
      successResponse(
        {
          createdCount: notifications.count,
          totalUsers: users.length,
        },
        'Announcement sent successfully'
      ),
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error('[Broadcast Error]', error);
    return NextResponse.json(
      errorResponse('Failed to broadcast announcement'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
