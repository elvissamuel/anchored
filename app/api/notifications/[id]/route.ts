import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';

const prisma = new PrismaClient();

// PATCH - Mark notification as read/unread
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const { read } = body;

    if (typeof read !== 'boolean') {
      return NextResponse.json(
        errorResponse('read field must be a boolean'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Check ownership
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return NextResponse.json(
        errorResponse('Notification not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read },
    });

    return NextResponse.json(
      successResponse(updated, 'Notification updated'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('[Notification PATCH Error]', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        errorResponse('Notification not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      errorResponse('Failed to update notification'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Check ownership
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return NextResponse.json(
        errorResponse('Notification not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json(
      successResponse(null, 'Notification deleted'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('[Notification DELETE Error]', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        errorResponse('Notification not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      errorResponse('Failed to delete notification'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
