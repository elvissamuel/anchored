import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

// GET - Fetch single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;
    const organizationId = session?.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        completions:
          session?.orgRole === 'MEMBER' && session.userId
            ? {
                where: {
                  userId: session.userId,
                },
              }
            : true,
      },
    });

    if (!task) {
      return NextResponse.json(
        errorResponse('Task not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    if ((task as any).organizationId && (task as any).organizationId !== organizationId) {
      return NextResponse.json(
        errorResponse('Task not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    if (session?.orgRole === 'MEMBER' && session.userId) {
      const assignedToUserId = (task as any).assignedToUserId as string | null | undefined;
      const groupId = (task as any).groupId as string | null | undefined;
      const isOrgWide = !assignedToUserId && !groupId;

      if (assignedToUserId && assignedToUserId !== session.userId) {
        return NextResponse.json(
          errorResponse('Task not found'),
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      if (groupId) {
        const member = await prisma.groupMember.findFirst({
          where: {
            groupId,
            userId: session.userId,
          },
          select: { id: true },
        });

        if (!member) {
          return NextResponse.json(
            errorResponse('Task not found'),
            { status: HTTP_STATUS.NOT_FOUND }
          );
        }
      }

      if (!isOrgWide && !groupId && !assignedToUserId) {
        return NextResponse.json(
          errorResponse('Task not found'),
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }
    }

    return NextResponse.json(
      successResponse(task),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Task GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch task'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH - Update task (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, content, resourceUrl, dueDate } = body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(resourceUrl !== undefined && {
          resourceUrl:
            typeof resourceUrl === 'string' && resourceUrl.trim()
              ? resourceUrl.trim()
              : null,
        }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
      },
    });

    return NextResponse.json(
      successResponse(task, 'Task updated successfully'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('[Task PATCH Error]', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        errorResponse('Task not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      errorResponse('Failed to update task'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete task (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id } = await params;

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json(
      successResponse(null, 'Task deleted successfully'),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('[Task DELETE Error]', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        errorResponse('Task not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      errorResponse('Failed to delete task'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
