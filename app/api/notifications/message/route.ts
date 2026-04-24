import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

// POST - Send direct message to user (ADMIN only)
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
    const { userId, title, message } = body;

    if (!userId || !title || !message) {
      return NextResponse.json(
        errorResponse('userId, title, and message are required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId, organizationId: session.organizationId },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        organizationId: session.organizationId,
        title,
        message,
        type: 'MESSAGE',
        isAnnouncement: false,
      },
    });

    return NextResponse.json(
      successResponse(notification, 'Message sent successfully'),
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error('[Send Message Error]', error);
    return NextResponse.json(
      errorResponse('Failed to send message'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
