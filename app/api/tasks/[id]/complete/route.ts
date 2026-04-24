import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

// POST - Mark task as complete
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;
    const userId = session?.userId;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json(
        errorResponse('Task not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Update or create completion record
    const completion = await prisma.taskCompletion.upsert({
      where: {
        userId_taskId: {
          userId,
          taskId: id,
        },
      },
      update: {
        completed: true,
        submittedAt: new Date(),
      },
      create: {
        userId,
        taskId: id,
        completed: true,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(
      successResponse(completion, 'Task marked as complete'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Task Complete Error]', error);
    return NextResponse.json(
      errorResponse('Failed to complete task'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Mark task as incomplete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;
    const userId = session?.userId;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Update completion record to incomplete
    await prisma.taskCompletion.updateMany({
      where: {
        userId,
        taskId: id,
      },
      data: {
        completed: false,
        submittedAt: null,
      },
    });

    return NextResponse.json(
      successResponse(null, 'Task marked as incomplete'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Task Incomplete Error]', error);
    return NextResponse.json(
      errorResponse('Failed to update task status'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
